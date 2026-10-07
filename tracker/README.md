# LowPolyWorks backend

## Publishing

The public website stays on GitHub Pages. This backend also serves the separate author workspace at `https://lowpolyworks-internal-tracker.vercel.app/author.html` and `/api/publishing`. Deploy the backend and configure owner setup before publishing the new homepage. Verify owner activation, login, a disposable post, and public feed access on the canonical backend domain; preview deployments are not trusted author origins.

Author login uses a username and password; no email inbox is needed. The initial owner username is `UnsanctionedMagic`. Required server variables are `PUBLISHING_OWNER_USERNAME`, `PUBLISHING_SESSION_SECRET` (a random secret of at least 32 characters), and `PUBLISHING_SETUP_TOKEN_HASH` (SHA-256 of a separate random setup token). Give the owner `author.html#setup=TOKEN&username=UnsanctionedMagic` through a private handoff. Only its hash goes in the hosted environment. The owner chooses their own password; activation consumes the first-owner setup opportunity. Preserve the session secret on redeployment.

The owner can create invitation links for new usernames, and add projects. Invitations expire after seven days and activate once. Authors can choose their display name and upload an icon, then publish text posts with an optional project attachment. Model uploads and updates require a full HTTPS link to the model. News cannot enqueue notifications. A stable post ID prevents duplicate publication if the request is retried.

Publishing records are stored in the existing private Blob store at `publishing/v1/state.json`. Conditional writes with ETags preserve concurrent changes; uncached reads see the latest data. Public responses include post text, display names, icons, and projects, and exclude password hashes, invitations, subscriber addresses, and throttling records. Passwords use salted scrypt hashes. Author sessions use signed, eight-hour HttpOnly Secure cookies, CSRF tokens, and the canonical author origin. Logout revokes that author's existing sessions. Login and signup throttling persists across function instances.

## Model notifications

Delivery is intentionally pending until an email service is connected. Set `RESEND_API_KEY` and `MODEL_MAIL_FROM` only after verifying the sender domain in Resend. Never put either value in the public website. Signup remains visibly closed until both variables exist. Once enabled, readers confirm by email before joining. Confirmation emails and model notifications state: new model uploads and model updates only; no news or general announcements. Every notification has an unsubscribe link.

Model publication captures only the current confirmed subscribers and queues one notification job. The author workspace sends these automatically after publishing, in batches of five. Unsent batches remain visible under Model notifications and can be resumed. Closing the workspace during delivery may leave pending batches; it does not turn them into a scheduled background job. Per-recipient Resend idempotency keys, saved receipts, and a lease prevent duplicate concurrent sends. Ambiguous failed deliveries older than 23 hours stop for review rather than sending beyond Resend's deduplication window. Later subscribers do not receive historical notifications.

Verification:

```sh
node --test tracker/events.test.js tracker/publishing.test.js tools/journal.test.mjs
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

Reports include totals, UTC daily unique-browser counts, and MDX/package clicks per model. A random UUID saved as `lowpolyworks.visitorId` in localStorage identifies the same browser on refreshes and return visits. Different browsers, devices, private sessions, or cleared storage count separately. Reports return counts rather than IDs. Usage tracking records no names, cookies, IP addresses, or fingerprints. Publishing uses author accounts, login cookies, and subscriber emails separately, as described above.

Unique counts cover events recorded after this feature was deployed. Older events remain in the page-load and download totals but cannot identify unique browsers. The report's `coverage` shows page loads with and without an ID. If browser storage is unavailable, the page load can still be recorded without adding to unique counts. Download counts measure button clicks, not completed file transfers. Browser blocking or a storage outage can leave gaps.

Localhost does not send events. Live verification uses `?tracking-test=1` before the hash route; those events are stored separately and excluded from owner reports. Repeated submissions with the same event UUID on the same day occupy one record.

The current Vercel Hobby Blob allowance is 2,000 advanced operations per month, shared across the account. Each event write and report-list request consumes an operation. If that allowance is exhausted, tracking stops until the allowance resets; site viewing and downloads still work. No paid plan was enabled. See [Vercel Blob usage and pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing).

The backend uses Node.js 24 and the pinned `@vercel/blob` SDK. Deploy the files inside this folder as the project root. When adding catalogue models, regenerate `lib/models.json` from the catalogue's `id`, `name`, and `hasPack` fields and redeploy the backend alongside the website.

```sh
node --test tracker/events.test.js
```
