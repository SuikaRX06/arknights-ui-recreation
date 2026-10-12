"""Export selected KV art and animation data without modifying game files."""
import sys, json, re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'python-deps'))
import UnityPy
from UnityPy.helpers import CompressionHelper
from UnityPy.enums.BundleFile import CompressionFlags
from vendor.lz4ak.Block import decompress_lz4ak
CompressionHelper.DECOMPRESSION_MAP[CompressionFlags.LZHAM] = decompress_lz4ak

inventory=json.loads(Path('reference/local-act53-inventory.json').read_text(encoding='utf-8'))
for bundle in inventory['bundles']:
    if not bundle['relative'].startswith('avg/animatedkv/'):
        continue
    out=Path('reference/extracted') / Path(bundle['path']).stem
    out.mkdir(parents=True, exist_ok=True)
    env=UnityPy.load(bundle['path'])
    rows=[]
    for obj in env.objects:
        kind=obj.type.name
        if kind not in ('Texture2D','Sprite','TextAsset','AnimationClip','Material','MonoBehaviour'):
            continue
        name=re.sub(r'[^\w.\-]+','_',obj.peek_name() or kind)
        stem=f'{kind}_{name}_{obj.path_id}'
        try:
            if kind in ('Texture2D','Sprite'):
                obj.parse_as_object().image.save(out / (stem+'.png'))
            elif kind=='TextAsset':
                data=obj.parse_as_object().m_Script
                (out / (stem+'.bytes')).write_bytes(data.encode('utf-8','surrogateescape') if isinstance(data,str) else data)
            else:
                (out / (stem+'.json')).write_text(json.dumps(obj.parse_as_dict(), ensure_ascii=False, indent=2),encoding='utf-8')
            rows.append({'type':kind,'name':name,'id':obj.path_id,'ok':True})
        except Exception as exc:
            rows.append({'type':kind,'name':name,'id':obj.path_id,'error':repr(exc)})
    (out/'export-log.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    print(out, len(rows), 'objects,',sum('error' in r for r in rows),'errors')
