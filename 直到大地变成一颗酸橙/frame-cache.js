// Pixel storage is bounded across all materials, including animated parameters.
export class FrameCache{
  constructor(limit=32*1024*1024){this.limit=limit;this.bytes=0;this.entries=new Map();}
  get(key){const entry=this.entries.get(key);if(!entry)return;this.entries.delete(key);this.entries.set(key,entry);return entry.value;}
  set(key,value,bytes){
    const old=this.entries.get(key);if(old){this.bytes-=old.bytes;this.entries.delete(key);}
    if(bytes>this.limit)return;
    while(this.bytes+bytes>this.limit){const [first,entry]=this.entries.entries().next().value;this.entries.delete(first);this.bytes-=entry.bytes;}
    this.entries.set(key,{value,bytes});this.bytes+=bytes;
  }
}
