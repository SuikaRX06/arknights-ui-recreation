import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeScene} from '../native-scene.js';
import {readFileSync} from 'node:fs';
test('incremental scene reset matches full reset through seeks and illustration changes',()=>{
  const source=JSON.parse(readFileSync(new URL('../assets/native/scene.json',import.meta.url)));
  const fast=new NativeScene(structuredClone(source),{}),full=new NativeScene(structuredClone(source),{});
  full.reset=function(name){for(const n of this.scenes[name].nodes)n.p=structuredClone(n.props);};
  for(const [name,scene]of Object.entries(fast.scenes)){
    const clips=Object.keys(source.clips).filter(k=>name==='home'?/entry|trans/.test(k):k.includes('zone'));
    for(const time of [0,.1,.9,3,10,.2,0])for(const clip of clips){
      for(const target of [fast,full]){target.reset(name);target.apply(name,clip,time);target.loops(name,time);}
      assert.deepEqual(scene.nodes.map(n=>n.p),full.scenes[name].nodes.map(n=>n.p));
    }
  }
  assert.deepEqual(fast.data.clips,source.clips,'animation keyframes must never become mutable property storage');
  for(const scene of Object.values(fast.scenes))for(const n of scene.nodes)assert.notEqual(n.p,n.props);
});
