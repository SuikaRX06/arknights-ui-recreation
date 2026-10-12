// CPU-only benchmark of identical animation sampling, not a browser/GPU FPS claim.
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {NativeScene} from '../native-scene.js';
const data=JSON.parse(readFileSync(new URL('../assets/native/scene.json',import.meta.url)));
const samples=1000,results=[];
for(const scene of ['home','normal','ex','s']){
  for(const mode of ['full-clone','dirty-properties']){
    const renderer=new NativeScene(structuredClone(data),{});
    if(mode==='full-clone')renderer.reset=function(name){for(const n of this.scenes[name].nodes)n.p=structuredClone(n.props);};
    const frame=i=>{
      const t=i/60;renderer.reset(scene);
      if(scene==='home')renderer.apply(scene,'act53side_entry_kv1',Math.min(t,5.166667));
      renderer.loops(scene,t);
    };
    for(let i=0;i<120;i++)frame(i);
    const durations=[];
    for(let i=0;i<samples;i++){const start=performance.now();frame(i);durations.push(performance.now()-start);}
    durations.sort((a,b)=>a-b);
    results.push({scene,mode,samples,medianMs:durations[500],p95Ms:durations[950],totalMs:durations.reduce((a,b)=>a+b,0)});
  }
}
const report={scope:'CPU animation reset and sampling only; no canvas/WebGL or browser FPS',results};
writeFileSync(new URL('../reference/cpu-animation-benchmark.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.table(results);
