# Internal usage tracker

The website remains on GitHub Pages. This separate Vercel project stores page loads and download-button clicks in a private Blob store. Reports require the owner's secret; no statistics are shown on the website.

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

Reports include totals, UTC daily counts, and MDX/package clicks per model. They measure page loads and download starts, not unique people or completed file transfers. Tracking cannot recover earlier usage. Browser blocking or a storage outage can leave gaps. The app records no visitor identity, cookies, IP addresses, or fingerprints.

Localhost does not send events. Live verification uses `?tracking-test=1` before the hash route; those events are stored separately and excluded from owner reports. Repeated submissions with the same event UUID on the same day occupy one record.

The current Vercel Hobby Blob allowance is 2,000 advanced operations per month, shared across the account. Each event write and report-list request consumes an operation. If that allowance is exhausted, tracking stops until the allowance resets; site viewing and downloads still work. No paid plan was enabled. See [Vercel Blob usage and pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing).

The backend uses Node.js 24 and the pinned `@vercel/blob` SDK. Deploy the files inside this folder as the project root. When adding catalogue models, regenerate `lib/models.json` from the catalogue's `id`, `name`, and `hasPack` fields and redeploy the backend alongside the website.

```sh
node --test tracker/events.test.js
```
