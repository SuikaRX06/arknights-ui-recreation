exec(open('tools/inspect_hierarchy.py',encoding='utf-8-sig').read().split('walk(o[')[0])
for r in i:
 if r['type']=='GameObject' and r['name'] in ['group_bg','group_right','group_logo','bg_kv1','root_road','road','panel_entry','root_yellow','group_matte','panel_zone_group']:
  g=o[r['id']]; cs=[ref(x['component']) for x in g['m_Component']]; print('\n',r['name']); print(json.dumps(cs,ensure_ascii=False)[:2500])
