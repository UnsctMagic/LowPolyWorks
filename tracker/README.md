# LowPolyWorks backend

## Publishing

The public website stays on GitHub Pages. This backend also serves the separate author workspace at `https://lowpolyworks-internal-tracker.vercel.app/author.html` and `/api/publishing`. The Vault at `https://lowpolyworks-internal-tracker.vercel.app/vaultofsecrets.html` is the shared workspace for invited authors and the admin. Deploy the backend and configure owner setup before publishing the new homepage. Verify owner activation, login, a disposable post, and public feed access on the canonical backend domain; preview deployments are not trusted author origins.

Author login uses a username and password; no email inbox is needed. The initial owner username is `UnsanctionedMagic`. Required server variables are `PUBLISHING_OWNER_USERNAME`, `PUBLISHING_SESSION_SECRET` (a random secret of at least 32 characters), and `PUBLISHING_SETUP_TOKEN_HASH` (SHA-256 of a separate random setup token). Give the owner `author.html#setup=TOKEN&username=UnsanctionedMagic` through a private handoff. Only its hash goes in the hosted environment. The owner chooses their own password; activation consumes the first-owner setup opportunity. Preserve the session secret on redeployment.

The owner can create invitation links for new usernames, and add projects. Invitations expire after seven days and activate once. Authors can choose their display name and upload an icon, then publish text posts with an optional project attachment. The Vault creates unit cards directly from uploaded MDX, MDL, or ZIP files. Choose a project and, for WarhammerCraft, an army; write the description, finished-model author list, and credits yourself. The preview discovers all models in a ZIP, resolves custom textures from their folders, and generates a transparent card image with native team colour and glow. Select the displayed model to select the card image. Markdown and BBCode support links and images in the description and credits. A card contains up to 20 models, with uploads capped at 100 MB per file and ZIP expansion at 200 MB. News cannot enqueue notifications. Stable card and post IDs prevent duplicate publication if a request is retried. Authors may edit their own cards and posts. Only the existing owner is admin and may hide, show or permanently remove cards, delete or restore posts, invite accounts, manage projects, and see activity. Invitations open in the Vault.

The Vault's **Unit cards** tab lists Vault uploads and, for the admin, the original catalogue in one searchable list, grouped by army with download counts. The admin can edit an original catalogue card's name, army, description, authors, credits and credit links; the edit is stored as `modelEdits` in publishing state and applied by the website, while the model files, pictures and generated share-page metadata stay as published. **Hide** is reversible at any time. **Remove** hides the card at once and can be undone for 24 hours; the admin's next Vault visit after that deletes a Vault card, its front-page post and its private uploaded files, and permanently removes an original catalogue card from the site and the Vault (its files remain in the Git repository until removed there).

Post headers show a 48px circular avatar with a gold game-style frame. UnsanctionedMagic uses the supplied name graphic. The composer accepts up to ten PNG/JPG/WebP/GIF attachments (20 MB each), five HTTPS video links, and a poll with 2–10 choices. YouTube and Vimeo links embed; direct MP4/WebM/Ogg links use a video player; other services remain clickable video links. Avatar uploads are cropped centrally to 128px and displayed at 48px.

Only authenticated authors with valid CSRF tokens can request upload permissions. Short-lived Blob client tokens allow one upload to one generated private pathname, with the selected MIME type and size. Completion verifies Blob metadata. `/api/media` exposes only images attached to published posts; private publishing state and unpublished uploads stay inaccessible. GIFs are stored and served unchanged. The bundled client SDK comes from the existing pinned `@vercel/blob` dependency; rebuild it with `pnpm dlx esbuild@0.25.0 tracker/node_modules/@vercel/blob/dist/client.js --bundle --minify --format=esm --platform=browser --outfile=tracker/vendor/blob-client.js` from the repository root.

Polls reuse the saved `lowpolyworks.visitorId` UUID used by site statistics. Each poll accepts one vote per ID, stored as a hash with the server secret; conditional state writes reject concurrent duplicates. Public feeds expose totals and the requesting browser's choice, without voter IDs or hashes. Clearing browser storage, changing browsers, or using another device creates another ID; this is a browser-ID restriction, not verified person identity. Polls and media do not change the model-only email rules.

