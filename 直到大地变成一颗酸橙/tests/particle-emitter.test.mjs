import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cappedRateBirths,meshOrigin} from '../particle-emitter.js';
const constant=scalar=>({minMaxState:0,scalar});
const source=JSON.parse(readFileSync(new URL('../assets/native/scene.json',import.meta.url)));
const all=[];const visit=n=>{all.push(n);n.children.forEach(visit);};visit(source.scenes.ex);

test('a full emitter skips new births instead of replacing living particles',()=>{
  const ps={EmissionModule:{rateOverTime:constant(1)},looping:true,lengthInSec:5};
  const initial={maxNumParticles:2,startLifetime:constant(10)},cache={};
  assert.deepEqual(cappedRateBirths(ps,initial,1,0,cache),[[0,0],[1,1]]);
  assert.deepEqual(cappedRateBirths(ps,initial,5,0,cache),[[0,0],[1,1]]);
  assert.deepEqual(cappedRateBirths(ps,initial,10,0,cache),[[1,1],[10,10]]);
});
test('authored blue and purple emitters stay within 5 and 12 particles',()=>{
  for(const [name,cap] of [['star_blue',5],['star_purple',12]]){
    const node=all.find(n=>n.name===name),ps=node.particle,cache={},seed=Number(node.id.slice(-6));
    assert.equal(ps.InitialModule.maxNumParticles,cap);
    for(let t=0;t<=60;t+=.13)assert.ok(cappedRateBirths(ps,ps.InitialModule,t,seed,cache).length<=cap);
  }
});
test('particle populations are identical after direct seek, playback and rewind',()=>{
  const node=all.find(n=>n.name==='star_purple'),ps=node.particle,seed=12,cache={};
  for(let t=0;t<20;t+=.1)cappedRateBirths(ps,ps.InitialModule,t,seed,cache);
  const direct=cappedRateBirths(ps,ps.InitialModule,20,seed,{});
  assert.deepEqual(cappedRateBirths(ps,ps.InitialModule,20,seed,cache),direct);
  assert.deepEqual(cappedRateBirths(ps,ps.InitialModule,7,seed,cache),cappedRateBirths(ps,ps.InitialModule,7,seed,{}));
});
test('both target emitters reference the original circle mesh using exact string IDs',()=>{
  for(const name of ['star_blue','star_purple']){
    const ps=all.find(n=>n.name===name).particle;
    assert.equal(ps.shapeMesh,'3306963361407833251');
    assert.equal(source.emissionMeshes[ps.shapeMesh].name,'rl06_polar_circle2');
  }
});
test('mesh vertex and edge placement use the mesh rather than a unit box',()=>{
  const mesh={vertices:[[2,0,0],[4,0,0],[2,2,0]],indices:[0,1,2]};
  assert.deepEqual(meshOrigin(mesh,0,.4,.5,.5),[4,0,0]);
  assert.deepEqual(meshOrigin(mesh,1,0,.5,.5),[3,0,0]);
  const p=meshOrigin(mesh,2,.5,.25,.5);assert.deepEqual(p,[2.5,.5,0]);
});
