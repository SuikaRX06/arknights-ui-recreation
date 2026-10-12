// Independent local-page test. Never attaches to a user's browser/profile.
// Usage: node tools/verify-browser-performance.mjs <absolute Playwright module path>
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));
const report={date:new Date().toISOString(),browser:browser.version(),mode:'isolated headless Edge; CPU render submission and rAF intervals, not GPU completion or physical display FPS',errors};
try{
  await page.goto('http://127.0.0.1:4173/?frame=12');
  await page.waitForFunction(()=>window.motionStudy?.state.ready,{},{timeout:60000});
  report.gpu=await page.evaluate(()=>{
    const gl=motionStudy.native.effects.gl,ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};
  });
  // Compare fixed surface / top-left ROI with old per-sprite surface sizing.
  report.materialPixels=await page.evaluate(async()=>{
    const {MaterialEffects}=await import('/material-effects.js'),n=motionStudy.native;
    const fixed=n.effects,resized=new MaterialEffects(n.images),result=[];
    resized.steppedCache.limit=0;
    const cv=document.createElement('canvas'),ct=cv.getContext('2d',{willReadFrequently:true});
    const read=output=>{cv.width=output.width;cv.height=output.height;ct.drawImage(output.canvas,0,0,output.width,output.height,0,0,output.width,output.height);return ct.getImageData(0,0,cv.width,cv.height).data;};
    for(const mat of Object.values(n.data.materials)){
      if(!(mat.floats._Dissolve||mat.floats._Distortion||mat.textures._DisturbTex?.image)||mat.textures._ParticleTex?.image)continue;
      const id=mat.textures._BaseTex?.image||mat.textures._MainTex?.image,img=n.images[id];if(!img)continue;
      for(const time of [.25,1.25,12.37]){
        resized.canvas.width=Math.min(1536,img.width);resized.canvas.height=Math.min(1024,img.height);
        const a=read(fixed.draw(img,mat,{},time)),b=read(resized.draw(img,mat,{},time));
        let max=0,changed=0;for(let i=0;i<a.length;i++){const delta=Math.abs(a[i]-b[i]);max=Math.max(max,delta);if(delta)changed++;}
        result.push({material:mat.name,time,maxChannelDelta:max,changedChannels:changed});
      }
    }
    for(const node of n.scenes.normal.nodes){
      const mat=n.data.materials[node.graphic?.material],img=n.images[node.graphic?.image];
      if(!img||!mat?.textures._DisturbTex?.image||n.omitted(node,'normal'))continue;
      for(const time of [.125,.625,1.125,2.125,3.125,4.125,.125]){
        resized.canvas.width=Math.min(1536,img.width);resized.canvas.height=Math.min(1024,img.height);
        const a=read(fixed.draw(img,mat,node.p,time)),b=read(resized.draw(img,mat,node.p,time));
        let max=0,changed=0;for(let i=0;i<a.length;i++){const delta=Math.abs(a[i]-b[i]);max=Math.max(max,delta);if(delta)changed++;}
        result.push({material:mat.name,path:node.path,time,maxChannelDelta:max,changedChannels:changed});
      }
    }
    resized.gl.getExtension('WEBGL_lose_context')?.loseContext();
    return result;
  });
  report.benchmarks=[];
  for(const mode of (process.env.FINAL_ONLY?['dirty-properties']:['full-clone','dirty-properties']))for(const scene of ['home','normal','ex','s','road','sky','paper']){
    const result=await page.evaluate(async({mode,scene})=>{
      const m=motionStudy,n=m.native,originalReset=Object.getPrototypeOf(n).reset;
      n.reset=mode==='full-clone'?function(name){for(const node of this.scenes[name].nodes)node.p=structuredClone(node.props);}:originalReset;
      Object.assign(m.state,{scene:['road','sky','paper'].includes(scene)?'home':scene,variant:scene==='sky'?1:0,swap:null,transition:null,pan:0,target:0,sceneEnteredAt:0,paused:true});
      const times=[],intervals=[];let last=0;
      for(let i=0;i<210;i++)await new Promise(resolve=>requestAnimationFrame(now=>{
        const t=scene==='road'?.75+(i%60)/60:scene==='paper'?6+(i%120)/60:12+i/60;
        m.state.swap=scene==='paper'?{start:6,to:1,clip:'act53side_trans_kv1tokv2'}:null;
        if(scene==='normal')m.state.pan=i/209*1920;
        const begin=performance.now();m.seek(t);const cost=performance.now()-begin;
        if(i>=30){times.push(cost);intervals.push(now-last);}last=now;resolve();
      }));
      n.reset=originalReset;times.sort((a,b)=>a-b);intervals.sort((a,b)=>a-b);
      return {scene,mode,frames:times.length,canvas:[document.querySelector('#scene').width,document.querySelector('#scene').height],medianMs:times[90],p95Ms:times[171],intervalP95Ms:intervals[171],over50ms:intervals.filter(t=>t>50).length,tintCache:n.tints.size,atlasCacheBytes:n.effects.steppedCache.bytes};
    },{mode,scene});
    report.benchmarks.push(result);console.log(JSON.stringify(result));
  }
  // Playback interactions use the production handlers and paused deterministic seeks.
  report.interactions=await page.evaluate(()=>{
    const m=motionStudy,checks=[];Object.assign(m.state,{scene:'home',time:12,variant:0,swap:null,transition:null,switchStarted:null});m.render();
    m.switchArt();m.seek(12+3);checks.push({name:'sky switch completes',pass:m.state.variant===1&&!m.state.swap});
    m.switchArt();m.seek(18);checks.push({name:'warm switch completes',pass:m.state.variant===0&&!m.state.swap});
    for(const route of ['normal','ex','s','home']){m.navigate(route);m.seek(m.state.time+1);checks.push({name:`navigate ${route}`,pass:m.state.scene===route&&!m.state.transition});}
    return checks;
  });
  report.cullingPixels=await page.evaluate(()=>{
    const m=motionStudy,cv=document.querySelector('#scene'),ctx=cv.getContext('2d'),result=[];
    for(const scene of ['home','normal','ex','s'])for(const time of [1.25,12,14.5]){
      Object.assign(m.state,{scene,time,variant:0,swap:null,transition:null,pan:scene==='normal'?1700:0});
      m.native.cullOffscreen=false;m.render();const a=ctx.getImageData(0,0,cv.width,cv.height).data;
      m.native.cullOffscreen=true;m.render();const b=ctx.getImageData(0,0,cv.width,cv.height).data;
      let max=0,changed=0;for(let i=0;i<a.length;i++){const delta=Math.abs(a[i]-b[i]);max=Math.max(max,delta);if(delta)changed++;}
      result.push({scene,time,maxChannelDelta:max,changedChannels:changed});
    }
    return result;
  });
  if(errors.length||report.materialPixels.some(r=>r.maxChannelDelta>1)||report.cullingPixels.some(r=>r.maxChannelDelta>1)||report.interactions.some(r=>!r.pass))process.exitCode=1;
}catch(e){errors.push(e.stack);process.exitCode=1;}
finally{writeFileSync(new URL('../reference/browser-performance.json',import.meta.url),JSON.stringify(report,null,2)+'\n');await browser.close();}
