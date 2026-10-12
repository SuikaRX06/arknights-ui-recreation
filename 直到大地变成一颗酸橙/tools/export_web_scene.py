"""Export native UI hierarchy and animation tracks; never modify source bundle."""
import json, pathlib, shutil, math
P=pathlib.Path('reference/extracted/act53side-home')
OUT=pathlib.Path('assets/native'); OUT.mkdir(parents=True,exist_ok=True)
inv=json.loads((P/'inventory.json').read_text(encoding='utf8'))
meta={r['id']:r for r in inv}
obj={r['id']:json.loads((P/r['file']).read_text(encoding='utf8')) for r in inv if r['file'].endswith('.json')}
def ref(r): return obj.get(r.get('m_PathID'),{}) if r.get('m_FileID',0)==0 else {}
images={}; materials={}
emission_meshes={}
SHARED=pathlib.Path('reference/extracted/shared-ui')
shared={r['id']:r for r in json.loads((SHARED/'inventory.json').read_text(encoding='utf8'))} if (SHARED/'inventory.json').exists() else {}
def image(r):
    mid=r.get('m_PathID',0)
    if r.get('m_FileID')==3 and str(mid) in shared:
        row=shared[str(mid)];key='shared_'+str(mid)
        if key not in images:
            shutil.copyfile(SHARED/row['file'],OUT/(key+'.png'));images[key]={'name':row['name'],'url':'assets/native/'+key+'.png'}
        return key
    if r.get('m_FileID',0) or mid not in meta or not meta[mid]['file'].endswith('.png'): return None
    key=str(mid); row=meta[mid]
    if key not in images:
        shutil.copyfile(P/row['file'],OUT/(key+'.png'));images[key]={'name':row['name'],'url':'assets/native/'+key+'.png'}
    return key
def material(r):
    key=str(r.get('m_PathID',0)); m=ref(r)
    if not m:return None
    if key not in materials:
        props=m.get('m_SavedProperties',{})
        materials[key]={'name':m.get('m_Name'),'floats':dict(props.get('m_Floats',[])), 'colors':dict(props.get('m_Colors',[])), 'textures':{k:{**v,'image':image(v['m_Texture'])} for k,v in props.get('m_TexEnvs',[])}}
    return key
