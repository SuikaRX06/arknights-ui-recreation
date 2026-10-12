import {sample} from './native-scene.js';
import {curlNoise} from './gradient-noise.js';
export const clamp01=v=>Math.min(1,Math.max(0,v));
export const random=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export function curve(c,t=0,r=.5){
  if(!c)return 0;
  const value=v=>v?.m_Curve?.length?sample(v.m_Curve,clamp01(t)):1;
  switch(c.minMaxState){
    case 1:return c.scalar*value(c.maxCurve);
    case 2:return c.scalar*(value(c.minCurve)*(1-r)+value(c.maxCurve)*r);
    case 3:return c.minScalar+(c.scalar-c.minScalar)*r;
    default:return c.scalar??c.value??0;
  }
}
// Integrate normalized velocity/angular-velocity curves, rather than multiplying
// the final velocity by age. Simpson quadrature also handles weighted tangents.
export function integrate(c,t,r=.5){
  if(!c||t<=0)return 0;
  if(![1,2].includes(c.minMaxState))return curve(c,0,r)*t;
  const steps=12,h=t/steps;let sum=curve(c,0,r)+curve(c,t,r);
  for(let i=1;i<steps;i++)sum+=curve(c,i*h,r)*(i%2?4:2);
  return sum*h/3;
}
// EX decal rotation uses narrow constant-tangent pulses. Integrate each authored
// interval separately: a moving uniform grid can miss pulses or change old area.
export function integrateKeyIntervals(c,t,r=.5){
  if(!c||t<=0)return 0;
  if(![1,2].includes(c.minMaxState))return curve(c,0,r)*t;
  const keys=[...(c.maxCurve?.m_Curve||[]),...(c.minMaxState===2?c.minCurve?.m_Curve||[]:[])];
  const cuts=[0,...new Set(keys.map(k=>k.time).filter(v=>v>0&&v<t)),t].sort((a,b)=>a-b);
  let area=0;const g=Math.sqrt(3/5);
  for(let i=1;i<cuts.length;i++){
    const half=(cuts[i]-cuts[i-1])/2,mid=(cuts[i]+cuts[i-1])/2;
    area+=half*(5/9*curve(c,mid-half*g,r)+8/9*curve(c,mid,r)+5/9*curve(c,mid+half*g,r));
  }
  return area;
}
// Exported particle gradients are immutable. Decode key names/times once, not
// four times per ribbon vertex. Weak keys do not retain replaced scene data.
const gradients=new WeakMap();
export function gradient(g,t,channel){
  if(!g)return 1;
  let compiled=gradients.get(g);
  if(!compiled){
    compiled={};
    for(const k of ['r','g','b','a']){
      const alpha=k==='a',count=g[alpha?'m_NumAlphaKeys':'m_NumColorKeys']||0,times=[],values=[];
      for(let i=0;i<count;i++){times.push(g[(alpha?'atime':'ctime')+i]/65535);values.push(g['key'+i][k]);}
      compiled[k]={times,values};
    }
    gradients.set(g,compiled);
  }
  const {times,values}=compiled[channel],count=times.length;
  if(!count)return 1;
  if(t<=times[0])return values[0];
  let i=0;while(i<count-1&&times[i+1]<t)i++;
  if(i===count-1)return values[i];
  const a=times[i],b=times[i+1];
  const u=g.m_Mode===1?(t>a?1:0):clamp01((t-a)/Math.max(.00001,b-a));
  return values[i]*(1-u)+values[i+1]*u;
}
export function colorAt(g,t=0,r=.5){
  if(!g)return {r:1,g:1,b:1,a:1};
  const result={};
  for(const k of ['r','g','b','a']){
    switch(g.minMaxState){
      case 1:result[k]=gradient(g.maxGradient,t,k);break;
      case 2:result[k]=(g.minColor?.[k]??1)*(1-r)+(g.maxColor?.[k]??1)*r;break;
      case 3:result[k]=gradient(g.minGradient,t,k)*(1-r)+gradient(g.maxGradient,t,k)*r;break;
      case 4:result[k]=gradient(g.maxGradient,r,k);break;
      default:result[k]=g.maxColor?.[k]??1;
    }
  }
  return result;
}
export function sheetFrame(uv,age,life,r=.5,startRandom=r){
  const cols=uv?.enabled?Math.max(1,uv.tilesX||1):1,rows=uv?.enabled?Math.max(1,uv.tilesY||1):1;
  if(!uv?.enabled)return {cols,rows,index:0};
  const count=uv.animationType===1?cols:cols*rows;
  const progress=uv.timeMode===2?age*(uv.fps||30)/count:curve(uv.frameOverTime,clamp01(age/life),r)*(uv.cycles||1);
  const normalized=curve(uv.startFrame,0,startRandom)+progress;
  let index=Math.floor(((normalized%1)+1)%1*count);
  if(uv.animationType===1)index+=(uv.rowMode===1?Math.min(rows-1,Math.floor(startRandom*rows)):uv.rowIndex||0)*cols;
  return {cols,rows,index};
}
export function noiseDisplacement(module,age,life,seed,r=.5,position=[age,0,0],origin=[0,0,0]){
  return createNoiseSampler(module,life,seed,r,origin)(age,position);
}
export function createNoiseSampler(module,life,seed,r=.5,origin=[0,0,0]){
  if(!module?.enabled)return ()=>[0,0];
  const freq=Math.max(.001,module.frequency||0),base=[0,0],octaves=[];
  let amplitude=1,frequency=freq;
  for(let oct=0;oct<Math.max(1,module.octaves||1);oct++){
    const start=origin.map(v=>v*frequency),s=seed+oct*71;
    const b=curlNoise(...start,s,module.quality??2);
    for(let axis=0;axis<2;axis++)base[axis]+=b[axis]*amplitude;
    octaves.push({frequency,amplitude,seed:s});
    amplitude*=module.octaveMultiplier??.5;frequency*=module.octaveScale??2;
  }
  return (age,position)=>{
    const t=age/life,amount=curve(module.positionAmount,t,r)*(module.damping?1/freq:1);
    if(!amount)return [0,0];
    const scroll=integrate(module.scrollSpeed,t,r)*life,sum=[0,0];
    for(const o of octaves){
      const a=curlNoise(position[0]*o.frequency,(position[1]+scroll)*o.frequency,position[2]*o.frequency,o.seed,module.quality??2);
      for(let axis=0;axis<2;axis++)sum[axis]+=a[axis]*o.amplitude;
    }
    return sum.map((value,axis)=>{
      const remap=axis&&module.separateAxes?module.remapY:module.remap;
      const mapped=n=>module.remapEnabled?curve(remap,clamp01(n*.5+.5),r):n;
      return (mapped(value)-mapped(base[axis]))*amount*curve(axis&&module.separateAxes?module.strengthY:module.strength,t,r);
    });
  };
}
