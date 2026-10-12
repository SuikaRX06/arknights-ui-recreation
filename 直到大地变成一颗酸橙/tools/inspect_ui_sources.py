"""Read client UI/font metadata only; keep the installation unchanged."""
exec(open('tools/extract_activity.py', encoding='utf8').read().split('out=Path')[0])
root = Path(r'E:\Hypergryph Launcher\games\Arknights\Arknights_Data')
paths = list(root.glob('*.assets')) + [root / 'StreamingAssets/AB/Windows' / p for p in ['ui/[uc]common.ab','arts/ui/[uc]common.ab']]
rows = []
for path in paths:
    env = UnityPy.load(str(path))
    for obj in env.objects:
        name = obj.peek_name() or ''
        if obj.type.name == 'Font' or (obj.type.name in ['GameObject','Sprite','Texture2D'] and re.search(r'back|home|topmenu|nav|font', name, re.I)):
            row = dict(source=str(path),id=str(obj.path_id),type=obj.type.name,name=name)
            rows.append(row)
out = Path('reference/client-ui-inspection.json')
out.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')

print(f"Saved {len(rows)} matching objects to {out}")
