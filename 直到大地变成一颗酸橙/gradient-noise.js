// Quintic gradient noise and its analytic derivatives. The curl construction
// follows Unity's documented particle-noise model; the permutation is seeded
// locally because a recording does not expose the game's random seed.
const gradients=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
function hash(x,y,z,seed){
  let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^Math.imul(seed,1274126177);
  n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;
}
const fade=t=>t*t*t*(t*(t*6-15)+10),slope=t=>30*t*t*(t-1)*(t-1);
export function perlinGradient(x,y,z,seed=0){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),px=x-ix,py=y-iy,pz=z-iz;
  const fx=fade(px),fy=fade(py),fz=fade(pz),dx=slope(px),dy=slope(py),dz=slope(pz);
  let value=0,gx=0,gy=0,gz=0;
  for(let i=0;i<8;i++){
    const cx=i&1,cy=(i>>1)&1,cz=(i>>2)&1,g=gradients[hash(ix+cx,iy+cy,iz+cz,seed)%12];
    const wx=cx?fx:1-fx,wy=cy?fy:1-fy,wz=cz?fz:1-fz;
    const dot=g[0]*(px-cx)+g[1]*(py-cy)+g[2]*(pz-cz);
    value+=dot*wx*wy*wz;
    gx+=(g[0]*wx+dot*dx*(cx?1:-1))*wy*wz;
    gy+=(g[1]*wy+dot*dy*(cy?1:-1))*wx*wz;
    gz+=(g[2]*wz+dot*dz*(cz?1:-1))*wx*wy;
  }
  return [value,gx,gy,gz];
}
export function curlNoise(x,y,z,seed=0,quality=2){
  if(quality===0){
    // Low quality uses a one-dimensional field, shared across the axes.
    const n=perlinGradient(x+y+z,0,0,seed)[0];return [n,n,n];
  }
  if(quality===1){const a=perlinGradient(x,y,0,seed);return [a[2],-a[1],0];}
  // Three potentials share lattice coordinates and interpolation weights.
  // Evaluate only the six derivatives used by curl, without intermediate arrays.
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),px=x-ix,py=y-iy,pz=z-iz;
  const fx=fade(px),fy=fade(py),fz=fade(pz),dx=slope(px),dy=slope(py),dz=slope(pz);
  let ay=0,az=0,bx=0,bz=0,cx=0,cy=0;
  for(let i=0;i<8;i++){
    const u=i&1,v=(i>>1)&1,w=(i>>2)&1,wx=u?fx:1-fx,wy=v?fy:1-fy,wz=w?fz:1-fz;
    const a=gradients[hash(ix+u,iy+v,iz+w,seed)%12],b=gradients[hash(ix+u,iy+v,iz+w,seed+1013)%12],c=gradients[hash(ix+u,iy+v,iz+w,seed+2027)%12];
    const da=a[0]*(px-u)+a[1]*(py-v)+a[2]*(pz-w),db=b[0]*(px-u)+b[1]*(py-v)+b[2]*(pz-w),dc=c[0]*(px-u)+c[1]*(py-v)+c[2]*(pz-w);
    ay+=(a[1]*wy+da*dy*(v?1:-1))*wx*wz;az+=(a[2]*wz+da*dz*(w?1:-1))*wx*wy;
    bx+=(b[0]*wx+db*dx*(u?1:-1))*wy*wz;bz+=(b[2]*wz+db*dz*(w?1:-1))*wx*wy;
    cx+=(c[0]*wx+dc*dx*(u?1:-1))*wy*wz;cy+=(c[1]*wy+dc*dy*(v?1:-1))*wx*wz;
  }
  return [cy-bz,az-cx,bx-ay];
}
