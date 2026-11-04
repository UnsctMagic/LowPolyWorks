# Cloudflare hosting

LowPolyWorks uses Cloudflare Pages Direct Upload for static files and a private R2 Standard bucket for files larger than 25 MiB. GitHub remains the source. The existing backend at `lowpolyworks-vault.lowpolyworks-internal-tracker.workers.dev` and the Vercel fallback are unchanged.

## Sources and deployment

The live site is the **root of `gh-pages`**, not `main/dist`. These trees currently differ, so deploying `main/dist` would change unrelated published content. Hosting tools live on `main`. The same workflow file must be installed on both branches: a `gh-pages` run checks out the tools from `main` and the website from `gh-pages`.

`Deploy Cloudflare Pages` runs on relevant pushes, and can be dispatched with a previous published commit as `source_ref`. It performs:

1. Hosting tests and a separate checkout of the published source.
2. SHA-256 inventory and staging; all original source assets remain untouched.
3. Validation of staged bytes, 141 model hashes, native texture dependencies, downloads and tutorial languages.
4. Synchronization of required immutable R2 objects, skipping existing matching objects. Each new upload is read back and SHA-256 checked.
5. Wrangler Direct Upload, followed by HTTP/SHA-256 checks against the resulting deployment URL.

One concurrency group serializes all deployments. Required upload, asset-validation or post-deployment verification failures fail the workflow. A failed post-deployment check is visible as a failed run; it does not silently claim success or overwrite R2 rollback assets.

Native Git integration is deliberately unused: this repository needs oversized-file synchronization before Pages deployment. Wrangler and the AWS S3 SDK are pinned in `package-lock.json`; CI uses Node 24 and `npm ci`.

## Credentials