Publishing records are stored in the existing private Blob store at `publishing/v1/state.json`. Conditional writes with ETags preserve concurrent changes; uncached reads see the latest data. Public responses include post text, display names, icons, and projects, and exclude password hashes, invitations, subscriber addresses, and throttling records. Passwords use salted scrypt hashes. Author sessions use signed, eight-hour HttpOnly Secure cookies, CSRF tokens, and the canonical author origin. Logout revokes that author's existing sessions. Login and signup throttling persists across function instances.

## Model notifications

Readers check **Update me** directly below a model's downloads and confirm their email. Opening the email link confirms automatically and displays **Email confirmed. Update me is on.** beside the confirmed address. This follows that model and opts into all new model uploads. Updates to other existing models do not go to them. Unchecking the final model stops all model mail. A signed browser credential manages follows without exposing subscriber email addresses.

Configure `RESEND_API_KEY` and `MODEL_MAIL_FROM` (`LowPolyWorks <updates@lowpolyworks.com>`) in Production Secrets/Config. Replies to updates@lowpolyworks.com are forwarded by Cloudflare to lowpolyworksnews@gmail.com. The Resend key is Sending-only and limited to lowpolyworks.com.

The protected `POST /api/model-notifications` worker reads the public catalogue, hashes published MDX/package downloads with conditional ETag reads, and includes the Vault's published unit download hashes. Titles, credits, artwork and journal posts never trigger model mail. The first scan records the current catalogue without historical announcements. Subsequent new models notify every active, verified subscriber; changed downloads notify only that model's followers. Hidden/deleted models do not generate announcements. Restoring identical files does not generate an email.

The **Deliver model notifications** workflow checks once daily at 07:17 UTC. It scans the published catalogue, then sends one digest to each eligible subscriber. Pages deployments and Vault publications never start immediate delivery; Vault file changes only enter the retained queue. Manual workflow dispatch remains available for recovery and obeys the same per-subscriber limit.

Each subscriber must wait at least **48 hours after a successful model email** before another, including new releases. Every relevant change during that wait stays pending for the next eligible daily check. One email contains all pending new models and followed-model updates, with repeated changes to the same model combined into its latest entry. A new model that is updated before its first email remains a new-model announcement. No relevant pending changes means no email. Confirmation emails requested by readers remain separate transactional messages.

The GitHub runner completes the daily check with separate bounded Worker requests: `phase=scan` checks at most ten catalogue rows (twenty downloads, plus the catalogue on the first request), and `phase=deliver` handles one subscriber digest. Download redirects are rejected so they cannot multiply the request count. D1 saves the catalogue snapshot and scan position after each batch; no partial scan queues announcements. A different publication starts a fresh snapshot. Scan and delivery never share an invocation. Even all five D1 write attempts use at most 21 queries for scanning and 20 queries for delivery, below the Free limit of 50. The runner exits successfully when all remaining recipients are cooling down; their work stays queued.

Automatic digests use `MODEL_NOTIFICATIONS_ENABLED=true` and the same random `MODEL_NOTIFICATIONS_TOKEN` in the Worker and GitHub Actions repository secret. Run an initial baseline with delivery disabled before first enabling announcements. The public feed's `modelNotificationsEnabled` reports the production delivery setting; signup remains per-model. On transition from individual notifications, existing recipients with legacy delivery receipts receive a one-time 48-hour hold, because those receipts lack individual send timestamps. This hold is never renewed by later scans.

Private queued recipients, saved receipts, leases and Resend idempotency keys prevent duplicate sends. A digest's exact message and included job IDs are saved before sending and reused after an uncertain response, even if more releases arrive meanwhile. A successful receipt marks every included job delivered atomically with the subscriber's cooldown. Unsubscribe and uncheck are checked before sending. Known quota failures keep the releases pending for the next daily check; uncertain results older than 23 hours, legacy unresolved individual attempts, or changed subscriptions after an uncertain send stop for receipt review before another send. Every digest includes the published model pictures, model-page links, readable plain text, and an unsubscribe link. Explicit private test jobs are labeled and count toward the recipient's cooldown without changing model release records.

Verification:

```sh
node --test tracker/events.test.js tracker/publishing.test.js tracker/media.test.js tracker/unit-cards.test.js tracker/model-follows.test.js tracker/model-releases.test.js tracker/model-notification-batches.test.js
node --test tools/model-follow-ui.test.mjs tools/model-publication-changed.test.mjs
node tools/check-project.mjs
```

Tests exercise account/role boundaries, CSRF, cookie expiry and revocation, feed privacy, model links, confirmation/unsubscribe, news exclusion, publication retries, throttling, concurrent Blob writes, and the HTTP boundary using isolated state and captured mail. They do not establish live Vercel storage, actual email delivery, or browser appearance.

