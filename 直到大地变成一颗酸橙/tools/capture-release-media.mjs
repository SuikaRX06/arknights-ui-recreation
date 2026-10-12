// Deterministic recording of the actual app, including DOM navigation artwork.
// Requires Playwright only when generating media; never used by the runtime.
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const ffmpeg=process.argv[3];
await mkdir('media',{recursive:true});await mkdir('reference/release-preparation/gif-frames',{recursive:true});
const encoder=spawn(ffmpeg,['-y','-f','image2pipe','-framerate','20','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libvpx','-b:v','1600k','-pix_fmt','yuv420p','media/preview.webm'],{windowsHide:true});
let log='';encoder.stderr.on('data',b=>log+=b);encoder.on('error',e=>{throw e;});
const done=once(encoder,'close');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:4173/?frame=0');await page.waitForFunction(()=>window.motionStudy?.state.ready);
  await page.keyboard.press('h');await page.waitForTimeout(100);
  for(let i=0;i<560;i++){
    await page.evaluate(({i,t})=>{
      const m=window.motionStudy;m.seek(t);
      if(i===150)m.switchArt();
      if(i===240)m.navigate('normal');
      if(i>=260&&i<=320){m.state.pan=m.state.target=(i-260)/60*1920;m.render();}
      if(i===330)m.navigate('ex');
      if(i===400)m.navigate('s');
      if(i===470)m.navigate('home');
      if(i===500)m.switchArt();
    },{i,t:i/20});
    const jpg=await page.locator('#stage').screenshot({type:'jpeg',quality:86});
    if(!encoder.stdin.write(jpg))await once(encoder.stdin,'drain');
    if(i===140)await writeFile('media/cover.jpg',jpg);
    if(i<220&&i%2===0)await writeFile(`reference/release-preparation/gif-frames/${String(i/2).padStart(4,'0')}.jpg`,jpg);
    if(i%100===0)console.log(`Captured ${i}/560`);
  }
  encoder.stdin.end();const [code]=await done;if(code!==0)throw Error(log);
  if(errors.length)throw Error(errors.join('\n'));
  await writeFile('reference/release-preparation/media-capture.json',JSON.stringify({frames:560,fps:20,seconds:28,width:960,height:540,source:'actual app deterministic timeline; original transition functions; map pan demonstrated over 3 seconds',errors},null,2));
}finally{await browser.close();if(encoder.exitCode===null)encoder.kill();}
