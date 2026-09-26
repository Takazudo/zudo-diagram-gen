import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const destination=resolve('artifacts');await mkdir(destination,{recursive:true});
for(const directory of ['packages/diagram-gen','packages/create-zudo-diagram-gen']){
 const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['pack','--json','--pack-destination',destination],{cwd:resolve(directory),encoding:'utf8'});
 if(result.status!==0){console.error(result.stderr||result.stdout);process.exit(result.status||1);}
 let files;try{files=JSON.parse(result.stdout);}catch{console.error(result.stdout);throw new Error('npm pack did not return JSON');}
 for(const file of files)console.log(`${resolve(destination,file.filename)}: ${file.entryCount} files, ${file.size} bytes`);
}
console.log('Local tarballs are ready in artifacts/. No packages were published.');
