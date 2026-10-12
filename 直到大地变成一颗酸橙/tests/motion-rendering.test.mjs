import test from 'node:test';
import assert from 'node:assert/strict';
import {animSheetFrame,dissolveAlpha,effectControls} from '../shader-math.js';
import {trailRibbon} from '../trail-renderer.js';
import {readFileSync} from 'node:fs';

test('native sheet rounding handles half frames, wrap and UIColor control',()=>{
  const f={_Column:4,_Row:4,_FPS:1,_PropertyCtrlMode:0};
  for(const [time,index]of [[.5,0],[1.5,2],[15.6,0],[16,0]])assert.equal(animSheetFrame(f,{r:1},time).index,index);
  assert.equal(animSheetFrame({...f,_PropertyCtrlMode:1},{r:1},0).index,15);
});
test('native dissolve fades from threshold to threshold plus softness',()=>{
  assert.equal(dissolveAlpha(.3,.3,.2),0);
  assert.ok(Math.abs(dissolveAlpha(.4,.3,.2)-.5)<1e-12);
  assert.equal(dissolveAlpha(.5,.3,.2),1);
  assert.deepEqual(effectControls({_RgbCtrl:1},{r:.1,g:.6,b:.9}),{strength:.1,threshold1:.19999999999999996,threshold2:.8});
});
test('road ribbon respects native transparent ends and has finite connected geometry',()=>{
  const data=JSON.parse(readFileSync(new URL('../assets/native/scene.json',import.meta.url)));
  const nodes=[];const visit=n=>{nodes.push(n);n.children.forEach(visit);};visit(data.scenes.home);
  const trail=nodes.find(n=>n.particle?.TrailModule?.enabled&&data.materials[n.particleMaterial]?.name==='particle_line').particle.TrailModule;
  const verts=trailRibbon(t=>[t,t*t],.5,.2,trail,.15,{r:1,g:.5,b:.2,a:.8});
  assert.ok(verts.length>48);assert.ok(verts.every(Number.isFinite));
  const rows=Array.from({length:verts.length/8},(_,i)=>verts.slice(i*8,i*8+8));
  assert.ok(rows.filter(v=>v[2]===0||v[2]===1).every(v=>v[7]===0));
  assert.ok(rows.some(v=>v[7]>.5));
  for(let i=6;i<rows.length;i+=6){assert.deepEqual(rows[i],rows[i-4]);assert.deepEqual(rows[i+1],rows[i-1]);}
  assert.deepEqual(trailRibbon(()=>[0,0],0,0,trail,1,{r:1,g:1,b:1,a:1}),[]);
});
