import { mkdir, writeFile } from 'node:fs/promises';
import { loadSession, loadToneCatalog } from '../packages/diagram-gen/src/model.mjs';
import { renderGallery } from '../packages/diagram-gen/src/render.mjs';
await mkdir('artifacts',{recursive:true});
const data=await loadSession('examples/tone-exploration');
await writeFile('artifacts/zudo-diagram-gen-workbench.html',await renderGallery(data));
await writeFile('artifacts/zudo-diagram-gen-tone-catalog.html',await renderGallery(await loadToneCatalog()));
console.log('Exported standalone workbench and tone catalog to artifacts/.');
