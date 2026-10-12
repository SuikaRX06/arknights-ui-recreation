import test from 'node:test';
import assert from 'node:assert/strict';
import {perlinGradient,curlNoise} from '../gradient-noise.js';
import {noiseDisplacement} from '../particle-math.js';
const constant=value=>({scalar:value,minMaxState:0});

test('shared curl sampling preserves the three-potential result exactly',()=>{
  for(let i=0;i<1000;i++){
    const p=[i*.013-4,Math.sin(i*.73)*7,Math.cos(i*.41)*3],seed=i*17;
    const a=perlinGradient(...p,seed),b=perlinGradient(...p,seed+1013),c=perlinGradient(...p,seed+2027);
    assert.deepEqual(curlNoise(...p,seed),[c[2]-b[3],a[3]-c[1],b[1]-a[2]]);
  }
});
test('analytic gradient agrees with finite differences across cell boundaries',()=>{
  for(const p of [[.2,.7,-.3],[1,.99,2.4],[-1,0,3]]){
    const derivative=perlinGradient(...p,17);
    for(let axis=0;axis<3;axis++){
      const a=[...p],b=[...p];a[axis]+=.00001;b[axis]-=.00001;
      const numeric=(perlinGradient(...a,17)[0]-perlinGradient(...b,17)[0])/.00002;
      assert.ok(Math.abs(numeric-derivative[axis+1])<1e-7);
    }
  }
});
test('high-quality curl field is divergence free and continuous at lattice boundaries',()=>{
  let divergence=0;
  for(let axis=0;axis<3;axis++){
    const a=[.31,.62,-.93],b=[...a];a[axis]+=.00001;b[axis]-=.00001;
    divergence+=(curlNoise(...a,27)[axis]-curlNoise(...b,27)[axis])/.00002;
  }
  assert.ok(Math.abs(divergence)<1e-7);
  const a=curlNoise(.999999,.2,.3,27),b=curlNoise(1.000001,.2,.3,27);
  assert.ok(a.every((v,i)=>Math.abs(v-b[i])<.0001));
});
test('stationary particles do not drift through an unscrolled spatial noise field',()=>{
  const m={enabled:true,frequency:.5,damping:true,quality:2,positionAmount:constant(1),strength:constant(.5),scrollSpeed:constant(0)};
  const origin=[.25,.5,.75];
  assert.deepEqual(noiseDisplacement(m,2,4,17,.5,origin,origin),[0,0]);
  const at=[1,.5,.75],one=noiseDisplacement(m,1,4,17,.5,at,origin);
  const later=noiseDisplacement(m,2,4,17,.5,at,origin);
  assert.deepEqual(one,later);assert.ok(one.some(v=>Math.abs(v)>.001));
  assert.notDeepEqual(one,noiseDisplacement(m,1,4,18,.5,at,origin));
  assert.deepEqual(noiseDisplacement({...m,positionAmount:constant(0)},1,4,17,.5,at,origin),[0,0]);
});
