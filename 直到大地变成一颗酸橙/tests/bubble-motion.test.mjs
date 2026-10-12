import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NativeScene} from '../native-scene.js';
import {curve,random} from '../particle-math.js';
import {createBubbleMotion,usesBubbleMotion} from '../bubble-motion.js';
const data=JSON.parse(readFileSync(new URL('../assets/native/scene.json',import.meta.url)));
const native=new NativeScene(data,{}),nodes=native.scenes.s.nodes.filter(n=>usesBubbleMotion(n,data.materials[n.particleMaterial]));
test('bubble correction selects only the two native S-map emitters',()=>{
  const selected=Object.entries(native.scenes).flatMap(([scene,s])=>s.nodes.filter(n=>usesBubbleMotion(n,data.materials[n.particleMaterial])).map(n=>scene+'/'+n.name));
  assert.deepEqual(selected,['s/bubble','s/bubble02']);
  for(const node of nodes)for(const axis of ['x','y','z'])assert([0,3].includes(node.particle.VelocityModule[axis].minMaxState));
});
test('bubble speed modifier integrates acceleration rather than rescaling existing displacement',()=>{
  const ps={VelocityModule:{enabled:true,x:{scalar:0},y:{scalar:8},z:{scalar:0},speedModifier:{minMaxState:1,scalar:1,maxCurve:{m_Curve:[{time:0,value:1,inSlope:-1,outSlope:-1},{time:1,value:0,inSlope:-1,outSlope:-1}]}}}};
  const at=createBubbleMotion(ps,2,1,.5,[0,0,0],[0,0,1],0);
  assert.deepEqual(at(0),[0,0]);assert(Math.abs(at(1)[1]-6)<1e-9);assert(Math.abs(at(2)[1]-8)<1e-9);
});
test('native bubbles stay smooth and repeatable across lifetimes, frame rates and seeking',()=>{
  for(const node of nodes)for(let id=0;id<48;id++){
    const seed=Number(node.id.slice(-6))+id,r=random(seed),ps=node.particle,life=curve(ps.InitialModule.startLifetime,0,r);
    const at=createBubbleMotion(ps,life,seed,r,[.2,.4,1],[0,0,1],0);
    const end=at(life),samples=Array.from({length:181},(_,i)=>at(life*i/180));
    for(let i=1;i<samples.length;i++){
      assert(samples[i].every(Number.isFinite));
      // Compare local speed, converted by the authored 50x transform. At 60 FPS
      // the authored short initial impulse stays below 8 screen pixels/frame.
      const speed=Math.hypot(...samples[i].map((v,j)=>v-samples[i-1][j]))/(life/180)*50;
      assert(speed<480,`${node.name} seed ${seed}: ${speed}`);
    }
    // Native deceleration should keep lifetime travel local, not crossing the map.
    assert(Math.hypot(end[0]-.2,end[1]-.4)*50<220);
    for(let i=180;i>=0;i-=3)assert.deepEqual(at(life*i/180),samples[i]);
    assert.deepEqual(at(life),end);
  }
});
