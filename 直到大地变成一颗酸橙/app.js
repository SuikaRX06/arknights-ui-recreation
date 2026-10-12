import {NativeScene} from './native-scene.js';
import {RoadRenderer} from './road-renderer.js';
import {MaterialEffects} from './material-effects.js';
import {drawParticles} from './particles.js';
import {loadChapterTabs} from './chapter-tabs.js';
import {sceneTransition} from './scene-transition.js';
import {TrailRenderer} from './trail-renderer.js';
import {MapDrag,settlePan} from './map-drag.js';
import {createMotionProfile} from './motion-profile.js';
const mapDrag=new MapDrag(),profile=createMotionProfile(new URLSearchParams(location.search).get('profile')==='1');
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const state={time:0,speed:1,paused:false,ready:false,scene:'home',sceneEnteredAt:0,variant:0,swap:null,switchStarted:null,transition:null,pan:0,target:0,drag:null};
const cv=$('#scene'),ctx=cv.getContext('2d',{alpha:false});let native,last=0,raf=0;
const W=1280,H=720,routeName={normal:'驶向大地尽头',ex:'踏上归家长途',s:'眺望待行之路'};
function panLimit(){return native?.scenes[state.scene]?.root.mapSettings?.drag?Math.max(0,native.scenes[state.scene].root.mapSettings.width-W):0;}
let entryClip='act53side_entry_kv1',duration=5.166667;
function resize(){const r=$('#viewport').getBoundingClientRect(),w=Math.min(r.width,r.height*16/9);$('#stage').style.width=w+'px';$('#stage').style.height=w*9/16+'px';const pixels=Math.max(16,Math.min(1920,Math.round(w*(window.devicePixelRatio||1))));if(cv.width!==pixels){cv.width=pixels;cv.height=Math.round(pixels*9/16);if(native)request();}}new ResizeObserver(resize).observe($('#viewport'));
function request(){if(!raf)raf=requestAnimationFrame(frame);}
function pause(){state.paused=!state.paused;$('#pause').textContent=state.paused?'▶ 继续':'Ⅱ 暂停';$('#pause').setAttribute('aria-pressed',String(state.paused));last=0;request();}
function replay(){mapDrag.cancel();native.buttonFeedback=null;native.switchPressed=false;entryClip='act53side_entry_kv1';duration=native.data.clips[entryClip].duration;$('#timeline').max=Math.ceil(duration*100)/100;$('#duration').textContent=duration.toFixed(2)+'s';Object.assign(state,{time:0,scene:'home',sceneEnteredAt:0,variant:0,swap:null,switchStarted:null,transition:null,pan:0,target:0,drag:null});last=0;request();}
function switchArt(){const settings=native?.scenes.home.paths.get('panel_ui/btn_switch').switchSettings;if(!state.ready||state.time<duration||state.swap||state.transition||state.scene!=='home'||(state.switchStarted!==null&&state.time-state.switchStarted<(settings?.cooldown||0)))return;state.switchStarted=state.time;state.swap={start:state.time,to:1-state.variant,clip:state.variant?'act53side_trans_kv2tokv1':'act53side_trans_kv1tokv2'};request();}
function navigate(to){if(!state.ready||state.time<duration||state.swap||state.transition||to===state.scene)return;mapDrag.cancel();state.drag=null;state.transition={start:state.time,to,changed:false,chapterSwitch:state.scene!=='home'&&to!=='home'};request();}
function frame(now){raf=0;const interval=last?now-last:0,dt=interval/1000;last=now;if(!state.paused){state.time+=dt*state.speed;state.pan=settlePan(state.pan,state.target,dt);}const started=profile?performance.now():0;render();if(profile&&!state.paused&&!document.hidden)profile.record(state.scene,interval,performance.now()-started);if(!state.paused&&!document.hidden)request();}
function render(){if(!native)return;
 const {time}=state;let fade=0,zoom=1;
 if(state.transition){const tr=state.transition,motion=sceneTransition(time-tr.start,tr.chapterSwitch);({fade,zoom}=motion);if(motion.changed&&!tr.changed){state.scene=tr.to;state.sceneEnteredAt=tr.start+.4;state.pan=state.target=0;tr.changed=true;}if(motion.done)state.transition=null;}
 if(state.swap&&time-state.swap.start>=native.data.clips[state.swap.clip].duration){state.variant=state.swap.to;state.swap=null;}
 const home=state.scene==='home';ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#f8faf7';ctx.fillRect(0,0,cv.width,cv.height);ctx.scale(cv.width/W,cv.height/H);ctx.translate(W/2,H/2);ctx.scale(zoom,zoom);ctx.translate(-W/2,-H/2);
 if(home){native.swapTime=state.swap?time-state.swap.start:0;native.switchAge=state.switchStarted===null?-1:time-state.switchStarted;native.reset('home');native.apply('home',entryClip,Math.min(time,duration));if(time>=duration)native.apply('home',state.variant?'act53side_trans_kv1tokv2':'act53side_trans_kv2tokv1',10);native.loops('home',Math.max(0,time-duration));if(state.swap)native.apply('home',state.swap.clip,time-state.swap.start);native.draw(ctx,'home',W,H,time);}
 else {native.exParticleTime=Math.max(0,time-state.sceneEnteredAt);native.reset(state.scene);native.loops(state.scene,time);if(state.scene==='normal')native.apply('normal','act53side_map_zone1_anim',state.pan/Math.max(1,panLimit())*5.866667,'image_background_bind/root_anim');native.draw(ctx,state.scene,W,H,time,state.pan);}
 $('#blackout').style.opacity=fade;$('#game-nav').hidden=home;$('#map-tabs').hidden=home;$('#map-tabs').style.transform=`scale(${zoom})`;$('#map-tabs').inert=!!state.transition;$('#home-controls').hidden=!home||time<duration||!!state.swap||!!state.transition;
 for(const b of $$('[data-hit]')){const hit=native.hits.find(h=>h.name===b.dataset.hit);b.hidden=!hit;if(hit){Object.assign(b.style,{left:hit.x/cv.width*100+'%',top:hit.y/cv.height*100+'%',width:hit.w/cv.width*100+'%',height:hit.h/cv.height*100+'%'});}}
 $$('[data-route]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.route===state.scene)));
 $('#timeline').value=Math.min(time,duration);$('#time-label').textContent=Math.min(time,duration).toFixed(2)+'s';$('#scene-label').textContent=home?(state.swap?'插画切换':time<duration?'主界面入场':state.variant?'天空主页':'街景主页'):routeName[state.scene];
}
$('#replay').onclick=()=>state.ready&&replay();$('#pause').onclick=pause;$('#variant').onclick=switchArt;$('#speed').onchange=e=>{state.speed=+e.target.value;request();};
$('#timeline').oninput=e=>{state.time=+e.target.value;state.scene='home';state.swap=state.transition=null;state.switchStarted=null;native.buttonFeedback=null;mapDrag.cancel();state.drag=null;request();};
$$('[data-hit]').forEach(b=>b.onclick=()=>b.dataset.hit==='btn_switch'?switchArt():navigate({btn_zone:'normal',btn_ex:'ex',btn_s:'s'}[b.dataset.hit]));
$$('[data-route]').forEach(b=>b.onclick=()=>navigate(b.dataset.route));$('#back').onclick=$('#home-button').onclick=()=>navigate('home');

const switchButton=$('[data-hit="btn_switch"]');
for(const [event,pressed,hovered] of [['pointerdown',true,true],['pointerup',false,true],['pointerenter',false,true],['pointerleave',false,false],['pointercancel',false,false]])
 switchButton.addEventListener(event,()=>{if(native){native.switchPressed=pressed;native.switchHovered=hovered;request();}});
$('#fullscreen').onclick=async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await $('#viewport').requestFullscreen();resize();};
$('#notes-toggle').onclick=()=>{$('#notes').hidden=!$('#notes').hidden;};$('#notes-close').onclick=()=>{$('#notes').hidden=true;};
function pointerX(e){return e.clientX*W/cv.getBoundingClientRect().width;}
cv.onpointerdown=e=>{if(e.button!==0||state.drag||!panLimit()||state.transition)return;state.target=state.pan;state.drag={id:e.pointerId};mapDrag.start(e.pointerId,pointerX(e),state.pan);cv.setPointerCapture(e.pointerId);};
cv.onpointermove=e=>{if(state.transition)return;const next=mapDrag.move(e.pointerId,pointerX(e),panLimit());if(next===null)return;state.target=next;if(state.paused)state.pan=next;request();};
function endDrag(e){mapDrag.end(e.pointerId);if(state.drag?.id===e.pointerId)state.drag=null;}
cv.onpointerup=cv.onpointercancel=cv.onlostpointercapture=endDrag;
cv.onwheel=e=>{if(!panLimit()||state.transition)return;e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?W:W/cv.getBoundingClientRect().width;state.target=clamp(state.target+(e.deltaX+e.deltaY)*unit,0,panLimit());if(state.paused)state.pan=state.target;request();};
window.onkeydown=e=>{if(['INPUT','SELECT'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();pause();}if(e.code==='KeyR'&&state.ready)replay();if(e.code==='KeyB')switchArt();if(e.code==='Escape')navigate('home');if(e.code==='KeyH'){document.body.classList.toggle('hide-tools');resize();}};
document.addEventListener('visibilitychange',()=>{last=0;mapDrag.cancel();state.drag=null;if(native)native.switchPressed=false;if(!document.hidden)request();});
async function load(){try{const data=await fetch('assets/native/scene.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();});const images={};let count=0;await Promise.all(Object.entries(data.images).map(async([id,r])=>{const img=new Image();img.src=r.url;await img.decode();images[id]=img;if(++count%20===0)$('#loading').textContent=`正在载入原版图层 ${count}/${Object.keys(data.images).length}`;}));native=new NativeScene(data,images);native.drawParticles=drawParticles;native.trails=new TrailRenderer(images);native.effects=new MaterialEffects(images);await document.fonts.load('500 19px "Activity Sans"');const mesh=await fetch('assets/native/road-mesh.json').then(r=>r.json());native.meshRenderer=new RoadRenderer(mesh,images[Object.values(data.materials).find(m=>m.name==='m_road').textures._BaseTex.image]);await loadChapterTabs($('#map-tabs'));await native.effects.prepare(native.scenes.normal.nodes.filter(n=>!native.omitted(n,'normal')),data.materials);state.ready=true;
const params=new URLSearchParams(location.search);
if(['normal','ex','s'].includes(params.get('scene')))state.scene=params.get('scene');
if(params.get('variant')==='1')state.variant=1;
if(params.has('swap')){state.switchStarted=6;state.swap={start:6,to:1-state.variant,clip:state.variant?'act53side_trans_kv2tokv1':'act53side_trans_kv1tokv2'};}
if(params.has('pan'))state.pan=state.target=clamp(Number(params.get('pan')),0,panLimit());
if(params.has('frame')){state.time=params.has('swap')?6+Number(params.get('swap')):Number(params.get('frame')); state.paused=true;$('#pause').textContent='▶ 继续';$('#pause').setAttribute('aria-pressed','true');}
$('#loading').hidden=true;request();window.motionStudy={state,native,render,seek(t){state.time=t;render();},navigate,switchArt};}catch(e){$('#loading').textContent='素材载入失败，请刷新重试：'+e.message;console.error(e);}}
load();



