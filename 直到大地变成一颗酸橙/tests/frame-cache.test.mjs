import test from 'node:test';
import assert from 'node:assert/strict';
import {FrameCache} from '../frame-cache.js';
test('frame cache reuses cyclic frames and evicts least recently used pixels within a byte bound',()=>{
  const cache=new FrameCache(12),a={},b={},c={};
  cache.set('a',a,4);cache.set('b',b,4);cache.set('c',c,4);
  assert.equal(cache.get('a'),a);cache.set('d',{},4);
  assert.equal(cache.get('b'),undefined);assert.equal(cache.get('a'),a);assert.equal(cache.bytes,12);
  cache.set('a',{},8);assert.equal(cache.bytes,12);assert.equal(cache.get('c'),undefined);
  cache.set('huge',{},13);assert.equal(cache.get('huge'),undefined);assert.equal(cache.bytes,12);
});
