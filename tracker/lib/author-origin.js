// The Cloudflare Worker sets AUTHOR_ORIGIN to its own address; Vercel keeps the original.
export const AUTHOR_ORIGIN=globalThis.process?.env?.AUTHOR_ORIGIN||'https://lowpolyworks-internal-tracker.vercel.app';
