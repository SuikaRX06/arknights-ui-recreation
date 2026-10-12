// Component isolation only in a disposable test page; never changes the app.
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try{
  const page=await browser.newPage({viewport:{width:1920,height:1180}});
  await page.goto('http://127.0.0.1:4173/?frame=12&scene=normal');await page.waitForFunction(()=>window.motionStudy?.state.ready);
  const materials=await page.evaluate(()=>{
    const n=motionStudy.native,draw=n.effects.draw,list=[];
    n.effects.draw=function(img,mat,props,time){list.push({name:mat.name,width:img.width,height:img.height,floats:mat.floats,textures:mat.textures,props:Object.fromEntries(Object.entries(props).filter(([k,v])=>v?.enable&&v.name||k==='m_Color'))});return draw.call(this,img,mat,props,time);};
    motionStudy.render();n.effects.draw=draw;return list;
  });
  writeFileSync(new URL('../reference/map-active-materials.json',import.meta.url),JSON.stringify(materials,null,2)+'\n');
  for(const mode of ['all','no-lines','no-materials','no-particles']){
    const result=await page.evaluate(async mode=>{
      const n=motionStudy.native,lines=n.drawLines,effects=n.effects,particles=n.drawParticles;
      if(mode==='no-lines')n.drawLines=()=>{};if(mode==='no-materials')n.effects=null;if(mode==='no-particles')n.drawParticles=null;
      const costs=[],intervals=[];let last=0;
      for(let i=0;i<240;i++)await new Promise(resolve=>requestAnimationFrame(now=>{const start=performance.now();motionStudy.seek(12+i/60);if(i>39){costs.push(performance.now()-start);intervals.push(now-last);}last=now;resolve();}));
      n.drawLines=lines;n.effects=effects;n.drawParticles=particles;costs.sort((a,b)=>a-b);intervals.sort((a,b)=>a-b);
      return {mode,median:costs[100],p95:costs[190],intervalP95:intervals[190],over50:intervals.filter(v=>v>50).length};
    },mode);results.push(result);console.log(JSON.stringify(result));
  }
}finally{writeFileSync(new URL('../reference/map-cost-isolation.json',import.meta.url),JSON.stringify(results,null,2)+'\n');await browser.close();}
