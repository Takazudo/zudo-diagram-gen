# Cloudflare deployment

The root zfb build produces a prerendered site in `dist/`, including `dist/404.html` from zudo-doc's 404 route. Wrangler uploads it as Workers Static Assets on the `zudo-diagram-gen` Worker. There is no SSR adapter, Pages project, or storage binding. The production site has one custom domain: `zudo-diagram-gen.zudolab.dev`.

The Worker redirects the former short page paths on that host to their `/docs/` routes: `/tones` and `/tones/` map to `/docs/tones/`, `/examples` and `/examples/` map to `/docs/examples/`, `/examples/<slug>` maps to `/docs/examples/<slug>/`, and `/workbench` and `/workbench/` map to `/docs/workbench/`. The redirects stay on the same HTTPS host and preserve query strings. Every other request goes through `env.ASSETS.fetch()`.

`assets.run_worker_first: true` remains enabled so the Worker can apply those path redirects before static asset handling. The Worker forwards unmatched requests to the asset binding, which retains the configured trailing-slash behavior and generated 404 page. Cloudflare documents the Worker-first asset pattern and confirms that `ASSETS.fetch()` applies the configured HTML and not-found handling ([asset binding](https://developers.cloudflare.com/workers/static-assets/binding/), [custom 404 routing](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)).

## Account and hostname

The active `zudolab.dev` zone is in **Takazudo@gmail.com's Account** (`367c7f51801e1f537030f93d5a5e6008`). The other account shown by `wrangler whoami` does not own this zone. The account ID is fixed in `wrangler.jsonc` so a multi-account login cannot silently choose the other one.

Before attaching the production custom domain, confirm it is not attached to another Worker and has no conflicting DNS record. Cloudflare creates DNS records for a Custom Domain and [cannot create one over an existing CNAME](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## From zero

1. Use Node 24 and pnpm 10.30.3. Run `pnpm install --frozen-lockfile`; Wrangler 4.141.0 is pinned in this repository. Authenticate locally with `pnpm exec wrangler login` and inspect `pnpm exec wrangler whoami`. Select the account above; do not put OAuth credentials in the repository.
2. Build with `pnpm build`. Check `dist/index.html` and the zudo-doc generated `dist/404.html`, then run `pnpm exec wrangler deploy --dry-run`. This validates the upload and config without changing Cloudflare.
3. Start `pnpm exec wrangler dev --local --port 8787` in one terminal. In another run `pnpm smoke:cloudflare http://127.0.0.1:8787/`. It requests the home page, getting-started guide, tones, examples, workbench, changelog, workbench JSON, a missing URL with HTTP 404, and built CSS/SVG/JS. This uses Wrangler's asset server rather than zfb preview. Also inspect the main pages in a browser before production.
4. For a non-production remote check, run `pnpm exec wrangler deploy --config wrangler.preview.jsonc`. This creates a separate `workers.dev` Worker with the same asset routing and no production custom domain. Run `pnpm smoke:cloudflare https://<preview-worker-host>/` and browser review against that URL. The preview smoke covers pages and assets; the production short-path redirects are checked against the production host. Remove the temporary Worker after the production rollout with `pnpm exec wrangler delete --config wrangler.preview.jsonc`.

## Production bootstrap and deploy

Create a Cloudflare API token scoped to the account and `zudolab.dev` zone. It needs Account → Workers Scripts → Edit, Account → Account Settings → Read, and Zone → Workers Routes → Edit. Cloudflare defines [Workers Scripts Edit as write access to Workers scripts](https://developers.cloudflare.com/fundamentals/api/reference/permissions/), so it covers the redirect handler and `ASSETS` binding. The existing Workers Routes permission covers attaching the Custom Domain. Cloudflare's current role guidance calls these Workers `Editor` and Zone `Workers Routes Write` when a deploy changes custom domains; follow the [current permission guidance](https://developers.cloudflare.com/workers/authorization/workers/) if the token is rejected. Store it as the GitHub Actions secret `CLOUDFLARE_API_TOKEN`; store the account ID above as `CLOUDFLARE_ACCOUNT_ID`. Use `gh secret set NAME` interactively. Never commit or print the token. No D1, KV, or R2 provisioning is needed.

The deploy workflow runs only after successful **push** CI on `main`, checks out the exact passing commit, and is gated by the repository Actions variable `CF_PRODUCTION_ENABLED=true`. Until that variable and both secrets exist, it does not deploy. The repository had zero Actions secrets and variables at preparation time. They were later provisioned, and [the credentialed deployment passed](https://github.com/Takazudo/zudo-diagram-gen/actions/runs/36273841196). Keep the variable enabled for subsequent green-main automatic deployments. A skipped workflow is a bootstrap gap, not a deployment.

Wrangler 4.141.0 is pinned here. In its bundled `node_modules/wrangler/wrangler-dist/cli.js`, `triggersDeploy` collects the configured custom domains and passes that list to `publishCustomDomains` (lines 159651–159765). `publishCustomDomains` sets `override_scope: true`, submits a changeset with `replace_state=true`, then sends that configured list to the custom-domain records endpoint (lines 158983–159009 and 159083–159089). With only the production host in config, a normal deploy submits it as the replacement state, so the omitted prior custom domain should be detached. This is source-level evidence for Wrangler's reconciliation behavior; it does not prove production removal. The `--dry-run` path exits before trigger publication, so production attachment state must be checked after the merged-main deploy.

For a production rollout from the reviewed, clean `main` checkout:

```bash
git rev-parse HEAD
pnpm install --frozen-lockfile
pnpm build
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler versions list
pnpm deploy:cloudflare
pnpm smoke:cloudflare https://zudo-diagram-gen.zudolab.dev/
pnpm smoke:cloudflare --redirects https://zudo-diagram-gen.zudolab.dev/
```

Record the commit, previous live version ID (if one exists), new version ID, deploy URL, and smoke output. Run `versions list` before deploying and save the previous version ID for rollback. The deploy script checks for the required `dist` HTML files and invokes the pinned Wrangler. The normal smoke allows up to 60 seconds for newly deployed assets to become available, then fails if a requested asset is still missing. If local OAuth is used, verify `wrangler whoami` is still authenticated to the account above. In CI the account secret must match the configured account ID.

If the machine-wide heavy guard cannot admit a local build, use the `site-dist` artifact from a **successful main push CI run for the exact checked-out SHA**. Check `gh run view <run-id> --json event,headSha,conclusion`, then in a clean checkout with no existing `dist` run `gh run download <run-id> --name site-dist --dir dist`. Run the same Wrangler dry-run, version capture, deploy, and smoke commands. This is a CI build result; do not record it as a local build pass.

## Rollback

If the live smoke fails, use the previous version ID captured before deploying:

```bash
pnpm rollback:cloudflare <previous-version-uuid>
pnpm smoke:cloudflare https://zudo-diagram-gen.zudolab.dev/
```

`pnpm rollback:cloudflare <version>` restores Worker code, not custom-domain attachments. To restore the retired custom domain, add it to `routes` in `wrangler.jsonc` and redeploy, or attach it in the Cloudflare dashboard. Browsers that cached the former permanent redirect from the production host may continue opening the retired hostname until that cached redirect expires.

For a first deployment there is no prior version to roll back to; investigate the failed route or disable the new custom domain through the Cloudflare dashboard with the zone owner. Never invent a version ID. See [Cloudflare rollback documentation](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/) for platform behavior.

## Sources

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [SSG and custom 404](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
- [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)
- [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
