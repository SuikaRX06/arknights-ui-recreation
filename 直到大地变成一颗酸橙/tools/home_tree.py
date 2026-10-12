import json,pathlib,collections
p=pathlib.Path('reference/extracted/act53side-home'); inv=json.loads((p/'inventory.json').read_text()); objs={r['id']:json.loads((p/r['file']).read_text()) for r in inv if r['file'].endswith('.json')}; meta={r['id']:r for r in inv}
def get(r): return objs.get(r.get('m_PathID'),{})
def walk(gid,path='',depth=0):
 g=objs[gid]; cs=[get(c['component']) for c in g.get('m_Component',[])]; t=next((c for c in cs if 'm_Children' in c),{}); path=path+'/'+g['m_Name']
 if 'panel_act53side_entry' in path:
  print(path.replace('/act53side_activity_stage/panel_act53side_entry','HOME'), 'OFF' if not g['m_IsActive'] else '',[(meta.get(c.get('m_Sprite',{}).get('m_PathID'),{}).get('name'), c.get('m_Color')) for c in cs if 'm_Sprite' in c])
 for r in t.get('m_Children',[]): walk(get(r)['m_GameObject']['m_PathID'],path,depth+1)
walk(-379584816170910716)
