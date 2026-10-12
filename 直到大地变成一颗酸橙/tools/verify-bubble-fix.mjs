import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const before=await readFile('reference/bubble-fix/particles-before.js','utf8');
const browser=await chromium.launch({channel:'msedge',headless:true});
const report={date:'2026-10-09',errors:[],comparisons:[],screenshots:false};
async function trace(baseline){
  const context=await browser.newContext({viewport:{width:1280,height:820}});
  if(baseline)await context.route('**/particles.js',r=>r.fulfill({contentType:'text/javascript',body:before}));
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  try{
    await page.goto('http://127.0.0.1:4173/?frame=12&scene=s');await page.waitForFunction(()=>window.motionStudy?.state.ready);
    const traces=await page.evaluate(()=>{
      const m=motionStudy,n=m.native,draw=n.drawParticles,result={};let frame;
      n.drawParticles=(renderer,ctx,node,w,h)=>{
        const calls=[];
        const proxy=new Proxy(ctx,{get(target,key){if(key==='translate')return (...args)=>{calls.push(args);return target.translate(...args);};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},set(target,key,value){return Reflect.set(target,key,value,target);}});
        draw(renderer,proxy,node,w,h);frame[node.path]=calls;
      };
      for(const scene of ['home','normal','ex','s'])for(const t of [1.25,6,12,20]){
        m.state.scene=scene;frame={};m.seek(t);result[scene+'/'+t]=frame;
      }
      n.drawParticles=draw;return result;
    });
    if(!baseline){
      await page.evaluate(()=>{motionStudy.state.scene='s';motionStudy.seek(12);});await page.keyboard.press('Space');await page.waitForTimeout(16000);
      report.playback=await page.evaluate(()=>({scene:motionStudy.state.scene,time:motionStudy.state.time,gl:[motionStudy.native.effects.gl.getError(),motionStudy.native.trails.gl.getError(),motionStudy.native.meshRenderer.gl.getError()]}));
      assert.equal(report.playback.scene,'s');assert(report.playback.time>26);assert(report.playback.gl.every(x=>!x));
    }
    return traces;
  }finally{await context.close();}
}
try{
  const a=await trace(true),b=await trace(false);let changed=0,untouched=0;
  for(const key of Object.keys(a))for(const node of Object.keys(a[key])){
    if(key.startsWith('s/')&&/\/parti_bubble\/bubble(?:02)?$/.test(node)){
      if(JSON.stringify(a[key][node])!==JSON.stringify(b[key][node]))changed++;
      assert(b[key][node].flat().every(Number.isFinite));
    }else{assert.deepEqual(b[key][node],a[key][node],key+'/'+node);untouched++;}
  }
  assert(changed>0);assert.deepEqual(report.errors,[]);report.comparisons={changedBubbleSamples:changed,unchangedOtherEmitterSamples:untouched};report.pass=true;
}catch(e){report.pass=false;report.error=e.stack;process.exitCode=1;}
finally{await browser.close();await writeFile('reference/bubble-fix/browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
