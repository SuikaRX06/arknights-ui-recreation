import {curve,random,clamp01} from './particle-math.js';

// Keep accepted births alive until their own death. Truncating each frame's
// candidate list would replace living particles and produce visible popping.
export function cappedRateBirths(ps,initial,now,seed,cache={}){
  const rate=Math.max(0,curve(ps.EmissionModule.rateOverTime));
  const capacity=Math.max(0,Math.floor(initial.maxNumParticles??1000));
  if(!rate||!capacity||now<0)return [];
  const signature=JSON.stringify([rate,capacity,ps.looping,ps.lengthInSec,initial.startLifetime]);
  if(cache.signature!==signature||now<cache.now){Object.assign(cache,{signature,now:-1,next:0,live:[]});}
  const last=Math.floor(now*rate+1e-8);
  while(cache.next<=last){
    const id=cache.next++,birth=id/rate;
    if(!ps.looping&&birth>=ps.lengthInSec)break;
    cache.live=cache.live.filter(p=>p.death>birth);
    if(cache.live.length>=capacity)continue;
    const phase=ps.looping?(birth%ps.lengthInSec)/ps.lengthInSec:clamp01(birth/ps.lengthInSec);
    const lifetime=Math.max(.01,curve(initial.startLifetime,phase,random(id+seed)));
    cache.live.push({birth,id,death:birth+lifetime});
  }
  cache.now=now;cache.live=cache.live.filter(p=>p.death>now);
  return cache.live.map(p=>[p.birth,p.id]);
}

const meshCache=new WeakMap();
function meshElements(mesh){
  if(meshCache.has(mesh))return meshCache.get(mesh);
  const edges=[],triangles=[],seen=new Set();let edgeTotal=0,areaTotal=0;
  const {vertices:v,indices:ix}=mesh;
  for(let i=0;i<ix.length;i+=3){
    const ids=ix.slice(i,i+3),[a,b,c]=ids.map(j=>v[j]);
    const ab=b.map((x,j)=>x-a[j]),ac=c.map((x,j)=>x-a[j]);
    const area=Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])/2;
    if(area>1e-10){areaTotal+=area;triangles.push({ids,end:areaTotal});}
    for(let j=0;j<3;j++){
      const first=ids[j],second=ids[(j+1)%3],key=[first,second].sort((a,b)=>a-b).join(':');
      if(seen.has(key))continue;seen.add(key);
      const length=Math.hypot(...v[first].map((x,k)=>x-v[second][k]));
      if(length>1e-7){edgeTotal+=length;edges.push({ids:[first,second],end:edgeTotal});}
    }
  }
  const data={edges,triangles,edgeTotal,areaTotal};meshCache.set(mesh,data);return data;
}
export function meshOrigin(mesh,mode,r1,r2,r3){
  const v=mesh?.vertices;if(!v?.length)return [0,0,0];
  if(mode===0)return [...v[Math.min(v.length-1,Math.floor(r1*v.length))]];
  const data=meshElements(mesh),list=mode===1?data.edges:data.triangles,total=mode===1?data.edgeTotal:data.areaTotal;
  if(!list.length)return [...v[0]];
  const element=list.find(e=>e.end>=r1*total)||list.at(-1),points=element.ids.map(i=>v[i]);
  if(mode===1)return points[0].map((x,k)=>x*(1-r2)+points[1][k]*r2);
  const root=Math.sqrt(r2),weights=[1-root,root*(1-r3),root*r3];
  return [0,1,2].map(k=>points.reduce((sum,p,i)=>sum+p[k]*weights[i],0));
}
