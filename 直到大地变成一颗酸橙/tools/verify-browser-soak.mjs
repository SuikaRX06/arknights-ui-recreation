// Real-time application playback in an isolated Chrome profile. No screenshots.
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1180},deviceScaleFactor:1});
const report={date:new Date().toISOString(),browser:browser.version(),mode:'isolated headless Chrome, real rAF playback at 1920x1080 canvas',errors:[],windows:[],phases:[]};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('requestfailed',r=>report.errors.push(`${r.url()}: ${r.failure()?.errorText}`));
page.on('console',m=>{if(m.text().startsWith('[motion-profile] '))report.windows.push(JSON.parse(m.text().slice(17)));});
async function dwell(ms){await page.waitForTimeout(ms);const snapshot=await page.evaluate(()=>({scene:motionStudy.state.scene,time:motionStudy.state.time,variant:motionStudy.state.variant,transition:!!motionStudy.state.transition,swap:!!motionStudy.state.swap,pan:motionStudy.state.pan,tints:motionStudy.native.tints.size,atlasCacheBytes:motionStudy.native.effects.steppedCache.bytes,canvas:[document.querySelector('#scene').width,document.querySelector('#scene').height],webglErrors:[motionStudy.native.effects.gl.getError(),motionStudy.native.trails.gl.getError(),motionStudy.native.meshRenderer.gl.getError()]}));report.phases.push(snapshot);console.log(JSON.stringify(snapshot));}
try{
  await page.goto('http://127.0.0.1:4173/?profile=1');await page.waitForFunction(()=>window.motionStudy?.state.ready);
  await dwell(10000);
  await page.locator('[data-hit="btn_switch"]').click();await dwell(8000);
  await page.locator('[data-hit="btn_switch"]').click();await dwell(4000);
  await page.locator('[data-hit="btn_zone"]').click();await dwell(8000);
  const canvas=await page.locator('#scene').boundingBox();
  await page.mouse.move(canvas.x+canvas.width*.7,canvas.y+canvas.height*.5);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*.2,canvas.y+canvas.height*.5,{steps:40});await page.mouse.up();await dwell(6000);
  await page.locator('[data-route="ex"]').click();await dwell(8000);
  await page.locator('[data-route="s"]').click();await dwell(8000);
  await page.locator('#home-button').click();await dwell(8000);
  if(process.env.SOAK_EXTENDED){
    await dwell(30000);await dwell(30000);
    await page.locator('[data-hit="btn_zone"]').click();await dwell(10000);
    await page.locator('#home-button').click();await dwell(10000);
  }
  await page.setViewportSize({width:863,height:815});await dwell(3000);
  if(report.errors.length||report.phases.some(p=>p.webglErrors.some(Boolean))||report.phases.at(-1).scene!=='home'||report.phases.at(-1).variant!==0)process.exitCode=1;
}catch(e){report.errors.push(e.stack);process.exitCode=1;}
finally{writeFileSync(new URL('../reference/browser-soak.json',import.meta.url),JSON.stringify(report,null,2)+'\n');await browser.close();}
