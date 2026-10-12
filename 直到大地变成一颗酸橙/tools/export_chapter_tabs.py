"""Export the original chapter button states and RectTransform geometry."""
import json, shutil, hashlib
from pathlib import Path
source=Path('reference/extracted/act53side-home')
meta={r['id']:r for r in json.loads((source/'inventory.json').read_text(encoding='utf8'))}
cache={}
def obj(i):
    if i not in cache:cache[i]=json.loads((source/meta[i]['file']).read_text(encoding='utf8'))
    return cache[i]
def node(i,parent):
    g=obj(i);cs=[obj(c['component']['m_PathID']) for c in g['m_Component']]
    t=next(c for c in cs if 'm_Children' in c)
    a,b,p,s,v=[t[k] for k in ['m_AnchorMin','m_AnchorMax','m_Pivot','m_SizeDelta','m_AnchoredPosition']]
    pw,ph=parent['width'],parent['height']
    w=pw*(b['x']-a['x'])+s['x'];h=ph*(b['y']-a['y'])+s['y']
    x=parent['left']+pw*(a['x']+(b['x']-a['x'])*p['x'])+v['x']-w*p['x']
    y=parent['top']+ph*(1-a['y']-(b['y']-a['y'])*p['y'])-v['y']-h*(1-p['y'])
    rect=dict(left=x,top=y,width=w,height=h)
    sprite=next((c['m_Sprite']['m_PathID'] for c in cs if c.get('m_Sprite',{}).get('m_PathID')),None)
    colors=next((c['m_Colors'] for c in cs if 'm_Colors' in c),None)
    return dict(name=g['m_Name'],id=str(i),rect=rect,sprite=sprite,colors=colors,children=[node(obj(c['m_PathID'])['m_GameObject']['m_PathID'],rect) for c in t['m_Children']])
tree=node(8978859474534415364,dict(left=0,top=0,width=1280,height=720))
dest=Path('assets/native/chapters');dest.mkdir(exist_ok=True)
def export(n):
    r=meta[n['sprite']];p=dest/(r['name']+'.png');shutil.copyfile(source/r['file'],p)
    return dict(id=str(n['sprite']),name=r['name'],source=r['file'],url=p.as_posix(),rect=n['rect'],sha256=hashlib.sha256(p.read_bytes()).hexdigest())
tabs=[]
for route,g in zip(['normal','ex','s'],tree['children'][1:]):
    normal=next(n for n in g['children'] if n['name']=='panel_normal')
    regular=next(n for n in normal['children'] if n['name']=='img_normal')
    hotspot=next(n for n in normal['children'] if n['name']=='hot_spot')
    selected=next(n for n in g['children'] if n['name']=='img_selected')
    tabs.append(dict(route=route,normal=export(regular),selected=export(selected),hit=hotspot['rect'],colors=hotspot['colors']))
data=dict(coordinates=dict(width=1280,height=720),background=export(tree['children'][0]),tabs=tabs)
Path('assets/native/chapters/layout.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
Path('reference/chapter-tabs-native.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(data,ensure_ascii=False))
