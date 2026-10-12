// Validate the package in a separate directory and fresh browser contexts.
import {pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdtemp,cp,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const source=path.resolve('../dist/直到大地变成一颗酸橙');
const clean=await mkdtemp(path.resolve('reference/release-preparation/clean-'));
await cp(source,clean,{recursive:true});
const manifest=JSON.parse(await readFile(path.join(clean,'MANIFEST.sha256.json'),'utf8'));
for(const f of manifest.files){const b=await readFile(path.join(clean,f.path));assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256,f.path);}
const actual=await readdir(clean,{recursive:true,withFileTypes:true});
assert.equal(actual.filter(f=>f.isFile()).length,manifest.files.length+1);
for(const forbidden of ['reference','tools','tests','node_modules'])assert(!actual.some(f=>f.name===forbidden));
const npmCli=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const server=spawn(process.execPath,[npmCli,'start'],{cwd:clean,env:{...process.env,PORT:'4174'},windowsHide:true,stdio:['ignore','pipe','pipe']});
let serverLog='';server.stdout.on('data',b=>serverLog+=b);server.stderr.on('data',b=>serverLog+=b);
const origin='http://127.0.0.1:4174';
const report={date:'2026-10-12',node:process.version,cleanDirectory:clean,launch:'npm start via npm-cli.js; PORT=4174',manifestFiles:manifest.files.length,checks:[],browsers:[]};
try{
  for(let i=0;i<80;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.equal((await fetch(origin)).status,200);
  assert.equal((await fetch(origin+'/assets/fonts/NotoSansHans-Medium.otf',{method:'HEAD'})).headers.get('content-type'),'font/otf');
  assert.equal((await fetch(origin,{method:'POST'})).status,405);
  report.checks.push('Exact manifest hashes; no extra files; npm start; GET, HEAD, POST restriction; font MIME');
  // Check every local Markdown link in the public usage documents.
  for(const f of manifest.files.filter(f=>f.path.endsWith('.md'))){
    const s=await readFile(path.join(clean,f.path),'utf8');
    for(const m of s.matchAll(/\]\(([^)]+)\)/g))if(!/^(https?:|#)/.test(m[1]))assert.equal((await fetch(origin+'/'+m[1])).status,200,`${f.path}: ${m[1]}`);
  }
  for(const channel of ['msedge','chrome']){
    const browser=await chromium.launch({channel,headless:true});
    const context=await browser.newContext({viewport:{width:1280,height:820},serviceWorkers:'block'});
    const page=await context.newPage();
    const r={channel,version:browser.version(),errors:[],external:[],requests:0,phases:[]};
    report.browsers.push(r);const start=Date.now();
    page.on('pageerror',e=>r.errors.push(e.message));
    page.on('requestfailed',q=>r.errors.push(q.url()+': '+q.failure()?.errorText));
    page.on('response',q=>{if(q.status()>=400)r.errors.push(`${q.status()} ${q.url()}`);});
    await context.route('**/*',route=>{r.requests++;if(new URL(route.request().url()).origin!==origin){r.external.push(route.request().url());return route.abort();}return route.continue();});
    async function phase(label,ms,scene,variant){
      await page.waitForTimeout(ms);
      const p=await page.evaluate(()=>({scene:motionStudy.state.scene,variant:motionStudy.state.variant,time:motionStudy.state.time,pan:motionStudy.state.pan,transition:!!motionStudy.state.transition,swap:!!motionStudy.state.swap,cacheBytes:motionStudy.native.effects.steppedCache.bytes,gl:[motionStudy.native.effects.gl.getError(),motionStudy.native.trails.gl.getError(),motionStudy.native.meshRenderer.gl.getError()]}));
      r.phases.push({label,...p});assert.equal(p.scene,scene);if(variant!==undefined)assert.equal(p.variant,variant);assert(p.gl.every(x=>x===0));assert(p.cacheBytes<=32*1024*1024);assert(!p.swap&&!p.transition);console.log(`${channel}: ${label}`);
    }
    try{
      await page.goto(origin);await page.waitForFunction(()=>window.motionStudy?.state.ready);
      await phase('entry ends warm',6500,'home',0);
      await page.locator('[data-hit="btn_switch"]').click();await phase('paper to sky',3000,'home',1);
      await page.locator('[data-hit="btn_switch"]').click();await phase('return warm',3000,'home',0);
      await page.locator('[data-hit="btn_zone"]').click();await phase('normal',3000,'normal');
      const box=await page.locator('#scene').boundingBox();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.2,box.y+box.height*.5,{steps:30});await page.mouse.up();await phase('drag settled',2500,'normal');assert(r.phases.at(-1).pan>0);
      await page.locator('[data-route="ex"]').click();await phase('ex',4000,'ex');
      await page.locator('[data-route="s"]').click();await phase('s',4000,'s');
      await page.locator('#home-button').click();await phase('home',4000,'home',0);
      if(channel==='msedge'){await phase('continuous home 1',30000,'home',0);await phase('continuous home 2',30000,'home',0);}
      await page.keyboard.press('r');await phase('replay ends warm',6500,'home',0);
      await page.setViewportSize({width:863,height:815});await phase('resize',2000,'home',0);
      assert.deepEqual(r.errors,[]);assert.deepEqual(r.external,[]);
      r.seconds=(Date.now()-start)/1000;r.pass=true;
    }finally{await browser.close();}
  }
  report.pass=true;
}catch(e){report.pass=false;report.error=e.stack;process.exitCode=1;}
finally{
  // Kill only the npm process tree started by this validation.
  if(server.pid)await new Promise(resolve=>{const killer=spawn('taskkill',['/pid',String(server.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});killer.on('close',resolve);killer.on('error',resolve);});
  report.serverLog=serverLog;await writeFile('reference/release-preparation/validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:report.pass,error:report.error,browsers:report.browsers.map(b=>({channel:b.channel,pass:b.pass,seconds:b.seconds}))}));
}
