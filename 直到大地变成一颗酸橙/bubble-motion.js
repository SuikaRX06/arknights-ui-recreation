import {curve,integrateKeyIntervals,clamp01} from './particle-math.js';
import {roadNoiseDisplacement as smoothAgeNoise} from './road-noise.js';

// Only the two S-map bubble emitters. Other scene particles keep their motion.
const bubbleIds=new Set(['3912607675352234896','-1462983373692912752']);
export const usesBubbleMotion=(node,material)=>bubbleIds.has(node.id)&&material?.name==='parti_bubble_01'&&node.path.startsWith('image_background_1/background_holder/group_star/parti_bubble/');

export function createBubbleMotion(ps,life,seed,r,start,direction,speed){
  const velocity=ps.VelocityModule;
  // These two native emitters use constant/random-constant linear velocity,
  // with an authored Speed Modifier that rapidly decays over their lifetime.
  const linear=['x','y','z'].map((axis,i)=>direction[i]*speed+(velocity?.enabled?curve(velocity[axis],0,r):0));
  return age=>{
    const t=clamp01(age/life);
    const elapsed=velocity?.enabled&&velocity.speedModifier?integrateKeyIntervals(velocity.speedModifier,t,r)*life:age;
    // Use a stable age-driven field, not fast spatial curl sampling along the
    // rising trajectory. Keep native strength/frequency and slow its clock with
    // the same speed curve. This is a bounded web approximation, not Unity parity.
    const noise=smoothAgeNoise(ps.NoiseModule,elapsed,life,seed,r);
    return [start[0]+linear[0]*elapsed+noise[0],start[1]+linear[1]*elapsed+noise[1]];
  };
}
