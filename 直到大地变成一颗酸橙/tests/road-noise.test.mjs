import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NativeScene} from '../native-scene.js';
import {roadNoiseDisplacement,usesPreviousRoadMotion} from '../road-noise.js';
const data=JSON.parse(readFileSync(new URL('../assets/native/scene.json',import.meta.url)));
const native=new NativeScene(data,{});
test('road rollback is limited to four entry-line emitters and three entry decals',()=>{
  const selected=Object.entries(native.scenes).flatMap(([scene,s])=>s.nodes.filter(n=>usesPreviousRoadMotion(n,data.materials[n.particleMaterial])).map(n=>scene+'/'+n.name));
  assert.deepEqual(selected,['home/left_cartoon','home/right_cartoon','home/line_left','home/line_right','home/line_left2','home/line_right2','home/mid_cartoon']);
});
test('colored road and decal displacement match frozen pre-curl trajectory samples',()=>{
  const baseline=JSON.parse(readFileSync(new URL('./fixtures/road-noise-baseline.json',import.meta.url)));
  for(const sample of baseline.samples){
    const node=native.scenes.home.paths.get(sample.path);
    const actual=roadNoiseDisplacement(node.particle.NoiseModule,sample.age,sample.life,sample.seed,sample.random);
    // JSON does not preserve signed zero; all nonzero values remain exact.
    assert.ok(actual.every((value,i)=>value===sample.expected[i]),sample.path+' at '+sample.age);
  }
});
