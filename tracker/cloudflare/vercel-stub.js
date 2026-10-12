// Stands in for the Vercel packages in the Cloudflare build; the Worker passes D1 storage to every handler instead.
const unavailable=()=>{throw Error('Vercel storage is not available on Cloudflare.');};
export const get=unavailable,put=unavailable,list=unavailable,head=unavailable,del=unavailable,generateClientTokenFromReadWriteToken=unavailable,waitUntil=unavailable;
export class BlobPreconditionFailedError extends Error{}
