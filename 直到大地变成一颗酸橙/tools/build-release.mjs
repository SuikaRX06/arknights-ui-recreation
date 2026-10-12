// Dependency allowlist: never copy the research workspace recursively.
import {readFile,writeFile,copyFile,mkdir,access,rename,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
if(!/^[a-z0-9-]+$/.test(pkg.name)||!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(pkg.version))throw Error('Unsafe package name or version');
const dist=path.resolve(root,'../dist'),out=path.join(dist,'直到大地变成一颗酸橙');
const files=new Set(),generated=new Map();
function add(rel){
  if(typeof rel!=='string'||rel.includes('\\')||path.isAbsolute(rel)||rel.split('/').includes('..'))throw Error(`Unsafe input: ${rel}`);
  files.add(rel);
}
async function moduleTree(rel){
  if(files.has(rel))return;add(rel);
  const source=await readFile(path.join(root,rel),'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))await moduleTree(path.posix.normalize(path.posix.join(path.posix.dirname(rel),match[1])));
}
await moduleTree('app.js');
for(const f of ['server.mjs','index.html','style.css','start-preview.cmd','README.md','README.en.md','assets/native/scene.json','assets/native/road-mesh.json','assets/native/chapters/layout.json','assets/fonts/NotoSansHans-Medium.otf','assets/fonts/NotoSansHans-NOTICE.txt','assets/fonts/Apache-2.0.txt','media/cover.jpg','media/preview.gif','media/maps.gif','media/home-street.jpg','media/home-sky.jpg','media/map-normal.jpg','media/map-ex.jpg','media/map-s.jpg'])add(f);
for(const f of ['index.html','style.css']){
  const source=await readFile(path.join(root,f),'utf8');
  for(const match of source.matchAll(/(?:src=["']|url\(["']?)(assets\/[^"')]+)["')]/g))add(match[1]);
}
let sceneText=await readFile(path.join(root,'assets/native/scene.json'),'utf8');
const scene=JSON.parse(sceneText);
for(const image of Object.values(scene.images))add(image.url);
// Provenance only: remove this machine's installation path from public metadata.
// Keep every rendering parameter and the original research file unchanged.
for(const mesh of Object.values(scene.emissionMeshes||{})){
  if(typeof mesh.source==='string'&&/^[A-Za-z]:[\\/]/.test(mesh.source))sceneText=sceneText.replace(JSON.stringify(mesh.source),JSON.stringify('Arknights client / arts/ui/[uc]fxcommon.ab'));
}
generated.set('assets/native/scene.json',sceneText);
const chapters=JSON.parse(await readFile(path.join(root,'assets/native/chapters/layout.json'),'utf8'));
add(chapters.background.url);for(const tab of chapters.tabs){add(tab.normal.url);add(tab.selected.url);}
// Public usage and rights documentation is included above.
generated.set('package.json',JSON.stringify({name:pkg.name,version:pkg.version,private:true,type:'module',description:pkg.description,license:pkg.license||'UNLICENSED',engines:{node:'>=22'},scripts:{start:'node server.mjs'}},null,2)+'\n');
try{await access(path.join(root,'LICENSE'));add('LICENSE');}catch{}
for(const f of files)await access(path.join(root,f));
await mkdir(dist,{recursive:true});
try{
  await access(out);
  const archive=path.join(root,'reference/release-preparation/previous-packages');
  await mkdir(archive,{recursive:true});
  await rename(out,path.join(archive,`${pkg.name}-${pkg.version}-${Date.now()}`));
}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(out,{recursive:true});
for(const f of [...files].sort()){const target=path.join(out,f);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,f),target);}
for(const [f,value] of generated)await writeFile(path.join(out,f),value);
const manifest=[];
for(const f of [...new Set([...files,...generated.keys()])].sort()){
  const bytes=await readFile(path.join(out,f));manifest.push({path:f,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile(path.join(out,'MANIFEST.sha256.json'),JSON.stringify({version:pkg.version,scope:'Local release candidate; third-party rights and code license are separate',files:manifest},null,2)+'\n');
console.log(JSON.stringify({output:out,files:manifest.length+1,bytes:manifest.reduce((n,f)=>n+f.bytes,0)+(await stat(path.join(out,'MANIFEST.sha256.json'))).size}));
