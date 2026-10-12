// Opt-in console diagnostics, bounded memory, no additional visible UI.
export function createMotionProfile(enabled){
  if(!enabled)return null;
  let samples=[],key='';
  return {record(scene,interval,cost){
    if(key!==scene){samples=[];key=scene;}
    if(interval<=0)return;
    samples.push({interval,cost});
    if(samples.length<300)return;
    const times=samples.map(s=>s.cost).sort((a,b)=>a-b),elapsed=samples.reduce((sum,s)=>sum+s.interval,0);
    console.info('[motion-profile]',JSON.stringify({scene,frames:samples.length,seconds:+(elapsed/1000).toFixed(2),fps:+(samples.length*1000/elapsed).toFixed(1),renderMedianMs:+times[150].toFixed(2),renderP95Ms:+times[285].toFixed(2),over50ms:samples.filter(s=>s.interval>50).length}));
    samples=[];
  }};
}
