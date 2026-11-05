# Cloudflare hosting

The website is deployed to Cloudflare Pages; files over 25 MiB use private R2 Standard storage. The existing Cloudflare publishing/usage backend and Vercel fallback are unchanged. GitHub remains the source.

## Source and automatic deployment

Deploy the **root of `gh-pages`**, which is the published website. Do not substitute `main/dist`: those trees differ. Hosting tools live on `main`; the workflow-only companion PR installs the trigger on `gh-pages`. Merge the tooling PR first.

`Deploy Cloudflare Pages` validates source/staged SHA-256 hashes, models and texture references; synchronizes required R2 objects; deploys with pinned Wrangler; then verifies the deployment over HTTPS. It runs on relevant pushes and after the existing model-tag refresh job, including tag commits made with `GITHUB_TOKEN`. One concurrency group serializes releases. Upload, validation and verification failures fail the run. Existing notification/tag jobs are preserved.

The workflow also accepts a published commit as `source_ref` for reproducible rollback. Node 24 and `npm ci` use the pinned lockfile. Direct Upload is required because R2 synchronization must finish before deployment. CI retains manifests and verification records for 30 days.

## Credentials and resources

Actions secrets: `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. Scope the token to this account with **Cloudflare Pages / Edit**, **Workers R2 Storage / Edit**, and **Account Settings / Read**. No DNS, billing, Vercel or backend secrets are needed for deployment. Token values stay out of source; Cloudflare's documented token-ID/SHA-256 mechanism derives S3 credentials in memory.

Pages project: `lowpolyworks`. Private bucket: `lowpolyworks-large-assets`. Function binding: `LARGE_ASSETS`. `provision` creates missing resources idempotently and never attaches domains or changes DNS.

## Oversized assets and previews

Every build scans all files. Assets larger than 26,214,400 bytes go to immutable `sha256/<hash>/<original-relative-path>` keys. Existing matching objects are skipped; new streamed multipart uploads are read back and SHA-256 checked. Original repository assets are never rewritten. The per-release manifest preserves public URLs and prevents later uploads from altering earlier releases.

Generated Function routes cover oversized paths only; long/many paths are compacted into narrow directory routes. A catch-all `/*` route or a Pages limit violation aborts preparation. R2 responses stream with correct MIME, HEAD, ETag/conditional requests, revalidation caching and single/open/suffix byte ranges. Unsupported multiple ranges return the full representation. Retain keys used by rollback deployments.

Preview copies replace public backend API URLs with a same-origin proxy because the existing backend allows only the real public domain. Only publishing/events endpoints are proxied; author credentials/cookies are not forwarded. Preview responses are `noindex`, and existing usage code disables automatic tracking outside the real domain. Production builds retain original frontend bytes and direct backend calls. When there are no oversized files, production emits no Function or Function routes.

## Commands

Check out the tools and a separate copy of the desired published revision. Set the credential environment variables securely, then run:

```sh
npm ci
npm run test:hosting
node tools/cloudflare-hosting.mjs provision
node tools/cloudflare-hosting.mjs prepare --site /path/to/published-site --preview --revision <commit>
node tools/cloudflare-validate.mjs
npm run cloudflare:sync
npm run cloudflare:deploy
npm run cloudflare:verify
```

For an approved production build omit `--preview` and deploy with `--branch gh-pages`. Normal automatic runs remain previews until repository variable `CLOUDFLARE_PRODUCTION_ENABLED=true`; a manual production dispatch additionally requires `production=true`. **Do not enable this gate before Avner approves cutover.**

Verification hashes every oversized file and complete relevant sets of JS, JSON, HTML, CSS, fonts, Wasm, MDX/MDL and ZIP assets. Oversized HEAD, conditional 304 and range behavior is checked when those assets exist. Browser QA covers rendering, mouse rotation, downloads, API behavior, navigation and all seven tutorial languages. The existing full tool-test suite has five baseline failures; the separate hosting suite passes 13 tests and backend suite passes 113. The project check passes with LF text reads. See the migration report for evidence and test limitations.

## Cutover after approval

1. Merge the tooling PR into `main`, then the workflow-only PR into `gh-pages`. Recheck the newest preview.
2. Enable the production gate and dispatch with `source_ref=gh-pages`, `production=true`. Verify the resulting Pages deployment before domain changes.
3. Record current website DNS for rollback. Add both `www.lowpolyworks.com` and `lowpolyworks.com` through Pages, then replace only their website A/AAAA/CNAME records with the Pages targets (`lowpolyworks.pages.dev`, with apex CNAME flattening).
4. Move apex-to-www redirection into Cloudflare: host `lowpolyworks.com`, target `concat("https://www.lowpolyworks.com", http.request.uri.path)`, status 301, preserve query string. Preserve HTTPS enforcement. Neither hostname should continue depending on GitHub hosting.
5. Preserve every MX, TXT/SPF, DKIM, DMARC, Resend and mail-forwarding record. Verify TLS, redirects and full functionality on the real domain. Keep GitHub Pages configuration until acceptance.

The deployment token lacks DNS/rule permissions. Use the owner's dashboard or separately authorized domain-scoped credentials for cutover.

## Rollback, cost and monitoring

Before cutover, preview failures leave production untouched. Dispatch an earlier published commit with `production=false` to rebuild its preview and immutable asset mapping. After cutover, roll back to a retained **production** deployment in Pages, or rebuild the previous published commit with `production=true`. Pages cannot promote a preview using its production-rollback API. To return hosting to GitHub, restore the recorded website DNS and turn the production gate off; email records stay unchanged.

Audit on 2026-11-05: approximately 0.83 GiB / 7,150 public files, with no oversized assets after a separately approved duplicate-GIF cleanup. The initial nine oversized files totaled 599,034,056 bytes; they were uploaded and tested, and remain in R2 for the earlier preview/rollback. Future oversized additions are handled automatically.

Expected additional recurring cost is **€0/year within free allowances**. Pages Free allows 20,000 files, 25 MiB per asset and free static requests/bandwidth. Functions share the account's 100,000 Workers Free requests/day with the existing backend. R2 Standard includes 10 GB-month, 1 million Class A and 10 million Class B operations/month, with free egress. Beyond that: $0.015/GB-month, $4.50/million Class A and $0.36/million Class B. R2 is usage-billed; this is not a hard €30/year cap. No paid Pages/Workers upgrade is enabled.

Monitor R2 Metrics, Workers & Pages Metrics, and Billing Usage. Watch retained-version storage and the shared daily Functions allowance. Billing alerts do not cap charges. Never prune keys referenced by retained deployment manifests; preserve current and previous accepted releases. The deployment never deletes R2 objects automatically.

References: [Direct Upload CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Function routes](https://developers.cloudflare.com/pages/functions/routing/), [R2 API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [S3 credentials](https://developers.cloudflare.com/r2/api/tokens/#get-s3-api-credentials-from-an-api-token), [pricing](https://developers.cloudflare.com/r2/pricing/), [rollback](https://developers.cloudflare.com/pages/configuration/rollbacks/), [apex-to-www](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-root-to-www/).