GitHub Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`: the existing account ID.
- `CLOUDFLARE_API_TOKEN`: account-scoped token with **Cloudflare Pages / Edit**, **Workers R2 Storage / Edit**, and **Account Settings / Read**. The workflow never needs DNS, billing, email, Vercel or backend secrets.

Credentials are read only from the environment. No values belong in source. R2 S3 credentials are derived in memory using Cloudflare's documented token-ID/SHA-256 mechanism; no additional S3 keys need to be stored. The existing `MODEL_NOTIFICATIONS_TOKEN` remains unchanged.

Resources: Pages project `lowpolyworks`; R2 bucket `lowpolyworks-large-assets`; binding `LARGE_ASSETS`. The bucket has no public domain. Both Pages environments use this binding when a Function is required.

## Oversized assets and HTTP behavior

The preparer scans every deployment rather than keeping a hard-coded file list. Files over 26,214,400 bytes go to `sha256/<content-hash>/<original-relative-path>` in R2. Other files are copied into `.cloudflare-build/pages`. The per-deployment Function manifest maps the original public URL to its immutable R2 key. This preserves URLs and makes old deployments independent of later asset replacements.

Generated `_routes.json` invokes the Function only for oversized paths. If necessary, many/long paths are compacted into narrow directory routes; unrelated requests use static Pages delivery. The build refuses a catch-all `/*` rule or a Pages limit violation. The Function streams R2 bodies and supports MIME types, HEAD, ETags, conditional requests, single byte ranges, suffix ranges and HTTP 416. Unsupported/multiple ranges are served as full responses, as HTTP permits. Mutable public URLs use revalidation caching.

Multipart uploads are streamed with bounded buffers. Changed source bytes between preparation and upload abort the deployment. Old immutable objects are retained for rollback; do not remove keys used by retained deployments.

## Preview and production gate

**Production cutover requires Avner's approval.** While `CLOUDFLARE_PRODUCTION_ENABLED` is absent or not `true`, every automatic run deploys only branch `migration-preview`. The existing GitHub Pages domain is unaffected. The Pages production branch is `gh-pages`.

The backend only permits browser calls from the real public domain. Preview generation therefore changes API URLs in copied frontend files to a same-origin `/__preview-backend/api/` proxy. Only the existing public publishing/events endpoints are proxied, using the real public Origin; author cookies/credentials are never forwarded. Author login still opens the existing author site. Preview responses are marked `noindex`. Existing usage code already disables automatic tracking outside the real domain.

Production staging omits the preview proxy and URL rewrites, preserving the original frontend bytes and direct backend calls. Unit tests verify this difference. No backend CORS configuration or secret changes are necessary.

## Local commands

Use Node 24. First check out the tooling and a separate copy of the desired `gh-pages` revision. Set the two credential environment variables securely, then run from the tooling checkout:

```sh
npm ci
npm run test:hosting
node tools/cloudflare-hosting.mjs provision
node tools/cloudflare-hosting.mjs prepare --site /path/to/published-site --preview --revision <published-commit>
node tools/cloudflare-validate.mjs
npm run cloudflare:sync
npm run cloudflare:deploy
npm run cloudflare:verify
```

`provision` is idempotent and does not attach domains or change DNS. `prepare` defaults to `dist` for explicit local source experiments; the production workflow always passes the published checkout. Re-running preparation replaces only its marked build directory.

Verification hashes every oversized asset and representative complete sets of JavaScript, JSON, HTML, CSS, fonts, Wasm, MDX/MDL and ZIP files. It also checks oversized HEAD lengths, conditional 304s, byte ranges, unsatisfiable ranges and real 404s. CI preserves the source manifest, deployment ID/URL and verification record for 30 days. Browser QA additionally covers navigation, viewer rotation, textures, animations and desktop/mobile layout.

The untouched source baseline currently has stale generated-page equality failures and five existing test failures. Those are recorded in the migration report. They are not fixed by rewriting published pages as part of hosting migration; the hosting validator independently checks the actual published source and staged assets.

## Cutover after approval

1. Merge the tooling PR into `main`, then the workflow-only PR into `gh-pages`. Both still deploy previews while the gate is off.
2. Recheck that the preview uses the current `gh-pages` revision and passes verification.
3. Set repository variable `CLOUDFLARE_PRODUCTION_ENABLED=true`, then dispatch `Deploy Cloudflare Pages` with `source_ref=gh-pages` and `production=true`.
4. Verify the resulting production Pages deployment before attaching either custom domain.
5. In the Cloudflare Pages project, add `www.lowpolyworks.com`. Replace only the existing `www` website CNAME with `lowpolyworks.pages.dev` as instructed by Pages. Retain the existing intended apex-to-www behavior. If Pages also requires the apex domain, add it through Pages and redirect apex to `https://www.lowpolyworks.com`, preserving path and query.
6. Preserve all MX, TXT/SPF, DKIM, DMARC, Resend and mail-forwarding records. No email-related DNS changes are part of this migration.
7. Verify TLS, apex/www redirects, the real-domain API calls, viewer, downloads and all supported tutorial languages. Keep the GitHub Pages branch/configuration intact until the replacement is accepted.

The deployment token intentionally lacks DNS permissions. Domain changes should use the owner's Cloudflare dashboard or a separately authorized domain-scoped credential at cutover.

## Rollback

Before cutover, any failed preview leaves production untouched. To return a preview to an earlier release, dispatch the workflow with that `gh-pages` commit as `source_ref` and `production=false`; it regenerates the exact Function-to-R2 mapping. Re-run verification. Re-running the same release must upload zero matching R2 objects.

After cutover, choose a retained **production** deployment in Cloudflare Pages and use Rollback (or dispatch the workflow with the prior published commit and `production=true`). Preview deployments cannot be promoted using the Pages production-rollback API; rebuild the chosen commit without `--preview` for production. Immutable R2 keys keep old large-file bytes available. To return hosting to GitHub Pages, restore the recorded pre-cutover website DNS records and turn the Cloudflare production gate off; email records stay unchanged. Do not delete retained rollback objects.

## Limits, cost and monitoring

The initial audit found 7,128 public files (1,461,460,937 source bytes before preview URL rewrites) and nine oversized files totaling 599,034,056 bytes (571.28 MiB / 0.599 GB). A concurrent approved UV-grid publication removed those duplicate embedded-GIF modules. The current published revision `1a9eed19a` has 7,149 public files totaling 894,775,194 bytes (about 0.83 GiB), with **zero oversized files**. The earlier nine R2 objects remain available to the initial preview for rollback verification; future oversized additions are detected automatically. A production build with no oversized files emits no Function or Function routes. Pages Free allows 20,000 files and 25 MiB per static asset; ordinary static requests/bandwidth are free. Pages Functions share the account's Workers Free allowance of 100,000 requests/day, including the existing backend. Only oversized/proxy routes consume Functions requests.

R2 Standard includes 10 GB-month storage, 1 million Class A operations/month and 10 million Class B operations/month, with free Internet egress. Current asset storage is comfortably inside that allowance, so **estimated additional recurring cost is €0/year** at current usage. Beyond the allowance, published Standard prices are $0.015/GB-month, $4.50/million Class A and $0.36/million Class B. R2 is usage-billed and this is not a hard €30/year cap. No paid Pages/Workers upgrade is enabled by this setup.

Monitor Cloudflare **R2 → Metrics**, **Workers & Pages → Metrics**, and **Billing → Usage**. Watch storage growth from retained object versions and the shared daily Functions allowance. Configure owner billing notifications in the dashboard if desired; alerts do not cap spending. Before pruning R2, compare keys with every retained deployment manifest and preserve the current and previous accepted releases. The deployment never deletes bucket objects automatically.

Official references: [Direct Upload CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Function routes](https://developers.cloudflare.com/pages/functions/routing/), [R2 binding API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [token-derived S3 credentials](https://developers.cloudflare.com/r2/api/tokens/#get-s3-api-credentials-from-an-api-token), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Pages rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/).
