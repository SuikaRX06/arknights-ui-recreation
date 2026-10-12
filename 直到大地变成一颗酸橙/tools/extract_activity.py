"""Export the verified historical activity bundle; never touch game files."""
import sys, json, re, collections, base64
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'python-deps'))
import UnityPy
from UnityPy.helpers import CompressionHelper
from UnityPy.enums.BundleFile import CompressionFlags
from vendor.lz4ak.Block import decompress_lz4ak
CompressionHelper.DECOMPRESSION_MAP[CompressionFlags.LZHAM] = decompress_lz4ak

out=Path('reference/extracted/act53side-home')
out.mkdir(parents=True,exist_ok=True)
env=UnityPy.load('reference/bundles/act53side.ab')
def binary_json(value):
    if isinstance(value, (bytes, bytearray)):
        return {'encoding':'base64','data':base64.b64encode(value).decode('ascii')}
    raise TypeError(f'Unsupported object: {type(value).__name__}')
rows=[]
for obj in env.objects:
    kind=obj.type.name
    name=re.sub(r'[^\w.\-]+','_',obj.peek_name() or kind)
    stem=f'{kind}_{name}_{obj.path_id}'
    row={'type':kind,'name':name,'id':obj.path_id}
    try:
        if kind in ('Texture2D','Sprite'):
            row['file']=stem+'.png'
            obj.parse_as_object().image.save(out/row['file'])
        else:
            row['file']=stem+'.json'
            (out/row['file']).write_text(json.dumps(obj.parse_as_dict(),ensure_ascii=False,indent=2,default=binary_json),encoding='utf-8')
        row['ok']=True
    except Exception as exc:
        row['error']=repr(exc)
    rows.append(row)
(out/'inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'container.json').write_text(json.dumps({k:v.path_id for k,v in env.container.items()},indent=2),encoding='utf-8')
print('Types:',dict(collections.Counter(r['type'] for r in rows)))
print('Errors:',sum('error' in r for r in rows),'/',len(rows))
