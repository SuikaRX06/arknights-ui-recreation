exec(open('tools/extract_activity.py',encoding='utf8').read().split('out=Path')[0])
paths=[Path(r'E:\Hypergryph Launcher\games\Arknights\Arknights_Data\PersistentData\Bundles\arts\ui\[uc]fxcommon.ab'),Path(r'E:\Hypergryph Launcher\games\Arknights\Arknights_Data\PersistentData\Bundles\[uc]uishaders.ab')]
needed=set()
def visit(v):
 if isinstance(v,dict):
  if v.get('m_FileID')==3:needed.add(v.get('m_PathID'))
  for val in v.values():visit(val)
 elif isinstance(v,list):
  for val in v:visit(val)
for f in Path('reference/extracted/act53side-home').glob('*.json'):visit(json.loads(f.read_text(encoding='utf8')))

out=Path('reference/extracted/shared-ui');out.mkdir(exist_ok=True)
rows=[]
for p in paths:
 print('READ',p,flush=True)
 env=UnityPy.load(str(p))
 for o in env.objects:
  if o.path_id in needed:
   print('MATCH',o.type.name,o.peek_name(),o.path_id,flush=True)
   if o.type.name in ['Texture2D','Sprite']:
    file=str(o.path_id)+'.png';o.read().image.save(out/file);rows.append({'id':str(o.path_id),'file':file,'name':o.peek_name(),'source':str(p)})
   if o.type.name=='Shader':(out/'ui-shader.txt').write_text(o.read().export(),encoding='utf8')
(out/'inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
