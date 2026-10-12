from pathlib import Path
p=Path('native-scene.js');s=p.read_text(encoding='utf-8-sig').replace('group_top|group_left|btn_rpg|root_end_time','group_top|group_left|btn_rpg');s=s.replace("return /^(panel_topmenu", "return (n.path.startsWith('panel_ui/root_end_time/')&&!n.path.startsWith('panel_ui/root_end_time/btn_medal'))||/^(panel_topmenu");p.write_text(s,encoding='utf8')
