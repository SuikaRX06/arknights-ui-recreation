import {curve,random} from './particle-math.js';

export const usesPreviousRoadMotion=(node,material)=>['particle_line','m_particle_cartoon2'].includes(material?.name)&&node.path.startsWith('panel_entry/horizon_track_front/particle_star/');

// Restore the road's pre-curl displacement from the 2026-10-07 implementation.
// This is the previous visual baseline, not a claim of Unity noise equivalence.
export function roadNoiseDisplacement(module,age,life,seed,r=.5){
  if(!module?.enabled)return [0,0];
  const freq=Math.max(.001,module.frequency||0),t=age/life;
  const amount=curve(module.positionAmount,t,r)*(module.damping?1/freq:1);
  const value=(time,s)=>{const i=Math.floor(time),u=time-i,f=u*u*(3-2*u);return (random(i+s)*(1-f)+random(i+1+s)*f)*2-1;};
  return [0,1].map(axis=>{
    let valueSum=0,amplitude=1,frequency=freq;
    for(let oct=0;oct<Math.max(1,module.octaves||1);oct++){
      const speed=curve(module.scrollSpeed,t,r),s=seed+axis*991+oct*71;
      valueSum+=(value(age*(1+speed)*frequency,s)-value(0,s))*amplitude;
      amplitude*=module.octaveMultiplier??.5;frequency*=module.octaveScale??2;
    }
    return valueSum*amount*curve(axis&&module.separateAxes?module.strengthY:module.strength,t,r);
  });
}
