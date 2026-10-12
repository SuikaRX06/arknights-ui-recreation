import test from 'node:test';
import assert from 'node:assert/strict';
import {curve,integrate,integrateKeyIntervals,colorAt,gradient,sheetFrame,noiseDisplacement} from '../particle-math.js';
import {drawParticles} from '../particles.js';
const constant=value=>({minMaxState:0,scalar:value});
const linear=(a,b)=>({m_Curve:[{time:0,value:a,inSlope:b-a,outSlope:b-a},{time:1,value:b,inSlope:b-a,outSlope:b-a}]});
const ramp={minMaxState:1,scalar:1,maxCurve:linear(0,1)};
test('TwoCurves uses one common multiplier, even when minScalar differs',()=>{
  const c={minMaxState:2,scalar:4,minScalar:99,minCurve:linear(1,1),maxCurve:linear(3,3)};
  assert.equal(curve(c,.4,.25),6);
});
test('constant acceleration integrates to half v*t, not v*t',()=>{
  assert.ok(Math.abs(integrate(ramp,1)-.5)<1e-9);
  assert.ok(Math.abs(integrate(ramp,.5)-.125)<1e-9);
  assert.equal(integrate(constant(3),2),6);
});
test('EX rotation keeps narrow authored pulses without changing accumulated angle',()=>{
  const keys=[[0,0],[.101,2],[.102,0],[1,0]].map(([time,value])=>({time,value,inSlope:null,outSlope:null}));
  const c={minMaxState:1,scalar:1,maxCurve:{m_Curve:keys}};
  assert.ok(Math.abs(integrateKeyIntervals(c,.5)-.002)<1e-12);
  assert.ok(Math.abs(integrateKeyIntervals(c,.8)-.002)<1e-12);
});
test('EX segmented integration still preserves smooth acceleration',()=>{
  assert.ok(Math.abs(integrateKeyIntervals(ramp,.5)-.125)<1e-12);
});
const g={m_NumColorKeys:2,m_NumAlphaKeys:2,ctime0:0,ctime1:65535,atime0:0,atime1:65535,key0:{r:0,g:.2,b:.4,a:0},key1:{r:1,g:.8,b:.6,a:1}};
test('Fixed gradient uses the next color key without blending',()=>{
  assert.equal(gradient({...g,m_Mode:1},.25,'r'),1);
  assert.equal(gradient({...g,m_Mode:1},0,'r'),0);
  assert.equal(gradient(g,.25,'r'),.25);
});
test('random gradient colors stay stable over lifetime for a fixed particle seed',()=>{
  const c={minMaxState:4,maxGradient:g};
  assert.deepEqual(colorAt(c,0,.25),colorAt(c,1,.25));
  assert.equal(colorAt(c,.7,.25).r,.25);
});
test('lifetime atlas curve and cycles choose frames and wrap',()=>{
  const uv={enabled:true,tilesX:4,tilesY:4,timeMode:0,frameOverTime:ramp,startFrame:constant(0),cycles:1};
  assert.equal(sheetFrame(uv,.5,2).index,4);
  assert.equal(sheetFrame({...uv,cycles:2},.5,2).index,8);
  assert.equal(sheetFrame({...uv,timeMode:2,fps:8},.5,2).index,4);
  assert.equal(sheetFrame(uv,2,2).index,0);
});
test('single-row sheet keeps its authored row',()=>{
  const uv={enabled:true,tilesX:4,tilesY:3,animationType:1,rowIndex:2,rowMode:0,frameOverTime:ramp,startFrame:constant(0)};
  assert.equal(sheetFrame(uv,.5,1).index,10);
});
test('noise is repeatable, starts at zero and honors disabled/zero strength',()=>{
  const n={enabled:true,frequency:1,octaves:2,positionAmount:constant(1),strength:constant(.1),scrollSpeed:constant(.5)};
  assert.deepEqual(noiseDisplacement(n,0,2,12),[0,0]);
  assert.deepEqual(noiseDisplacement(n,.7,2,12),noiseDisplacement(n,.7,2,12));
  assert.deepEqual(noiseDisplacement({...n,enabled:false},.7,2,12),[0,0]);
  assert.ok(noiseDisplacement({...n,strength:constant(0)},.7,2,12).every(x=>x===0));
});
test('map particles advance with scene time after leaving the home clock',()=>{
  const img={width:1,height:1};
  const renderer={time:.25,particleTime:.25,images:{sprite:img},data:{materials:{mat:{textures:{_BaseTex:{image:'sprite'}}}}},tint(){return img;}};
  const node={id:'123456',name:'flower',path:'map/flower',p:{},particleMaterial:'mat',particle:{
    looping:true,lengthInSec:5,EmissionModule:{enabled:true,rateOverTime:constant(1)},
    InitialModule:{startLifetime:constant(3),startSize:constant(1)},ShapeModule:{enabled:false}
  }};
  let count=0;const ctx={globalAlpha:1,getTransform(){return {a:1,b:0,c:0,d:1,e:0,f:0};},save(){},restore(){},translate(){},rotate(){},drawImage(){count++;}};
  drawParticles(renderer,ctx,node,100,100);assert.equal(count,1);
  count=0;renderer.time=1.25;
  drawParticles(renderer,ctx,node,100,100);assert.equal(count,2);
});
