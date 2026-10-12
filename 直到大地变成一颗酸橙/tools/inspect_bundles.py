"""Read only selected local bundles; write inventory to the project reference directory."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent / 'python-deps'))
import UnityPy
from UnityPy.helpers import CompressionHelper
from UnityPy.enums.BundleFile import CompressionFlags
from vendor.lz4ak.Block import decompress_lz4ak

CompressionHelper.DECOMPRESSION_MAP[CompressionFlags.LZHAM] = decompress_lz4ak

parser = argparse.ArgumentParser()
parser.add_argument('game_data', type=Path)
parser.add_argument('--output', type=Path, default=Path('reference/local-act53-inventory.json'))
args = parser.parse_args()
base = args.game_data / 'StreamingAssets/AB/Windows'
patch = args.game_data / 'PersistentData/Bundles'
paths = sorted({p.relative_to(root).as_posix() for root in (base, patch)
                for p in root.rglob('*act53*.ab')})
result = {'unitypy': UnityPy.__version__, 'bundles': []}
for rel in paths:
    path = patch / rel if (patch / rel).is_file() else base / rel
    entry = {'path': str(path), 'relative': rel, 'bytes': path.stat().st_size,
             'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    try:
        env = UnityPy.load(str(path))
        objects = []
        for obj in env.objects:
            row = {'id': obj.path_id, 'type': obj.type.name}
            try:
                row['name'] = obj.peek_name()
            except Exception as exc:
                row['name_error'] = str(exc)
            objects.append(row)
        entry['types'] = dict(collections.Counter(o['type'] for o in objects))
        entry['objects'] = objects
        entry['container'] = list(env.container)
        print(rel, entry['types'], flush=True)
    except Exception as exc:
        entry['error'] = repr(exc)
        print(rel, entry['error'], flush=True)
    result['bundles'].append(entry)
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
