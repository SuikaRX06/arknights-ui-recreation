exec(open('tools/extract_activity.py',encoding='utf8').read().split('out=Path')[0])
from UnityPy.helpers.MeshHelper import MeshHandler
env=UnityPy.load('reference/bundles/act53side.ab')
for o in env.objects:
 if o.type.name=='Mesh':
  m=MeshHandler(o.read());m.process();print('verts',len(m.m_Vertices),'uv',len(m.m_UV0),'indices',len(m.m_IndexBuffer));print(m.m_Vertices[:8],m.m_UV0[:8]);Path('assets/native/road-mesh.json').write_text(json.dumps({'vertices':m.m_Vertices,'uv':m.m_UV0,'indices':m.m_IndexBuffer}),encoding='utf8')
