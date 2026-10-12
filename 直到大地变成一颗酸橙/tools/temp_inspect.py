import json
x=json.load(open('assets/native/scene.json',encoding='utf8'))
for t in x['clips']['act53side_map_zone1_anim']['tracks']:
 if 'm_Color.r' == t['attr']:print(t['path'],[(round(k['time'],2),round(k['value'],3)) for k in t['keys']])
