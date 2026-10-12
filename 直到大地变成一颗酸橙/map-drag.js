const clamp=(value,limit)=>Math.max(0,Math.min(limit,value));
// Keep the existing release easing, but anchor a new gesture to the visible map.
// Do not infer native inertia constants from unrelated ScrollRect prefabs.
export class MapDrag{
  start(id,x,pan){this.gesture={id,x,pan};}
  move(id,x,limit){const g=this.gesture;return g?.id===id?clamp(g.pan+g.x-x,limit):null;}
  end(id){if(this.gesture?.id===id)this.gesture=null;}
  cancel(){this.gesture=null;}
}
export function settlePan(pan,target,seconds){
  const next=pan+(target-pan)*(1-Math.exp(-Math.max(0,seconds)*16));
  return Math.abs(target-next)<.01?target:next;
}
