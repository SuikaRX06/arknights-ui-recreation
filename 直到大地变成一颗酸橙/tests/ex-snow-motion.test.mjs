import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NativeScene} from '../native-scene.js';
import {usesPreviousExSnowMotion} from '../ex-snow-motion.js';
import {roadNoiseDisplacement} from '../road-noise.js';
const data=JSON.parse(readFileSync(new URL('../assets/native/scene.json',import.meta.url)));
const native=new NativeScene(data,{});
test('EX snow rollback selects only lower-left white flower_01',()=>{
  const selected=Object.entries(native.scenes).flatMap(([scene,s])=>s.nodes.filter(n=>usesPreviousExSnowMotion(n,data.materials[n.particleMaterial])).map(n=>scene+'/'+n.name));
  assert.deepEqual(selected,['ex/flower_01']);
});
test('EX lower-left snow matches frozen historical pre-curl displacement',()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/ex-snow-baseline.json',import.meta.url)));
  const node=native.scenes.ex.paths.get(fixture.path);
  for(const row of fixture.samples){
    const actual=roadNoiseDisplacement(node.particle.NoiseModule,row.age,row.life,row.seed,row.random);
    assert(actual.every((v,i)=>v===row.expected[i]),`seed ${row.seed}, age ${row.age}`);
  }
});
