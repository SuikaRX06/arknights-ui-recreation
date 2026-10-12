import json,pathlib
p=pathlib.Path('reference/extracted/act53side-home')
i=json.loads((p/'inventory.json').read_text())
o={x['id']:json.loads((p/x['file']).read_text()) for x in i if x['file'].endswith('.json')}
def ref(v): return o.get(v.get('m_PathID',0),{})
def walk(go,depth=0):
 cs=[ref(c['component']) for c in go.get('m_Component',[])]; tr=next((c for c in cs if 'm_Children'in c),{})
 print('  '*depth,go.get('m_Name'),go.get('m_IsActive'),{k:tr.get(k) for k in ['m_AnchorMin','m_AnchorMax','m_AnchoredPosition','m_SizeDelta','m_Pivot']},[(c.get('m_Sprite'),c.get('m_Texture'),c.get('m_Text')) for c in cs if 'm_Sprite'in c or 'm_Texture'in c or 'm_Text'in c])
 if depth<2:
  for ch in tr.get('m_Children',[]): walk(ref(ref(ch).get('m_GameObject',{})),depth+1)
walk(o[-379584816170910716])
for id in [786300989790871309,-2588646459264999432]: walk(o[id])
