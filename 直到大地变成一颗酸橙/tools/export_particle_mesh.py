"""Read the shared native emitter mesh without changing the game installation."""
exec(open('tools/extract_activity.py', encoding='utf8').read().split('out=Path')[0])
from UnityPy.helpers.MeshHelper import MeshHandler

source = Path(r'E:\Hypergryph Launcher\games\Arknights\Arknights_Data\PersistentData\Bundles\arts\ui\[uc]fxcommon.ab')
mesh_id = 3306963361407833251
env = UnityPy.load(str(source))
obj = next(o for o in env.objects if o.path_id == mesh_id)
mesh = MeshHandler(obj.read())
mesh.process()
data = {'id': str(mesh_id), 'name': obj.peek_name(), 'source': str(source),
        'vertices': mesh.m_Vertices, 'indices': mesh.m_IndexBuffer}
dest = Path('reference/extracted/shared-ui') / f'{mesh_id}.mesh.json'
dest.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
print(json.dumps({'file': str(dest), 'vertices': len(mesh.m_Vertices), 'triangles': len(mesh.m_IndexBuffer)//3}))