def node(gid):
    g=obj[gid]; comps=[ref(x['component']) for x in g.get('m_Component',[])]
    tr=next((c for c in comps if 'm_Children' in c),{})
    d={'name':g['m_Name'],'id':str(gid),'props':{'m_IsActive':g.get('m_IsActive',1)},'children':[]}
    d['props'].update({k:v for k,v in tr.items() if k in ['m_AnchorMin','m_AnchorMax','m_AnchoredPosition','m_SizeDelta','m_Pivot','m_LocalPosition','m_LocalRotation','m_LocalScale']})
    for c in comps:
        if 'm_Alpha' in c: d['props']['m_Alpha']=c['m_Alpha']
        if 'm_Colors' in c and 'm_Interactable' in c:
            d['buttonColors']=c['m_Colors'];d['props']['m_Interactable']=c['m_Interactable']
        if '_cooldownDurationSec' in c:
            driver=ref(c.get('_statusDriver',{}))
            states={s['statusName']:s['descriptions'] for s in driver.get('_statusEntries',[])}
            cooldown=next((s['canvasGroupAlpha'] for s in states.get('cooldown',[]) if s['descriptionType']==8),1)
            d['switchSettings']={'cooldown':c['_cooldownDurationSec'],'cooldownAlpha':cooldown}
        if 'm_Sprite' in c or 'm_Texture' in c:
            d['graphic']={'image':image(c.get('m_Sprite',c.get('m_Texture',{}))), 'material':material(c.get('m_Material',{})), 'enabled':c.get('m_Enabled',1),'external':c.get('m_Sprite',{}).get('m_FileID',0)!=0}
            d['props']['m_Color']=c.get('m_Color',{'r':1,'g':1,'b':1,'a':1})
        if 'm_ShowMaskGraphic' in c: d['mask']=True;d['showMask']=c['m_ShowMaskGraphic']
        if 'm_Text' in c and isinstance(c['m_Text'],str):
            d['text']=c['m_Text'];d['font']=c.get('m_FontData',{});d['props']['m_Color']=c.get('m_Color',{})
        if '_colorMask' in c:d['stencil']={k:v for k,v in c.items() if k.startswith('_')}
        for k,v in c.items():
            if k.startswith(('_floatProperty','_colorProperty','_textureProperty')):d['props'][k]=v
        if '_targetMesh' in c:
            d['mesh']=str(c['_targetMesh']['m_PathID']);d['meshMaterial']=material(c['m_Material']);d['props']['m_Color']=c['m_Color']
        if '_mapLines' in c:
            d['mapSettings']={'drag':bool(c['_canMapDrag']),'width':c['_bindBackgroundWidth'],'lines':c['_mapLines']}
        if '_stageId' in c:d['stageId']=c['_stageId']
        if 'InitialModule' in c:
            d['particle']={k:c[k] for k in ['lengthInSec','looping','simulationSpeed','startDelay','moveWithTransform','scalingMode','InitialModule','EmissionModule','ShapeModule','VelocityModule','ColorModule','SizeModule','RotationModule','UVModule','NoiseModule','TrailModule'] if k in c}
            mesh_ref=c.get('ShapeModule',{}).get('m_Mesh',{})
            mesh_key=str(mesh_ref.get('m_PathID',0))
            mesh_file=SHARED/(mesh_key+'.mesh.json')
            if mesh_ref.get('m_FileID')==3 and mesh_file.exists():
                emission_meshes[mesh_key]=json.loads(mesh_file.read_text(encoding='utf8'))
                d['particle']['shapeMesh']=mesh_key
        if 'm_Materials' in c and 'm_RenderMode' in c:
            d['particleMaterial']=material(c['m_Materials'][0]) if c['m_Materials'] else None
        if 'm_PlayAutomatically' in c:
            clip=ref(c['m_Animation']);d['animation']=clip.get('m_Name');d['auto']=c['m_PlayAutomatically']
        if 'm_Mesh' in c: d['mesh']=str(c['m_Mesh']['m_PathID'])
    d['children']=[node(ref(r)['m_GameObject']['m_PathID']) for r in tr.get('m_Children',[])]
    return d
scenes={'home':node(-3938763839177802748),'normal':node(786300989790871309),'ex':node(-2588646459264999432),'s':node(7860835116943555472)}
clips={}
for r in inv:
    if r['type']!='AnimationClip':continue
    c=obj[r['id']]; tracks=[]
    for group,attr in [('m_PositionCurves','m_LocalPosition'),('m_ScaleCurves','m_LocalScale'),('m_RotationCurves','m_LocalRotation'),('m_EulerCurves','localEulerAnglesRaw'),('m_FloatCurves',None)]:
        for t in c.get(group,[]):
            tracks.append({'path':t['path'],'attr':attr or t['attribute'],'keys':t['curve']['m_Curve']})
    clips[c['m_Name']]={'duration':max([k['time'] for t in tracks for k in t['keys']] or [0]),'fps':c['m_SampleRate'],'tracks':tracks}
def clean(v):
    if isinstance(v,float) and not math.isfinite(v):return None
    if isinstance(v,dict):return {k:clean(x) for k,x in v.items()}
    if isinstance(v,list):return [clean(x) for x in v]
    return v
# Preserve road material even though its graphic is a custom mesh component.
for r in inv:
    if r['type']=='Material' and r['name']=='m_road':material({'m_PathID':r['id']})
(OUT/'scene.json').write_text(json.dumps(clean({'scenes':scenes,'clips':clips,'images':images,'materials':materials,'emissionMeshes':emission_meshes}),ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(json.dumps({'images':len(images),'clips':len(clips),'bytes':(OUT/'scene.json').stat().st_size}))
