// These sprites include the original labels, outlines and selected colors.
// Keep their authored geometry instead of rebuilding the artwork with CSS text.
export async function loadChapterTabs(nav){
  const response=await fetch('assets/native/chapters/layout.json');
  if(!response.ok)throw new Error(`Chapter artwork: ${response.status}`);
  const data=await response.json(),{width,height}=data.coordinates,pending=[];
  const place=(el,r,w=width,h=height)=>Object.assign(el.style,{
    left:r.left/w*100+'%',top:r.top/h*100+'%',width:r.width/w*100+'%',height:r.height/h*100+'%'
  });
  const artwork=(asset,className,parent,origin)=>{
    const img=new Image();img.alt='';img.className=className;img.draggable=false;img.src=asset.url;
    const r=asset.rect;
    place(img,origin?{...r,left:r.left-origin.left,top:r.top-origin.top}:r,origin?.width,origin?.height);
    parent.append(img);pending.push(img.decode());
  };
  artwork(data.background,'chapter-backdrop',nav);
  for(const tab of data.tabs){
    const button=nav.querySelector(`[data-route="${tab.route}"]`);
    place(button,tab.hit);
    artwork(tab.normal,'chapter-normal',button,tab.hit);
    artwork(tab.selected,'chapter-selected',button,tab.hit);
  }
  await Promise.all(pending);
}
