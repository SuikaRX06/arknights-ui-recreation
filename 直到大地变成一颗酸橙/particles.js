import {curve,integrate,integrateKeyIntervals,colorAt,sheetFrame,createNoiseSampler,random,clamp01 as clamp} from './particle-math.js';
import {cappedRateBirths,meshOrigin} from './particle-emitter.js';
import {trailRibbon} from './trail-renderer.js';
import {roadNoiseDisplacement,usesPreviousRoadMotion} from './road-noise.js';
import {createBubbleMotion,usesBubbleMotion} from './bubble-motion.js';
import {usesPreviousExSnowMotion} from './ex-snow-motion.js';
const emissionStates=new WeakMap();
function rotate(v,r={}){
  const x=(r.x||0)*Math.PI/180,y=(r.y||0)*Math.PI/180,z=(r.z||0)*Math.PI/180;
  const a=[v[0],v[1]*Math.cos(x)-v[2]*Math.sin(x),v[1]*Math.sin(x)+v[2]*Math.cos(x)];
  const b=[a[0]*Math.cos(y)+a[2]*Math.sin(y),a[1],-a[0]*Math.sin(y)+a[2]*Math.cos(y)];
  return [b[0]*Math.cos(z)-b[1]*Math.sin(z),b[0]*Math.sin(z)+b[1]*Math.cos(z),b[2]];
}
// Canvas projection of authored particles, with spatial gradient/curl noise.
// Native random seeds are not available in the reference recording.
export function drawParticles(renderer,ctx,node,w,h){
  if(node.path.includes('particle_loop_')&&/particle_smoke|particle_glow/.test(node.name))return;
  const ps=node.particle,em=ps.EmissionModule;if(!em?.enabled)return;
  const mat=renderer.data.materials[node.particleMaterial],tex=mat?.textures?._BaseTex?.image||mat?.textures?._MainTex?.image||mat?.textures?._ParticleTex?.image;
  let img=renderer.images[tex];const streak=mat?.name==='particle_line';if(!img&&!streak)return;
  const previousAgeMotion=usesPreviousRoadMotion(node,mat)||usesPreviousExSnowMotion(node,mat);
  const bubbleMotion=usesBubbleMotion(node,mat);
  const merge=(base,override={})=>Object.fromEntries(Object.entries(base).map(([k,v])=>[k,typeof v==='object'&&v!==null?{...v,...override[k]}:override[k]??v]));
  const initial=merge(ps.InitialModule,node.p.InitialModule),shape=merge(ps.ShapeModule,node.p.ShapeModule);
  const exDecal=node.path.startsWith('image_background_1/background_holder/parti_star_')&&['star_blue','star_purple'].includes(node.name);
  const baseClock=node.path.includes('root_entry_trans')?renderer.swapTime:exDecal?(renderer.exParticleTime??renderer.time):renderer.time;
  const clock=baseClock-(node.path.includes('horizon_track_front/particle_star')?.566667:node.path.includes('group_title_fill/particle_cartoon')?2.333333:0);
  const now=clock*(ps.simulationSpeed||1)-curve(ps.startDelay);if(now<0)return;
  const rate=Math.max(0,curve(em.rateOverTime)),maxLife=Math.max(initial.startLifetime.scalar??0,initial.startLifetime.minScalar??0,.01),seed=Number(node.id.slice(-6));
  let births=[];
  if(rate&&!em.m_Bursts?.length&&Number.isFinite(initial.maxNumParticles)){
    let cache=emissionStates.get(node);if(!cache){cache={};emissionStates.set(node,cache);}
    births=cappedRateBirths(ps,initial,now,seed,cache);
  }else if(rate){const end=Math.floor(now*rate),start=Math.max(0,Math.floor((now-maxLife)*rate));for(let i=start;i<=end&&births.length<160;i++){const birth=i/rate;if(ps.looping||birth<ps.lengthInSec)births.push([birth,i]);}}
  for(const b of em.m_Bursts||[]){const cycle=ps.looping?Math.floor(now/ps.lengthInSec):0;for(let loop=Math.max(0,cycle-1);loop<=cycle;loop++){
    const interval=Math.max(.016,b.repeatInterval||ps.lengthInSec),cycles=b.cycleCount||Math.ceil(ps.lengthInSec/interval);
    for(let k=0;k<cycles;k++){const birth=loop*ps.lengthInSec+(b.time||0)+k*interval;if(birth>now||birth<now-maxLife)continue;const count=Math.min(80,Math.round(curve(b.countCurve)||b.maxCount||0));for(let j=0;j<count&&births.length<240;j++)births.push([birth,j+(k+loop*cycles)*count]);}
  }}
  const ribbons=[];
  const screen=ctx.getTransform();
  ctx.save();if(mat?.floats?._Dst===1||mat?.floats?._DstBlend===1)ctx.globalCompositeOperation='lighter';
  for(const [birth,id]of births){
    const emissionPhase=ps.looping?(birth%ps.lengthInSec)/ps.lengthInSec:clamp(birth/ps.lengthInSec);
    const r=random(id+seed),life=Math.max(.01,curve(initial.startLifetime,emissionPhase,r)),age=now-birth,t=age/life;if(age<0||t>1)continue;
    const size=curve(initial.startSize,emissionPhase,random(id+seed+1))*(ps.SizeModule?.enabled?curve(ps.SizeModule.curve,t,r):1);if(size<=0)continue;
    let origin=[0,0,0],direction=[0,0,1];
    if(shape.enabled){const a=r*Math.PI*2,rad=Math.sqrt(random(id+seed+3))*curve(shape.radius),angle=(shape.angle||0)*Math.PI/180;
      const mesh=renderer.data.emissionMeshes?.[ps.shapeMesh];
      if(shape.type===6&&mesh)origin=meshOrigin(mesh,shape.placementMode,random(id+seed+31),random(id+seed+32),random(id+seed+33));
      else if([5,6].includes(shape.type))origin=[r-.5,random(id+seed+3)-.5,random(id+seed+4)-.5];
      else {const z=[4,8].includes(shape.type)?random(id+seed+4)*(shape.length||0):0;origin=[Math.cos(a)*(rad+z*Math.tan(angle)),Math.sin(a)*(rad+z*Math.tan(angle)),z];direction=[Math.cos(a)*Math.sin(angle),Math.sin(a)*Math.sin(angle),Math.cos(angle)];}
      origin=rotate(origin.map((v,i)=>v*(shape.m_Scale?.[['x','y','z'][i]]??1)),shape.m_Rotation);direction=rotate(direction,shape.m_Rotation);
    }
    const speed=curve(initial.startSpeed,emissionPhase,r);
    const start=origin.map((v,axis)=>v+(shape.m_Position?.[['x','y','z'][axis]]||0));
    const noiseAt=previousAgeMotion||bubbleMotion?null:createNoiseSampler(ps.NoiseModule,life,id+seed,r,start);
    const positionAt=bubbleMotion?createBubbleMotion(ps,life,id+seed,r,start,direction,speed):at=>{
      const normalized=at/life;
      if(previousAgeMotion){
        const noise=roadNoiseDisplacement(ps.NoiseModule,at,life,id+seed,r);
        return [0,1].map(axis=>origin[axis]+direction[axis]*speed*at+(shape.m_Position?.[['x','y'][axis]]||0)+noise[axis]+(ps.VelocityModule?.enabled?integrate(ps.VelocityModule[['x','y'][axis]],normalized,r)*life:0));
      }
      const position=start.map((v,axis)=>v+direction[axis]*speed*at+(ps.VelocityModule?.enabled?integrate(ps.VelocityModule[['x','y','z'][axis]],normalized,r)*life:0));
      const noise=noiseAt(at,position);
      return [position[0]+noise[0],position[1]+noise[1]];
    };
    const [x,y]=positionAt(age);
    const color=colorAt(initial.startColor,emissionPhase,r),overLife=ps.ColorModule?.enabled?colorAt(ps.ColorModule.gradient,t,random(id+seed+7)):{r:1,g:1,b:1,a:1};
    for(const k of ['r','g','b','a'])color[k]*=overLife[k];
    const alpha=color.a;
    if(!streak&&renderer.cullOffscreen!==false){
      if(alpha<=0)continue;
      // Conservative bounds of any rotation of the square sprite; this only
      // removes work wholly outside the canvas, without clipping visible edges.
      const px=w/2+x,py=h/2-y,sx=screen.a*px+screen.c*py+screen.e,sy=screen.b*px+screen.d*py+screen.f;
      const radius=size*Math.SQRT1_2,rx=radius*(Math.abs(screen.a)+Math.abs(screen.c)),ry=radius*(Math.abs(screen.b)+Math.abs(screen.d));
      if(ctx.canvas&&(sx+rx<0||sy+ry<0||sx-rx>ctx.canvas.width||sy-ry>ctx.canvas.height))continue;
    }
    // Bound color-cache cardinality while preserving the authored palette.
    const tintColor=Object.fromEntries(['r','g','b'].map(k=>[k,Math.round(clamp(color[k])*15)/15]));
    if(img)img=renderer.tint(tex,tintColor);
    const rotation=curve(initial.startRotation,emissionPhase,r)+(ps.RotationModule?.enabled?(exDecal?integrateKeyIntervals:integrate)(ps.RotationModule.curve,t,r)*life:0);
    const {cols,rows,index}=sheetFrame(ps.UVModule,age,life,r,random(id+seed+9));
    if(streak&&ps.TrailModule?.enabled){
      const trail=ps.TrailModule,tail=Math.min(age,curve(trail.lifetime,0,r));
      const transform=ctx.getTransform(),scale=Math.max(Math.hypot(transform.a,transform.b),Math.hypot(transform.c,transform.d));
      ribbons.push(trailRibbon(positionAt,age,tail,trail,size,color,r,scale,life));continue;
    }
    ctx.save();ctx.globalAlpha*=clamp(alpha);ctx.translate(w/2+x,h/2-y);ctx.rotate(-rotation);
    if(streak){ctx.strokeStyle='#fff4cb';ctx.lineWidth=.009;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(size*3,-size*.7);ctx.stroke();}
    else ctx.drawImage(img,(index%cols)*img.width/cols,(rows-1-Math.floor(index/cols))*img.height/rows,img.width/cols,img.height/rows,-size/2,-size/2,size,size);ctx.restore();
  }
  if(ribbons.length)renderer.trails.draw(ctx,ribbons,mat,w,h);
  ctx.restore();
}
