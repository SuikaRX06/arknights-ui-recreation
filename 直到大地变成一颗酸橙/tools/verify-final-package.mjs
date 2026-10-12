import {readFile,writeFile,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const root=path.resolve('../dist/直到大地变成一颗酸橙');
const manifest=JSON.parse(await readFile(path.join(root,'MANIFEST.sha256.json'),'utf8'));
console.log('Verify hashes');
for(const f of manifest.files){const b=await readFile(path.join(root,f.path));assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);if(/\.(json|js|css|html|md|mjs)$/.test(f.path))assert(!/[A-Za-z]:\\/.test(b.toString()),f.path+' contains an installation path');}
let originalText=await readFile('assets/native/scene.json','utf8');
const original=JSON.parse(originalText);
console.log('Verify scene metadata');
for(const mesh of Object.values(original.emissionMeshes||{}))if(/^[A-Za-z]:[\\/]/.test(mesh.source||''))originalText=originalText.replace(JSON.stringify(mesh.source),JSON.stringify('Arknights client / arts/ui/[uc]fxcommon.ab'));
assert(originalText===await readFile(path.join(root,'assets/native/scene.json'),'utf8'),'Scene text differs beyond the source annotation');
const sourceAnimationFiles=(await readdir('.')).filter(f=>/\.(js|html|css)$/.test(f));
console.log('Verify runtime source files');
for(const f of sourceAnimationFiles)assert.deepEqual(await readFile(f),await readFile(path.join(root,f)),f);
const server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:'4187'},windowsHide:true,stdio:'ignore'});
console.log('Launch packaged browser');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:960,height:640}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:4187/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  await page.goto('http://127.0.0.1:4187/?frame=0');await page.waitForFunction(()=>window.motionStudy?.state.ready);
  await page.evaluate(()=>{motionStudy.seek(1.25);motionStudy.seek(6);});
  assert.equal(await page.evaluate(()=>motionStudy.state.variant),0);
  const media=await page.evaluate(async()=>{
    const results=[];
    for(const name of ['preview.gif','maps.gif','home-street.jpg','home-sky.jpg','map-normal.jpg','map-ex.jpg','map-s.jpg']){
      const img=new Image();img.src='media/'+name;await img.decode();
      results.push({name,width:img.naturalWidth,height:img.naturalHeight});
    }
    return results;
  });
  assert(media.every(m=>m.width>0&&m.height>0));assert(media.filter(m=>m.name.endsWith('.gif')).every(m=>m.width===480&&m.height===270));assert.deepEqual(errors,[]);
  const report={date:'2026-10-12',pass:true,files:manifest.files.length+1,exactRuntimeMatch:true,sceneDifference:'Only provenance installation paths sanitized',media,errors};
  await writeFile('reference/release-preparation/final-package.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();server.kill();}