## Usage tracking

The website remains on GitHub Pages. This separate Vercel project stores page loads and download-button clicks with anonymous browser IDs in a private Blob store. Reports require the owner's secret; no statistics are shown on the website.

- Project: `lowpolyworks-internal-tracker` (`prj_VghEtCQusaIHeAtsUn7X1uzGHJdF`).
- Collector: `https://lowpolyworks-internal-tracker.vercel.app/api/events`.
- Private store: `lowpolyworks-usage` (`store_JWcfvchMrN9S5akl`).
- Server environment: `BLOB_READ_WRITE_TOKEN`, `USAGE_READ_TOKEN`, `TRACKING_STARTED_AT`.
- Local reader configuration: `.internal/usage-reader.json`, ignored by Git. Preserve this file; never publish its token.

When the owner asks whether people used the site, run from the repository:

```sh
node tools/report-usage.mjs
node tools/report-usage.mjs --from=2026-10-05 --to=2026-10-31
```

Reports include totals, UTC daily unique-browser counts, MDX/package clicks for every tracked model (including models with no clicks yet; clicks for models no longer listed stay as unlisted rows), and an `applications` row for MDLxL ZIP download clicks. MDLxL clicks come from the enabled LowPolyWorks application Download button; direct downloads elsewhere and FFmpeg source downloads are not included. A random UUID saved as `lowpolyworks.visitorId` in localStorage identifies the same browser on refreshes and return visits. Different browsers, devices, private sessions, or cleared storage count separately. Reports return counts rather than IDs. Usage tracking records no names, cookies, IP addresses, or fingerprints. Publishing uses author accounts, login cookies, and subscriber emails separately, as described above.

Model views record a browser opening a model page (catalogue or Vault card), at most once per model per UTC day; the once-per-day limit is kept in localStorage as `lowpolyworks.modelViews` so refreshes and revisits do not add storage writes. Reports include `totals.modelViews`, per-model `views`, and a compact `timeline` of per-day counts (`[date, kind, model, format, count]`, no browser IDs). The owner-only Vault Activity tab charts downloads and model views by day, week, month or year from that timeline, with a compact picker for army, unit and file type, and a per-unit table for the same range. Each model view is one more Blob write, so it counts toward the Blob operations allowance described below.

Country tracking stores Vercel's `x-vercel-ip-country` country code on new events, without storing IP addresses or requesting browser location. The owner-only Vault Activity tab and private report include country names, anonymous-browser counts, and each country's share of all counted browsers. Each browser is assigned its earliest available country in the reporting period, so return visits and country changes do not inflate the country total. Missing locations and older browser IDs with no new country-bearing activity appear as Unknown. VPNs and proxies may change the estimated country. Country data is encoded in new `v3` private event paths so reports still use Blob listings without reading every event; existing `v1` and `v2` records remain included.

Unique counts cover events recorded after this feature was deployed. Older events remain in the page-load and download totals but cannot identify unique browsers. The report's `coverage` shows page loads with and without an ID. If browser storage is unavailable, the page load can still be recorded without adding to unique counts. Download counts measure button clicks, not completed file transfers. Browser blocking or a storage outage can leave gaps.

Shredder's Stash, an owner-only Vault tab, shows how visitors play with Shredder: people who played with him at all, and people and counts for playing with his peeking (making him duck), catching a falling peanut, feeding him (a peanut the visitor released that he then caught; peanuts he finds himself do not count), cracking a shell, and leading him across menus with a peanut in hand. The site tallies these in the browser and sends them as one `shredder` event when a page is hidden or closed, at most four times per browser per day; later play waits for the next day's first send. The counts are encoded in the event path (`peek2.grab1.feed1.crack0.follow0`), so the report still uses Blob listings only. Opted-out browsers, the `?peanut-test` view, and localhost never tally or send.

Localhost does not send events. Live verification uses `?tracking-test=1` before the hash route; those events are stored separately and excluded from owner reports. Repeated submissions with the same event UUID on the same day occupy one record.

The current Vercel Hobby Blob allowance is 2,000 advanced operations per month, shared across the account. Each event write and report-list request consumes an operation. If that allowance is exhausted, tracking stops until the allowance resets; site viewing and downloads still work. No paid plan was enabled. See [Vercel Blob usage and pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing).

