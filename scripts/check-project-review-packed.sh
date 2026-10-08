#!/usr/bin/env bash
# Run under heavy-guard. Engine package must already be packed from reviewed sources.
set -euo pipefail
: "${ENGINE_TGZ:?Absolute engine archive required}"
: "${PROJECT_REVIEW_OUT:?New absolute external validation directory required}"
node -e 'const p=require("node:path");for(const key of ["ENGINE_TGZ","PROJECT_REVIEW_OUT"])if(!p.isAbsolute(process.env[key]))throw Error(key+" must be absolute")'
mkdir "$PROJECT_REVIEW_OUT"
mkdir "$PROJECT_REVIEW_OUT/loader"
node -e 'require("node:fs").writeFileSync(process.env.PROJECT_REVIEW_OUT+"/loader/package.json",JSON.stringify({private:true,type:"module",dependencies:{"@takazudo/zudo-diagram-gen":"file:"+process.env.ENGINE_TGZ,"@takazudo/zfb":"3.2.0","@takazudo/zfb-runtime":"3.2.0"}}))'
corepack pnpm --dir "$PROJECT_REVIEW_OUT/loader" install
export DIAGRAM_ENGINE_MODULE="$PROJECT_REVIEW_OUT/loader/node_modules/@takazudo/zudo-diagram-gen/src/index.mjs"
node scripts/create-review-project.mjs "$PROJECT_REVIEW_OUT/project" "$ENGINE_TGZ"
corepack pnpm --dir "$PROJECT_REVIEW_OUT/project" install
corepack pnpm --dir "$PROJECT_REVIEW_OUT/project" check
corepack pnpm --dir "$PROJECT_REVIEW_OUT/project" build
node "$PROJECT_REVIEW_OUT/project/node_modules/@takazudo/zudo-diagram-gen/src/cli.mjs" export-html "$PROJECT_REVIEW_OUT/project" --out "$PROJECT_REVIEW_OUT/combined.html" --json
node "$PROJECT_REVIEW_OUT/project/node_modules/@takazudo/zudo-diagram-gen/src/cli.mjs" export-html "$PROJECT_REVIEW_OUT/project/sessions/reservation-flow" --out "$PROJECT_REVIEW_OUT/single.html" --json
mkdir "$PROJECT_REVIEW_OUT/detached"
cp "$PROJECT_REVIEW_OUT/combined.html" "$PROJECT_REVIEW_OUT/detached/combined.html"
cp "$PROJECT_REVIEW_OUT/single.html" "$PROJECT_REVIEW_OUT/detached/single.html"
# Acceptance runs the detached copy after source is temporarily moved by the manager or CI.
printf '%s\n' "Preview host: $PROJECT_REVIEW_OUT/project" "Portable artifacts: $PROJECT_REVIEW_OUT/detached"
