# LowPolyWorks backend

## Publishing

The public website stays on GitHub Pages. This backend also serves the separate author workspace at `https://lowpolyworks-internal-tracker.vercel.app/author.html` and `/api/publishing`. The Vault at `https://lowpolyworks-internal-tracker.vercel.app/vaultofsecrets.html` is the shared workspace for invited authors and the admin. Deploy the backend and configure owner setup before publishing the new homepage. Verify owner activation, login, a disposable post, and public feed access on the canonical backend domain; preview deployments are not trusted author origins.

Author login uses a username and password; no email inbox is needed. The initial owner username is `UnsanctionedMagic`. Required server variables are `PUBLISHING_OWNER_USERNAME`, `PUBLISHING_SESSION_SECRET` (a random secret of at least 32 characters), and `PUBLISHING_SETUP_TOKEN_HASH` (SHA-256 of a separate random setup token). Give the owner `author.html#setup=TOKEN&username=UnsanctionedMagic` through a private handoff. Only its hash goes in the hosted environment. The owner chooses their own password; activation consumes the first-owner setup opportunity. Preserve the session secret on redeployment.

The owner can create invitation links for new usernames, and add projects. Invitations expire after seven days and activate once. Authors can choose their display name and upload an icon, then publish text posts with an optional project attachment. The Vault creates unit cards directly from uploaded MDX, MDL, or ZIP files. Choose a project and, for WarhammerCraft, an army; write the description, finished-model author list, and credits yourself. The preview discovers all models in a ZIP, resolves custom textures from their folders, and generates a transparent card image with native team colour and glow. Select the displayed model to select the card image. Markdown and BBCode support links and images in the description and credits. A card contains up to 20 models, with uploads capped at 100 MB per file and ZIP expansion at 200 MB. News cannot enqueue notifications. Stable card and post IDs prevent duplicate publication if a request is retried. Authors may edit their own cards and posts. Only the existing owner is admin and may delete or restore cards or posts, invite accounts, manage projects, and see activity. Invitations open in the Vault.

Post headers show a 48px circular avatar with a gold game-style frame. UnsanctionedMagic uses the supplied name graphic. The composer accepts up to ten PNG/JPG/WebP/GIF attachments (20 MB each), five HTTPS video links, and a poll with 2–10 choices. YouTube and Vimeo links embed; direct MP4/WebM/Ogg links use a video player; other services remain clickable video links. Avatar uploads are cropped centrally to 128px and displayed at 48px.

Only authenticated authors with valid CSRF tokens can request upload permissions. Short-lived Blob client tokens allow one upload to one generated private pathname, with the selected MIME type and size. Completion verifies Blob metadata. `/api/media` exposes only images attached to published posts; private publishing state and unpublished uploads stay inaccessible. GIFs are stored and served unchanged. The bundled client SDK comes from the existing pinned `@vercel/blob` dependency; rebuild it with `pnpm dlx esbuild@0.25.0 tracker/node_modules/@vercel/blob/dist/client.js --bundle --minify --format=esm --platform=browser --outfile=tracker/vendor/blob-client.js` from the repository root.

Polls reuse the saved `lowpolyworks.visitorId` UUID used by site statistics. Each poll accepts one vote per ID, stored as a hash with the server secret; conditional state writes reject concurrent duplicates. Public feeds expose totals and the requesting browser's choice, without voter IDs or hashes. Clearing browser storage, changing browsers, or using another device creates another ID; this is a browser-ID restriction, not verified person identity. Polls and media do not change the model-only email rules.

Publishing records are stored in the existing private Blob store at `publishing/v1/state.json`. Conditional writes with ETags preserve concurrent changes; uncached reads see the latest data. Public responses include post text, display names, icons, and projects, and exclude password hashes, invitations, subscriber addresses, and throttling records. Passwords use salted scrypt hashes. Author sessions use signed, eight-hour HttpOnly Secure cookies, CSRF tokens, and the canonical author origin. Logout revokes that author's existing sessions. Login and signup throttling persists across function instances.

## Model notifications

Readers check **Update me** directly below a model's downloads and confirm their email. This follows that model and opts into all new model uploads. Updates to other existing models do not go to them. Unchecking the final model stops all model mail. A signed browser credential manages follows without exposing subscriber email addresses.

Configure `RESEND_API_KEY` and `MODEL_MAIL_FROM` (`LowPolyWorks <updates@lowpolyworks.com>`) in Production Secrets/Config. Replies to updates@lowpolyworks.com are forwarded by Cloudflare to lowpolyworksnews@gmail.com. The Resend key is Sending-only and limited to lowpolyworks.com.

The protected `POST /api/model-notifications` worker reads the public catalogue, hashes published MDX/package downloads with conditional ETag reads, and includes the Vault's published unit download hashes. Titles, credits, artwork and journal posts never trigger model mail. The first scan records the current catalogue without historical announcements. Subsequent new models notify every active, verified subscriber; changed downloads notify only that model's followers. Hidden/deleted models do not generate announcements. Restoring identical files does not generate an email.

Automatic model announcement delivery is disabled at the owner's request. Leave `MODEL_NOTIFICATIONS_ENABLED` unset and do not create a worker token or activate a schedule. Confirmation emails remain enabled independently. The protected worker and recipient rules are prepared, but no model announcements are sent.

For a separately approved activation, store the same random `MODEL_NOTIFICATIONS_TOKEN` as a Vercel Production Secret and a GitHub Actions repository secret, publish the prepared delivery workflow, and run the initial baseline before setting `MODEL_NOTIFICATIONS_ENABLED=true`. Delivery can then run without an open author workspace. Private queued recipients, saved receipts, leases and Resend idempotency keys prevent duplicate sends. Unsubscribe and uncheck are checked again before sending. Known quota failures remain queued for later runs; ambiguous results older than 23 hours stop for review. Every model email includes an unsubscribe link.

Verification:

```sh
node --test tracker/events.test.js tracker/publishing.test.js tracker/media.test.js tracker/unit-cards.test.js tracker/model-follows.test.js tracker/model-releases.test.js
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

Reports include totals, UTC daily unique-browser counts, MDX/package clicks per model, and an `applications` row for MDLxL ZIP download clicks. MDLxL clicks come from the enabled LowPolyWorks application Download button; direct downloads elsewhere and FFmpeg source downloads are not included. A random UUID saved as `lowpolyworks.visitorId` in localStorage identifies the same browser on refreshes and return visits. Different browsers, devices, private sessions, or cleared storage count separately. Reports return counts rather than IDs. Usage tracking records no names, cookies, IP addresses, or fingerprints. Publishing uses author accounts, login cookies, and subscriber emails separately, as described above.

Unique counts cover events recorded after this feature was deployed. Older events remain in the page-load and download totals but cannot identify unique browsers. The report's `coverage` shows page loads with and without an ID. If browser storage is unavailable, the page load can still be recorded without adding to unique counts. Download counts measure button clicks, not completed file transfers. Browser blocking or a storage outage can leave gaps.

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