The backend uses Node.js 24 and the pinned `@vercel/blob` SDK. Deploy the files inside this folder as the project root. Model download events and reports combine published unit cards from private publishing state with the published `https://www.lowpolyworks.com/catalogue.json` directly, using each model's `id`, `name`, and `downloadPack`. Publishing a new catalogue model automatically enables its MDX and available package tracking; no separate tracker list update or redeployment is needed. If the catalogue cannot be read, model events and reports return HTTP 503 rather than using a stale list. Visits and MDLxL ZIP events do not need the catalogue.

```sh
node --test tracker/events.test.js
```

## Unit card assets

The original uploaded MDX, MDL, ZIP, and texture files retain their bytes and SHA-256 hashes. ZIP preview assets are extracted separately in private Blob storage; `/api/assets` serves only assets attached to published, undeleted cards. Draft uploads remain private. Publishing creates the unit card, project catalogue entry, and front-page post atomically, without a Git operation. The public viewer has a Model selector and normal mouse rotation. Existing static catalogue cards can be hidden or restored by the admin in the Vault.

`node tools/build-unit-upload.mjs` rebuilds the shared browser/server ZIP and model parser and copies the native preview index, army list, and Warcraft colour list. Run it after changes to those inputs. `node tools/native-texture-library.mjs [MDLxL directory] [classic archive directory]` prepares exact native BLP previews from local MPQs once, without changing model downloads. The existing catalogue and this native library serve rendering assets separately from private uploaded downloads.

Verify with `node --test tracker/unit-cards.test.js` in addition to the existing publishing/media/feed tests.

## Cloudflare Worker (live since 2026-10-12)

Since 2026-10-12 the website, the Vault and the model notification job use the Cloudflare Worker; the Vercel deployment stays untouched as a fallback. The same handlers run as the Cloudflare Worker `lowpolyworks-vault` at `https://lowpolyworks-vault.lowpolyworks-internal-tracker.workers.dev` on the Workers Free plan. `worker.js` routes `/api/publishing`, `/api/events`, `/api/report` and `/api/model-notifications` through `cloudflare/adapter.js`, which runs the Vercel-style handlers and trusts only Cloudflare's `cf-connecting-ip` and `cf-ipcountry`. The author and Vault pages are static assets; `.assetsignore` publishes only those files and `_headers` repeats the headers from `vercel.json`. `wrangler.jsonc` aliases the Vercel packages to `cloudflare/vercel-stub.js`, so any code path that still reached Vercel Blob fails loudly.

Storage is the D1 database `lowpolyworks-vault` (`migrations/0001_init.sql`). The publishing state is one row with a version column; a save only succeeds when the version is unchanged, and `mutate` retries, as the Blob ETag did. Each usage event is one row keyed by its former Blob pathname, and `lib/d1.js` aggregates reports in SQL so the CPU cost stays flat; `d1.test.js` checks the result equals `summarize()` over the same events.

Workers Free allows 10 ms CPU per request. Passwords therefore use a peppered, lighter scrypt (`v2:`; secret `PUBLISHING_PASSWORD_PEPPER`, which exists only in the Worker). An older hash still verifies once and is upgraded at that login. Uploads, `/api/media` and `/api/assets` need upload storage and wait for Workers Paid; unit files are added through Codex or Claude via git meanwhile.

Run Wrangler from `tracker/`: `pnpm dlx wrangler@4.149.0 deploy`. Secrets: `PUBLISHING_SESSION_SECRET` (the same value as Vercel, so existing unsubscribe and follow links stay valid), `PUBLISHING_SETUP_TOKEN_HASH`, `PUBLISHING_OWNER_USERNAME`, `PUBLISHING_PASSWORD_PEPPER`, `MODEL_MAIL_FROM`, `RESEND_API_KEY`, `USAGE_READ_TOKEN` and `MODEL_NOTIFICATIONS_TOKEN`. `MODEL_NOTIFICATIONS_ENABLED` is `true`; the GitHub secret `MODEL_NOTIFICATIONS_TOKEN` was replaced with the Worker's, so Vercel no longer receives the job and the two backends never both send mail. Mail needs `RESEND_API_KEY`. To copy the Vercel data again, run `BLOB_READ_WRITE_TOKEN=... node cloudflare/export-vercel.mjs <file.sql>` and then `pnpm dlx wrangler@4.149.0 d1 execute lowpolyworks-vault --remote --file <file.sql>`; it replaces the state and adds events that are not yet stored.
