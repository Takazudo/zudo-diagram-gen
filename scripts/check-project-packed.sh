#!/usr/bin/env bash
# Manager runs under heavy-guard; tarballs and destination are explicit.
set -euo pipefail
: "${ENGINE_TGZ:?Absolute packed engine archive required}"
: "${INITIALIZER_TGZ:?Absolute packed initializer archive required}"
: "${PROJECT_CHECK_OUT:?New absolute external validation directory required}"
node -e 'const p=require("node:path");for(const key of ["ENGINE_TGZ","INITIALIZER_TGZ","PROJECT_CHECK_OUT"])if(!p.isAbsolute(process.env[key]))throw Error(key+" must be absolute")'
mkdir "$PROJECT_CHECK_OUT"
mkdir "$PROJECT_CHECK_OUT/initializer"
node -e 'require("node:fs").writeFileSync(process.env.PROJECT_CHECK_OUT+"/initializer/package.json",JSON.stringify({private:true,type:"module",dependencies:{"create-zudo-diagram-gen":"file:"+process.env.INITIALIZER_TGZ}}))'
corepack pnpm --dir "$PROJECT_CHECK_OUT/initializer" install
export DIAGRAM_ENGINE_MODULE="$PROJECT_CHECK_OUT/initializer/node_modules/create-zudo-diagram-gen/src/index.mjs"
node scripts/create-public-project.mjs "$PROJECT_CHECK_OUT/project" "$ENGINE_TGZ"
corepack pnpm --dir "$PROJECT_CHECK_OUT/project" install
corepack pnpm --dir "$PROJECT_CHECK_OUT/project" check
corepack pnpm --dir "$PROJECT_CHECK_OUT/project" build
# Verify both existing supported host dialects using the same packed engine.
node "$PROJECT_CHECK_OUT/initializer/node_modules/create-zudo-diagram-gen/bin/create-zudo-diagram-gen.mjs" "$PROJECT_CHECK_OUT/single" --engine-package "$ENGINE_TGZ"
corepack pnpm --dir "$PROJECT_CHECK_OUT/single" install
corepack pnpm --dir "$PROJECT_CHECK_OUT/single" check
corepack pnpm --dir "$PROJECT_CHECK_OUT/single" build
node -e 'const fs=require("node:fs");const root=process.env.PROJECT_CHECK_OUT+"/single";const p=JSON.parse(fs.readFileSync(root+"/package.json"));p.dependencies["@takazudo/zfb"]="2.21.1";p.dependencies["@takazudo/zfb-runtime"]="2.21.1";p.dependencies.preact="10.29.2";fs.writeFileSync(root+"/package.json",JSON.stringify(p));const ts=JSON.parse(fs.readFileSync(root+"/tsconfig.json"));ts.compilerOptions.jsxImportSource="preact";fs.writeFileSync(root+"/tsconfig.json",JSON.stringify(ts))'
corepack pnpm --dir "$PROJECT_CHECK_OUT/single" install
corepack pnpm --dir "$PROJECT_CHECK_OUT/single" check
corepack pnpm --dir "$PROJECT_CHECK_OUT/single" build
# Real watcher acceptance is a separately scheduled browser job.
printf '%s\n' "Packed consumers ready: $PROJECT_CHECK_OUT/project and $PROJECT_CHECK_OUT/single"
