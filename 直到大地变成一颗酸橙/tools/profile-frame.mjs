import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const scene=process.argv[3]||'road';
  await page.goto('http://127.0.0.1:4173/?frame='+(scene==='road'?'1.25':'12'));await page.waitForFunction(()=>window.motionStudy?.state.ready);
  const session=await page.context().newCDPSession(page);
  await session.send('Profiler.enable');await session.send('Profiler.start');
  await page.evaluate(async scene=>{for(let i=0;i<180;i++)await new Promise(resolve=>requestAnimationFrame(()=>{motionStudy.seek(scene==='road'?.75+(i%60)/60:12+i/60);resolve();}));},scene);
  const {profile}=await session.send('Profiler.stop'),nodes=new Map(profile.nodes.map(n=>[n.id,n])),totals=new Map();
  for(let i=0;i<profile.samples.length;i++){const frame=nodes.get(profile.samples[i]).callFrame,key=`${frame.functionName} ${frame.url}:${frame.lineNumber+1}`;totals.set(key,(totals.get(key)||0)+profile.timeDeltas[i]/1000);}
  const result=[...totals].sort((a,b)=>b[1]-a[1]).slice(0,35);
  writeFileSync(new URL(`../reference/${scene}-cpu-profile.json`,import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await browser.close();}
