import { spawn } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { buildShowcase, projectRoot } from './build-showcase.mjs';
const require=createRequire(import.meta.url);
await buildShowcase();
async function signature(){
  const rows=[];
  async function visit(file){
    const info=await stat(file);
    if(info.isDirectory())for(const entry of await readdir(file,{withFileTypes:true})){if(!entry.isSymbolicLink())await visit(join(file,entry.name));}
    else rows.push(`${file}:${info.mtimeMs}:${info.size}`);
  }
  for(const dir of ['examples','packages/diagram-gen/tones','packages/diagram-gen/client'])await visit(join(projectRoot,dir));
  return rows.sort().join('\n');
}
let previous=await signature();let busy=false;
const timer=setInterval(async()=>{if(busy)return;busy=true;try{const next=await signature();if(next!==previous){previous=next;console.log('[diagram-gen] Preparing updated showcase');await buildShowcase();}}catch(error){console.error('[diagram-gen]',error.message);}finally{busy=false;}},800);
const binary=require.resolve('@takazudo/zfb/package.json').replace(/package\.json$/,'bin/zfb.mjs');
const child=spawn(process.execPath,[binary,'dev',...process.argv.slice(2)],{cwd:projectRoot,stdio:'inherit'});
process.on('SIGINT',()=>child.kill('SIGINT'));process.on('SIGTERM',()=>child.kill('SIGTERM'));
child.once('error',error=>{clearInterval(timer);console.error(error);process.exitCode=1;});
child.once('exit',(code,signal)=>{clearInterval(timer);process.exitCode=code??(signal==='SIGINT'?130:1);});
