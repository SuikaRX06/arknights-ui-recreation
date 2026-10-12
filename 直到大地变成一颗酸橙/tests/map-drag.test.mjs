import test from 'node:test';
import assert from 'node:assert/strict';
import {MapDrag,settlePan} from '../map-drag.js';
test('regrab uses the visible position and ignores other pointers',()=>{
  const drag=new MapDrag();drag.start(1,500,100);
  assert.equal(drag.move(1,400,1920),200);assert.equal(drag.move(2,0,1920),null);
  drag.end(2);assert.equal(drag.move(1,600,1920),0);
  drag.end(1);assert.equal(drag.move(1,0,1920),null);
  drag.start(3,500,150);assert.equal(drag.move(3,499,1920),151);
  assert.equal(drag.move(3,-9999,1920),1920);drag.cancel();assert.equal(drag.move(3,0,1920),null);
});
test('release easing is frame-rate independent and settles at exact bounds',()=>{
  let a=0,b=0;for(let i=0;i<30;i++)a=settlePan(a,1920,1/30);for(let i=0;i<120;i++)b=settlePan(b,1920,1/120);
  assert.equal(a,1920);assert.equal(b,1920);assert.equal(settlePan(100,100,1),100);
  assert.ok(Math.abs(settlePan(0,100,.2)-settlePan(settlePan(0,100,.1),100,.1))<1e-10);
});
