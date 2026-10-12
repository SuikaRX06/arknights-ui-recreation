// Capture only actual application output, using its existing deterministic clock.
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base='reference/release-preparation/doc-frames';
await mkdir(base+'/home',{recursive:true});await mkdir(base+'/maps',{recursive:true});
await mkdir('media',{recursive:true});
async function seek(t){await page.evaluate(t=>motionStudy.seek(t),t);}
async function shot(name){await page.locator('#stage').screenshot({path:`media/${name}.jpg`,type:'jpeg',quality:92});}
try{
  await page.goto('http://127.0.0.1:4173/?frame=0');
  await page.waitForFunction(()=>window.motionStudy?.state.ready);
  await page.keyboard.press('h');
  await seek(7);await shot('home-street');await shot('cover');
  await page.evaluate(()=>motionStudy.switchArt());await seek(10);await shot('home-sky');
  await page.evaluate(()=>motionStudy.navigate('normal'));await seek(14);await shot('map-normal');
  await page.evaluate(()=>motionStudy.navigate('ex'));await seek(18);await shot('map-ex');
  await page.evaluate(()=>motionStudy.navigate('s'));await seek(22);await shot('map-s');
  assert.equal(await page.evaluate(()=>motionStudy.state.scene),'s');
  await page.reload();await page.waitForFunction(()=>window.motionStudy?.state.ready);await page.keyboard.press('h');
  for(let i=0;i<144;i++){
    await seek(6+i/12);
    if(i===24||i===90)await page.evaluate(()=>motionStudy.switchArt());
    await page.locator('#stage').screenshot({path:`${base}/home/${String(i).padStart(4,'0')}.jpg`,type:'jpeg',quality:85});
    if(i%48===0)console.log(`Home GIF: ${i}/144`);
  }
  await page.evaluate(()=>motionStudy.navigate('normal'));await seek(22);
  for(let i=0;i<144;i++){
    await seek(22+i/12);
    if(i===48)await page.evaluate(()=>motionStudy.navigate('ex'));
    if(i===96)await page.evaluate(()=>motionStudy.navigate('s'));
    if(i<40)await page.evaluate(i=>{motionStudy.state.pan=motionStudy.state.target=i/39*1200;motionStudy.render();},i);
    await page.locator('#stage').screenshot({path:`${base}/maps/${String(i).padStart(4,'0')}.jpg`,type:'jpeg',quality:85});
    if(i%48===0)console.log(`Maps GIF: ${i}/144`);
  }
  assert.deepEqual(errors,[]);
  await writeFile('reference/release-preparation/doc-media.json',JSON.stringify({date:'2026-10-12',source:'Actual browser rendering via existing seek/navigation functions; deterministic 12 fps sampling',screenshots:5,gifs:2,framesPerGif:144,errors},null,2));
}finally{await browser.close();}
