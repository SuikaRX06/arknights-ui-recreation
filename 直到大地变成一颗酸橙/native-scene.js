import {animSheetFrame} from './shader-math.js';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const component=(v,k)=>typeof v==='object'&&v!==null?v[k]:v;
function copyValue(value,target){
  if(value===null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map((v,i)=>copyValue(v,target?.[i]));
  if(!target||typeof target!=='object'||Array.isArray(target))target={};
  for(const key of Object.keys(target))if(!(key in value))delete target[key];
  for(const key of Object.keys(value))target[key]=copyValue(value[key],target[key]);
  return target;
}

// Unity keyframe tangents are derivatives per second. Weighted tangents use
// Bezier time handles; solve the time coordinate before evaluating the value.
export function sample(keys,time,step=false){
  if(time<=keys[0].time)return keys[0].value;
  const last=keys.at(-1);if(time>=last.time)return last.value;
  let lo=0,hi=keys.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(keys[m].time<=time)lo=m;else hi=m;}
  const a=keys[lo],b=keys[hi],dt=b.time-a.time,u=(time-a.time)/dt;
  if(step)return a.value;
  function scalar(k){
    const av=component(a.value,k),bv=component(b.value,k),at=component(a.outSlope,k),bt=component(b.inSlope,k);
    if(at===null||bt===null)return av;
    const weighted=(a.weightedMode&2)||(b.weightedMode&1);
    if(weighted){
      const w0=(a.weightedMode&2)?component(a.outWeight,k):1/3,w1=(b.weightedMode&1)?component(b.inWeight,k):1/3;
      const bez=(t,p,q,r,s)=>{const v=1-t;return v*v*v*p+3*v*v*t*q+3*v*t*t*r+t*t*t*s;};
      let low=0,high=1;for(let i=0;i<20;i++){const mid=(low+high)/2;if(bez(mid,0,w0,1-w1,1)<u)low=mid;else high=mid;}
      return bez((low+high)/2,av,av+(at||0)*dt*w0,bv-(bt||0)*dt*w1,bv);
    }
    return (2*u*u*u-3*u*u+1)*av+(u*u*u-2*u*u+u)*dt*(at||0)+(-2*u*u*u+3*u*u)*bv+(u*u*u-u*u)*dt*(bt||0);
  }
  return typeof a.value==='object'?Object.fromEntries(Object.keys(a.value).map(k=>[k,scalar(k)])):scalar();
}

