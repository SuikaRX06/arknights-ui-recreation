import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NativeScene,sample} from '../native-scene.js';
const source=JSON.parse(readFileSync(new URL('../assets/native/scene.json',import.meta.url)));
test('native cut keeps the old illustration until the original visibility key',()=>{
  const scene=new NativeScene(structuredClone(source),{});
  const path='panel_ui/group_bg/group_kv2';
  scene.apply('home','act53side_trans_kv1tokv2',.90);
  assert.equal(scene.scenes.home.paths.get(path).p.m_IsActive,0);
  scene.apply('home','act53side_trans_kv1tokv2',.95);
  assert.equal(scene.scenes.home.paths.get(path).p.m_IsActive,1);
});
test('the paper has a material sheet even though the sprite reference is empty',()=>{
  const scene=new NativeScene(structuredClone(source),{});
  const paper=scene.scenes.home.paths.get('panel_ui/group_bg/root_entry_trans/root_1/paper');
  assert.equal(paper.graphic.image,null);
  const mat=source.materials[paper.graphic.material];assert.ok(source.images[mat.textures._ParticleTex.image]);
  assert.equal(mat.floats._Column*mat.floats._Row,16);
  assert.equal(mat.floats._FPS,15);
});
test('removed level nodes, home UI and medal stay excluded while art switch stays',()=>{
  const scene=new NativeScene(structuredClone(source),{});
  assert.equal(scene.omitted({path:'panel_stages/a',name:'a'},'normal'),true);
  assert.equal(scene.omitted({path:'panel_ui/group_left/a',name:'a'},'home'),true);
  assert.equal(scene.omitted({path:'panel_ui/root_end_time',name:'root_end_time'},'home'),true);
  assert.equal(scene.omitted({path:'panel_ui/root_end_time/btn_medal/a',name:'a'},'home'),true);
  assert.equal(scene.omitted({path:'panel_ui/btn_switch',name:'btn_switch'},'home'),false);
});
test('step curves do not interpolate visibility or enable state',()=>{
  const keys=[{time:0,value:0},{time:1,value:1}];
  assert.equal(sample(keys,.999,true),0);assert.equal(sample(keys,1,true),1);
});
test('paper uses the native UIColor frame offset plus the animated sheet clock',()=>{
  const scene=new NativeScene(structuredClone(source),{});
  const paper=scene.scenes.home.paths.get('panel_ui/group_bg/root_entry_trans/root_1/paper');
  const id=source.materials[paper.graphic.material].textures._ParticleTex.image;
  scene.images[id]={width:260,height:260};scene.swapTime=0;
  let call;const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){call=args;}};
  scene.graphic(ctx,paper,150,100);
  // AnimSheet DXBC: min(floor(vertex.r*16),15) + time*15, rounded.
  assert.deepEqual(call.slice(1,5),[195,195,65,65]);
  scene.swapTime=.88;scene.graphic(ctx,paper,150,100);
  assert.deepEqual(call.slice(1,5),[0,195,65,65]);
});

test('switch cooldown and disabled interval use the original exported settings',()=>{
  const scene=new NativeScene(structuredClone(source),{}),button=scene.scenes.home.paths.get('panel_ui/btn_switch');
  assert.deepEqual(button.switchSettings,{cooldown:2.5,cooldownAlpha:.5});
  scene.apply('home','act53side_trans_kv1tokv2',.8);assert.equal(button.p.m_Interactable,0);
  scene.apply('home','act53side_trans_kv1tokv2',.92);assert.equal(button.p.m_Interactable,1);
});
test('map additive glows must not paint a dark rectangular background',()=>{
  const scene=new NativeScene(structuredClone(source),{});
  const node=scene.scenes.normal.paths.get('fx_screen/2');
  scene.images[node.graphic.image]={width:256,height:256};
  let blend;const ctx={globalAlpha:1,globalCompositeOperation:'source-over',save(){},restore(){},drawImage(){blend=this.globalCompositeOperation;}};
  scene.graphic(ctx,node,100,100);assert.equal(blend,'lighter');
});
test('Orange vertex red selects a sheet frame instead of tinting the artwork cyan',()=>{
  const scene=new NativeScene(structuredClone(source),{});
  const n=scene.scenes.normal.paths.get('image_background_bind/root_anim/group_orange_txt/orange_txt');
  const material=source.materials[n.graphic.material],id=material.textures._ParticleTex.image;
  scene.images[id]={width:1024,height:512};
  scene.tint=()=>{throw Error('Control red channel must not become a color tint');};
  let call;const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){call=args;}};
  for(const [red,x,y]of [[0,0,0],[.42,512,0],[.705,0,256],[1,512,256]]){
    n.p.m_Color={r:red,g:1,b:1,a:1};scene.graphic(ctx,n,512,256);
    assert.deepEqual(call.slice(1,5),[x,y,512,256]);
  }
});
