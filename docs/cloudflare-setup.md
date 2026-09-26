# Cloudflare deployment

The root zfb build produces a prerendered site in `dist/`. Wrangler uploads it as a Workers Static Assets Worker. There is no SSR adapter, Pages project, or storage binding. `pnpm build` adds `dist/404.html`; Wrangler serves it with HTTP 404 for unknown paths and redirects directory routes to trailing slashes.

## Account and hostname

Read only checks on 2026-09-27 found the active `zudolab.dev` zone (`ddb163ab74e7cd438bb2d77d462bd724`) in **Takazudo@gmail.com's Account** (`367c7f51801e1f537030f93d5a5e6008`). The other account shown by `wrangler whoami` does not own this zone. The account ID is fixed in `wrangler.jsonc` so a multi-account login cannot silently choose the other one.

The Cloudflare Workers routes and custom domains APIs returned no entry for `zudo-diagram-gen.zudolab.dev`; public DNS returned NXDOMAIN. The local OAuth token's DNS record listing request returned authentication error 10000, so a complete zone DNS inventory was **not** verified. Before production attachment, a zone administrator must inspect the exact hostname in Cloudflare DNS and confirm there is no A, AAAA, or CNAME record, plus recheck Worker routes and custom domains. Stop if it is occupied. Cloudflare [cannot create a Custom Domain over an existing CNAME](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## From zero

1. Use Node 24 and pnpm 10.30.3. Run `pnpm install --frozen-lockfile`; Wrangler 4.141.0 is pinned in this repository. Authenticate locally with `pnpm exec wrangler login` and inspect `pnpm exec wrangler whoami`. Select the account above; do not put OAuth credentials in the repository.
2. Build with `pnpm build`. Check `dist/index.html` and `dist/404.html`, then run `pnpm exec wrangler deploy --dry-run`. This validates the upload and config without changing Cloudflare.
3. Start `pnpm exec wrangler dev --local --port 8787` in one terminal. In another run `pnpm smoke:cloudflare http://127.0.0.1:8787/`. It requests home, nested docs, tones, examples, workbench, the canonical docs redirect, a missing URL with HTTP 404, and built CSS/SVG/JS. This uses Wrangler's asset server rather than zfb preview. Also inspect the main pages in a browser before production.
4. For a non-production remote check, run `pnpm exec wrangler versions upload --preview-alias docs-review` and record the preview URL printed by Wrangler. This uploads a version without promoting it to live traffic or attaching the custom domain. If no URL is printed, enable preview URLs for this Worker in the Cloudflare dashboard and retry. Run `pnpm smoke:cloudflare <preview-url>` and browser review against that URL.

The reviewed rollout should be performed from the merged `main` commit, after green CI and the hostname conflict check. `wrangler.jsonc` contains the custom domain route; **`wrangler deploy` attaches it**. Do not run the production command from a topic branch or before the root PR merge.

## Production bootstrap and deploy

Create a Cloudflare API token scoped to the account and `zudolab.dev` zone. It needs Account → Workers Scripts → Edit, Account → Account Settings → Read, and Zone → Workers Routes → Edit. Follow current Cloudflare permission guidance if the token is rejected. Store it as the GitHub Actions secret `CLOUDFLARE_API_TOKEN`; store the account ID above as `CLOUDFLARE_ACCOUNT_ID`. Use `gh secret set NAME` interactively. Never commit or print the token. No D1, KV, or R2 provisioning is needed.

The deploy workflow runs only after successful **push** CI on `main`, checks out the exact passing commit, and is gated by the repository Actions variable `CF_PRODUCTION_ENABLED=true`. Until that variable and both secrets exist, it does not deploy. The repository had zero Actions secrets and variables at preparation time. After the manager's first manual rollout and smoke check, set the variable to enable subsequent green-main automatic deployments. A skipped workflow is a bootstrap gap, not a deployment.

For the first production rollout from the reviewed, clean `main` checkout:

```bash
git rev-parse HEAD
pnpm install --frozen-lockfile
pnpm build
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler versions list
pnpm deploy:cloudflare
pnpm smoke:cloudflare https://zudo-diagram-gen.zudolab.dev/
```

Record the commit, previous live version ID (if one exists), new version ID, deploy URL, and smoke output. The deploy script checks for the required `dist` HTML files and invokes the pinned Wrangler. Its `versions list` step must be run before deployment for a rollback target. If local OAuth is used, verify `wrangler whoami` is still authenticated to the account above. In CI the account secret must match the configured account ID.

## Rollback

If the live smoke fails, use the prior version ID captured above:

```bash
pnpm rollback:cloudflare <previous-version-uuid>
pnpm smoke:cloudflare https://zudo-diagram-gen.zudolab.dev/
```

For a first deployment there is no prior version to roll back to; investigate the failed route or disable the new custom domain through the Cloudflare dashboard with the zone owner. Never invent a version ID. See [Cloudflare rollback documentation](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/) for platform behavior.

## Sources

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [SSG and custom 404](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
- [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)
- [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
