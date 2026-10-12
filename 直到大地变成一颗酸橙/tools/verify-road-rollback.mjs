import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}});
const report={scope:'Colored road-entry rollback only; no screenshots',errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:4173/?frame=0');await page.waitForFunction(()=>window.motionStudy?.state.ready);
  report.entry=await page.evaluate(async()=>{
    const m=motionStudy,n=m.native,original=n.trails.draw,costs=[];let ribbons=0,invalid=0;
    n.trails.draw=function(ctx,arrays,...rest){for(const a of arrays){ribbons++;if(!a.every(Number.isFinite))invalid++;}return original.call(this,ctx,arrays,...rest);};
    for(let i=0;i<=180;i++)await new Promise(resolve=>requestAnimationFrame(()=>{const start=performance.now();m.seek(i/30);if(i>15&&i<65)costs.push(performance.now()-start);resolve();}));
    n.trails.draw=original;costs.sort((a,b)=>a-b);
    return {ribbons,invalid,scene:m.state.scene,variant:m.state.variant,time:m.state.time,medianMs:costs[Math.floor(costs.length*.5)],p95Ms:costs[Math.floor(costs.length*.95)],webglErrors:[n.effects.gl.getError(),n.trails.gl.getError(),n.meshRenderer.gl.getError()]};
  });
  if(report.errors.length||report.entry.invalid||!report.entry.ribbons||report.entry.scene!=='home'||report.entry.variant!==0||report.entry.webglErrors.some(Boolean))process.exitCode=1;
}catch(e){report.errors.push(e.stack);process.exitCode=1;}
finally{writeFileSync(new URL('../reference/road-rollback-browser.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await browser.close();}
