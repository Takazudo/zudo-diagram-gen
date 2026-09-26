import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { validateSession, loadToneCatalog } from '../packages/diagram-gen/src/model.mjs';
const entries=(await readdir('examples',{withFileTypes:true})).filter(e=>e.isDirectory());
let failed=false;
for(const entry of entries){const result=await validateSession(join('examples',entry.name));console.log(`${result.ok?'PASS':'FAIL'} ${entry.name}`,result.summary);for(const error of result.errors)console.error(error);if(!result.ok)failed=true;}
try{const data=await loadToneCatalog();console.log(`PASS tone catalog (${data.candidates.length} tones)`);}catch(error){failed=true;console.error(error.message);}
if(failed)process.exitCode=1;
