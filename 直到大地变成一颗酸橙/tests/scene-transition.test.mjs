import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneTransition} from '../scene-transition.js';

test('a chapter switch begins with the outgoing page fully visible', () => {
  assert.deepEqual(sceneTransition(0), {changed:false,fade:0,zoom:1,done:false});
});
test('outgoing camera moves the chapter strip out with the map before black', () => {
  const middle = sceneTransition(.2), late = sceneTransition(.38);
  assert.ok(middle.zoom > 1 && middle.fade > 0 && middle.fade < 1);
  assert.ok(late.zoom > middle.zoom && late.fade > middle.fade);
  // Top edge of the original chapter graphic crosses the 720px viewport edge.
  assert.ok(360 + (569.5 - 360) * late.zoom > 720);
});
test('home route keeps its previously calibrated camera amplitude', () => {
  assert.equal(sceneTransition(.2, false).zoom, 1 + .065 * .25);
  assert.equal(sceneTransition(.2, false).fade, .5);
});
test('the scene and selected artwork change only under full black', () => {
  assert.equal(sceneTransition(.4 - 1e-6).changed, false);
  for (const time of [.4, .44, .48]) {
    const motion = sceneTransition(time);
    assert.equal(motion.changed, true);
    assert.equal(motion.fade, 1);
    assert.equal(motion.zoom, 1);
  }
});
test('new page and chapter artwork reveal continuously and settle without a pop', () => {
  assert.ok(sceneTransition(.7).fade < sceneTransition(.5).fade);
  assert.ok(sceneTransition(.9 - 1e-6).fade < .00001);
  assert.deepEqual(sceneTransition(.9), {changed:true,fade:0,zoom:1,done:true});
});
