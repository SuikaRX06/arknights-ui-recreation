// Refresh derived-file hashes only. Original bundle identity/provenance is kept.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),target=path.join(root,'reference/resource-register.json');
const register=JSON.parse(readFileSync(target,'utf8'));
const extra=[
  ...readdirSync(root).filter(p=>/\.(js|mjs|html|css)$/.test(p)),
  ...readdirSync(path.join(root,'tests')).filter(p=>p.endsWith('.mjs')).map(p=>'tests/'+p),
  'package.json','README.en.md','README.md','reference/document-history/AUDIT.md','reference/document-history/VALIDATION.md','reference/document-history/REFERENCE.md',
  '.gitignore','LICENSE','reference/document-history/CHANGELOG.md','reference/document-history/KNOWN_ISSUES.md','reference/document-history/LICENSE-STATUS.md','reference/document-history/RELEASE_VALIDATION.md',
  'assets/fonts/Apache-2.0.txt','assets/fonts/NotoSansHans-NOTICE.txt',
  'tools/build-release.mjs','tools/capture-release-media.mjs','tools/verify-release.mjs',
  'media/cover.jpg','media/preview.gif','media/preview.webm',
  'reference/release-preparation/validation.json','reference/release-preparation/media-capture.json',
  'reference/document-history/RELEASE_PREPARATION.md','tools/verify-final-package.mjs',
  'reference/release-preparation/final-package.json','reference/release-preparation/font-license-evidence.json','reference/release-preparation/runtime-preservation.json',
  'tools/verify-bubble-fix.mjs','reference/bubble-fix/README.md','reference/bubble-fix/browser.json','reference/bubble-fix/particles-before.js',
  'tools/verify-ex-snow-fix.mjs','reference/ex-snow-fix/README.md','reference/ex-snow-fix/browser.json','reference/ex-snow-fix/particles-before.js','reference/ex-snow-fix/particle-traces-before.json','reference/ex-snow-fix/particle-traces-after.json','tests/fixtures/ex-snow-baseline.json',
  'tools/benchmark-scene.mjs','tools/verify-browser-performance.mjs','tools/verify-browser-soak.mjs','tools/profile-frame.mjs','tools/diagnose-map-cost.mjs','tools/update-resource-register.mjs',
  'reference/performance-2026-10-08.md','reference/performance-2026-10-09.md',
  'reference/cpu-animation-benchmark.json','reference/browser-performance.json','reference/browser-soak.json',
  'reference/performance-before-ribbon-optimization.json','reference/performance-before-atlas-cache.json','reference/soak-before-atlas-cache.json',
  'reference/map-cost-isolation.json','reference/map-active-materials.json',
  'reference/native-map-controller-metadata.json','reference/native-map-motion-evidence.json','reference/native-map-drag-config.json'
  ,'reference/road-entry-rollback-2026-10-09.md','reference/road-noise-before-curl.mjs','reference/road-rollback-browser.json','tests/fixtures/road-noise-baseline.json','tools/verify-road-rollback.mjs'
];
const files=new Map(register.files.map(entry=>[entry.path,entry]));
for(const name of extra)if(!files.has(name))files.set(name,{path:name});
for(const entry of files.values()){
  const bytes=readFileSync(path.join(root,entry.path));entry.bytes=bytes.length;
  for(const algorithm of ['sha256','md5'])entry[algorithm]=createHash(algorithm).update(bytes).digest('hex');
}
register.date='2026-10-09';register.status='Motion fixes and measured performance regression fixes implemented; original-frame equivalence is not claimed';
register.latestValidation='reference/road-entry-rollback-2026-10-09.md; 41 tests, 357 historical trajectory samples, scoped entry browser check; earlier performance results retained separately';
register.latestValidation+='; S-map bubble correction: reference/bubble-fix/README.md; 44 tests, 109 unchanged other-emitter samples, 16-second browser playback';
register.latestValidation+='; EX lower-left white snow rollback: reference/ex-snow-fix/README.md; 46 tests, 288 historical samples, 113 unchanged other-emitter samples';
register.releasePreparation={summary:'reference/document-history/RELEASE_PREPARATION.md',report:'reference/release-preparation/validation.json',codeLicense:'MIT; Copyright (c) 2026 orange-ui-study contributors; excludes third-party assets',originalGameResources:'Hypergryph / Arknights; original bundles preserved locally; required derived assets are not MIT-licensed'};
register.files=[...files.values()].sort((a,b)=>a.path.localeCompare(b.path));
writeFileSync(target,JSON.stringify(register,null,2)+'\n');
console.log(`Refreshed ${register.files.length} derived files; original bundle provenance retained.`);
