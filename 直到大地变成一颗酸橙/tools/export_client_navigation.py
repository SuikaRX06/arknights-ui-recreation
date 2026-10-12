"""Export the client's original navigation sprites/font and their provenance."""
exec(open('tools/extract_activity.py', encoding='utf8').read().split('out=Path')[0])
import hashlib
source=Path(r'E:\Hypergryph Launcher\games\Arknights\Arknights_Data\sharedassets1.assets')
env=UnityPy.load(str(source))
objects={o.path_id:o for o in env.objects}
dest=Path('assets/native/navigation');dest.mkdir(exist_ok=True)
rows=[]
for oid in [448,638,357]:
    obj=objects[oid]; data=obj.read(); name=obj.peek_name()
    if obj.type.name=='Font':
        path=Path('assets/fonts/NotoSansHans-Medium.otf');path.write_bytes(bytes(data.m_FontData))
    else:
        path=dest/(name+'.png');data.image.save(path)
    raw=path.read_bytes()
    rows.append(dict(source=str(source),id=str(oid),type=obj.type.name,name=name,path=path.as_posix(),bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest()))

def tree(oid):
    g=objects[oid].read_typetree()
    components=[]
    for r in g['m_Component']:
        if r['component']['m_FileID']!=0:continue
        obj=objects[r['component']['m_PathID']]
        try:components.append(obj.read_typetree())
        except ValueError:components.append(dict(unparsedType=obj.type.name,id=str(obj.path_id)))
    tr=next((c for c in components if 'm_Children' in c),{})
    return dict(name=g['m_Name'],id=str(oid),active=g['m_IsActive'],components=components,children=[tree(objects[r['m_PathID']].read_typetree()['m_GameObject']['m_PathID']) for r in tr.get('m_Children',[])])
Path('reference/client-navigation-tree.json').write_text(json.dumps(tree(1100),ensure_ascii=False,indent=2),encoding='utf8')
Path('reference/client-navigation-resources.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(rows,ensure_ascii=False))