export class NativeScene{
  constructor(data,images){
    this.data=data;this.images=images;this.scenes={};this.tints=new Map();this.hits=[];this.time=0;
    for(const [name,root]of Object.entries(data.scenes)){
      const paths=new Map(),nodes=[];
      const visit=(node,path)=>{node.path=path;node.p=structuredClone(node.props);paths.set(path,node);nodes.push(node);node.children.forEach(c=>visit(c,path?path+'/'+c.name:c.name));};visit(root,'');
      this.scenes[name]={root,paths,nodes,dirty:new Map(),linePoints:new Map(nodes.filter(n=>n.stageId).map(n=>[n.stageId,n.props.m_AnchoredPosition]))};
    }
    this.bound=new Map();
  }
  reset(name){
    for(const [n,keys]of this.scenes[name].dirty)for(const key of keys){
      if(key in n.props)n.p[key]=copyValue(n.props[key],n.p[key]);else delete n.p[key];
    }
  }
  apply(scene,clipName,time,rootPath='',loop=false){
    const clip=this.data.clips[clipName];if(!clip)return;
    time=loop&&clip.duration?((time%clip.duration)+clip.duration)%clip.duration:clamp(time,0,clip.duration);
    const key=scene+'|'+clipName+'|'+rootPath;
    let tracks=this.bound.get(key);
    if(!tracks){tracks=clip.tracks.map(t=>({t,node:this.scenes[scene].paths.get([rootPath,t.path].filter(Boolean).join('/')),parts:t.attr.split('.')}));this.bound.set(key,tracks);}
    for(const {t,node,parts}of tracks){
      if(!node||!t.keys.length)continue;
      const dirty=this.scenes[scene].dirty;let changed=dirty.get(node);if(!changed){changed=new Set();dirty.set(node,changed);}changed.add(parts[0]);
      const value=sample(t.keys,time,['m_IsActive','m_Enabled','m_Interactable'].includes(t.attr));
      if(parts.length===1)node.p[parts[0]]=copyValue(value,node.p[parts[0]]);
      else{let target=node.p;for(let i=0;i<parts.length-1;i++){target[parts[i]]??={};target=target[parts[i]];}const end=parts.at(-1);target[end]=copyValue(value,target[end]);}
    }
  }
  loops(scene,time){for(const n of this.scenes[scene].nodes)if(n.auto&&n.animation)this.apply(scene,n.animation,time,n.path,true);}
  omitted(n,scene){
    if(scene==='home')return /^(panel_topmenu|panel_ui\/(root_end_time|group_top|group_left|btn_rpg))(\/|$)/.test(n.path)||/\/logo_arknights$/.test(n.path)||['group_lock','group_end','tag_new','tag_unlock'].includes(n.name);
    return /(^|\/)(panel_stages|panel_shop)(\/|$)/.test(n.path);
  }
  draw(ctx,scene,width,height,time,pan=0){
    this.hits=[];this.time=time;this.drawNode(ctx,this.scenes[scene].root,width,height,scene,true,pan);
    if(scene!=='home')this.drawLines(ctx,scene,width,height,pan);
  }
  switchColor(n){
    const colors=n.buttonColors;if(!colors)return {r:1,g:1,b:1,a:1};
    const key=n.p.m_Interactable===0?'m_DisabledColor':this.switchPressed?'m_PressedColor':this.switchHovered?'m_HighlightedColor':'m_NormalColor';
    const target=colors[key],previous=this.buttonFeedback;
    if(!previous||this.time<previous.at)this.buttonFeedback={key,at:this.time,from:target,value:target};
    else if(previous.key!==key)this.buttonFeedback={key,at:this.time,from:previous.value,value:previous.value};
    const f=this.buttonFeedback,t=clamp((this.time-f.at)/Math.max(.00001,colors.m_FadeDuration));
    return f.value=Object.fromEntries(['r','g','b','a'].map(k=>[k,f.from[k]+(target[k]-f.from[k])*t]));
  }
  drawLines(ctx,scene,w,h,pan){
    const {root,linePoints:points}=this.scenes[scene],settings=root.mapSettings;
    if(!settings?.lines.length)return;
    ctx.save();ctx.translate(w/2-pan,h/2);ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.shadowColor='#40586255';ctx.shadowBlur=4;ctx.shadowOffsetY=3;ctx.beginPath();
    for(const {startStage,endStage}of settings.lines){const a=points.get(startStage),b=points.get(endStage);if(a&&b){ctx.moveTo(a.x,-a.y);ctx.lineTo(b.x,-b.y);}}
    ctx.stroke();ctx.restore();
  }
  drawNode(ctx,n,pw,ph,scene,isRoot=false,pan=0){
    const p=n.p;if(!p.m_IsActive||this.omitted(n,scene))return;
    const a=p.m_AnchorMin||{x:.5,y:.5},b=p.m_AnchorMax||a,pivot=p.m_Pivot||{x:.5,y:.5},size=p.m_SizeDelta||{x:0,y:0},pos=p.m_AnchoredPosition||p.m_LocalPosition||{x:0,y:0};
    let w=isRoot?pw:pw*(b.x-a.x)+size.x;const h=isRoot?ph:ph*(b.y-a.y)+size.y;
    const zoneText=n.name==='text'&&n.path.startsWith('panel_ui/group_right/');
    const label=zoneText?(n.path.includes('/btn_zone/')?'驶向大地尽头':n.path.includes('/btn_ex/')?'踏上归家长途':'眺望待行之路'):'';
    if(zoneText){ctx.save();ctx.font=`500 ${n.font?.m_FontSize||19}px "Activity Sans",sans-serif`;w=ctx.measureText(label).width;ctx.restore();}
    const s=p.m_LocalScale||{x:1,y:1},q=p.m_LocalRotation||{x:0,y:0,z:0,w:1};
    let x=pw*(a.x+(b.x-a.x)*pivot.x)+pos.x,y=ph*(1-a.y-(b.y-a.y)*pivot.y)-pos.y;
    if(isRoot){x=w*pivot.x;y=h*(1-pivot.y);}
    if(scene!=='home'&&['image_background_bind','image_background_1'].includes(n.name))x-=pan;
    ctx.save();ctx.translate(x,y);
    if(p.localEulerAnglesRaw){ctx.rotate(-(p.localEulerAnglesRaw.z||0)*Math.PI/180);}
    else{
      const norm=Math.hypot(q.x,q.y,q.z,q.w)||1,qx=q.x/norm,qy=q.y/norm,qz=q.z/norm,qw=q.w/norm;
      ctx.transform(1-2*(qy*qy+qz*qz),-2*(qx*qy+qw*qz),-2*(qx*qy-qw*qz),1-2*(qx*qx+qz*qz),0,0);
    }
    ctx.scale(s.x,s.y);ctx.translate(-w*pivot.x,-h*(1-pivot.y));
    ctx.globalAlpha*=clamp(p.m_Alpha??1);
    if(n.switchSettings&&this.switchAge>=0&&this.switchAge<n.switchSettings.cooldown)
      ctx.globalAlpha*=n.switchSettings.cooldownAlpha;
    if(n.switchSettings)this.switchTint=this.switchColor(n);
    if(ctx.globalAlpha<.001){ctx.restore();return;}
    if(n.mask){ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();}
    if(scene==='home'&&['btn_zone','btn_ex','btn_s','btn_switch'].includes(n.name)){
      const m=ctx.getTransform();this.hits.push({name:n.name,x:m.e,y:m.f,w:w*m.a,h:h*m.d});
    }
    // The original matte uses NotEqual stencil, covering only the outside of
    // its 1860x2000 mask. At this viewport it has no visible pixels.
    if(n.graphic?.enabled&&(!n.mask||n.showMask)&&n.stencil?._colorMask!==0&&n.path!=='group_matte/matte')this.graphic(ctx,n,w,h);
    if(n.mesh&&n.mesh!=='0'&&this.meshRenderer){const out=this.meshRenderer.draw(this.time);ctx.drawImage(out,0,h/2,w,h);}
    if(n.particle&&this.drawParticles)this.drawParticles(this,ctx,n,w,h);
    if(zoneText){
      ctx.fillStyle='white';ctx.font=`500 ${n.font?.m_FontSize||19}px "Activity Sans",sans-serif`;ctx.textBaseline='middle';ctx.fillText(label,0,h/2+4);
    }
    for(const c of n.children)this.drawNode(ctx,c,w,h,scene,false,pan);
    ctx.restore();
  }
  graphic(ctx,n,w,h){
    if(w<=0||h<=0)return;
    const g=n.graphic,c={...(n.p.m_Color||{r:1,g:1,b:1,a:1})},mat=this.data.materials[g.material];
    if(n.path.startsWith('panel_ui/btn_switch/img_kv')&&this.switchTint)
      for(const k of ['r','g','b','a'])c[k]*=this.switchTint[k];
    // Fully transparent graphic layers have no contribution, including their
    // material pass. Do not spend a WebGL draw/copy on hidden transition layers.
    if(c.a===0)return;
    // In HG UI materials vertex RGB carries effect controls, not a tint.
    const controlledSheet=mat?.textures?._ParticleTex?.image&&mat.floats._PropertyCtrlMode===1;
    const encoded=mat?.floats?._RgbCtrl===1||controlledSheet;
    const imageId=g.image||mat?.textures?._ParticleTex?.image||mat?.textures?._BaseTex?.image||mat?.textures?._MainTex?.image;
    let img=this.images[imageId];
    ctx.save();ctx.globalAlpha*=clamp(c.a??1);
    if(mat?.floats?._Dst===1||mat?.floats?._DstBlend===1)ctx.globalCompositeOperation='lighter';
    if(img){
      if(!encoded&&(c.r<.99||c.g<.99||c.b<.99))img=this.tint(imageId,c);
      if(mat?.textures?._ParticleTex?.image){
        const f={...mat.floats};for(const value of Object.values(n.p))if(value?.enable&&value.name&&'floatValue' in value)f[value.name]=value.floatValue;
        const t=n.path.includes('root_entry_trans')?this.swapTime??0:this.time;
        const {cols,rows,index:frame,row}=animSheetFrame(f,c,t);
        ctx.drawImage(img,(frame%cols)*img.width/cols,row*img.height/rows,img.width/cols,img.height/rows,0,0,w,h);
      }else if(this.effects&&mat&&(mat.floats._Dissolve||mat.floats._Distortion||mat.textures._DisturbTex?.image)){
        const effect=this.effects.draw(img,mat,n.p,this.time);
        ctx.drawImage(effect.canvas,0,0,effect.width,effect.height,0,0,w,h);
      }else ctx.drawImage(img,0,0,w,h);
    }else if(!g.external&&!mat){ctx.fillStyle=`rgb(${c.r*255} ${c.g*255} ${c.b*255})`;ctx.fillRect(0,0,w,h);}
    ctx.restore();
  }
  tint(id,c){
    const color=[c.r,c.g,c.b].map(v=>Math.round(clamp(v)*255));const key=id+':'+color.join(',');
    if(color.every(v=>v===255))return this.images[id];
    if(this.tints.has(key))return this.tints.get(key);
    const img=this.images[id],cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;const ct=cv.getContext('2d');
    ct.drawImage(img,0,0);ct.globalCompositeOperation='multiply';ct.fillStyle=`rgb(${color.join(' ')})`;ct.fillRect(0,0,cv.width,cv.height);ct.globalCompositeOperation='destination-in';ct.drawImage(img,0,0);
    if(this.tints.size>300)this.tints.clear();this.tints.set(key,cv);return cv;
  }
  road(ctx,w,h){
    // Perspective road texture is rendered in strips; source material scrolls
    // its V coordinate at 0.5 cycles/sec. Grass/horizon use native transforms.
    const mat=Object.values(this.data.materials).find(m=>m.name==='m_road');
    const img=this.images[mat?.textures?._BaseTex?.image];if(!img)return;
    const cx=w/2,top=h/2;
    for(let y=0;y<1100;y+=3){const z=y/1100,half=8+z*760;const v=((1/(z+.055)*.035+this.time*.5)%1+1)%1;ctx.drawImage(img,0,v*(img.height-2),img.width,2,cx-half,top+y,half*2,4);}
  }
}


