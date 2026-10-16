// Marks this browser as the owner's so usage.js never sends statistics from it.
// The Vault sends the owner here on every login (and at least every few hours) and gets sent straight back,
// so the opt-out is renewed even when the browser clears site storage after a day or two.
const KEY='lowpolyworks.usageOptOut';
const VAULTS=['https://lowpolyworks-vault.lowpolyworks-internal-tracker.workers.dev','https://lowpolyworks-internal-tracker.vercel.app'];
const LOCAL=/^(localhost|127\.0\.0\.1)$/;
let saved=false;
try{localStorage.setItem(KEY,'true');localStorage.setItem(KEY+'At',new Date().toISOString());saved=localStorage.getItem(KEY)==='true';}catch{}
const status=document.querySelector('#status');
status.textContent=saved?'This browser is excluded from LowPolyWorks statistics.':'This browser blocked site storage, so the opt-out could not be saved.';
// Only return to the Vault page itself, never to an arbitrary address.
function vault(value){
 try{
  const url=new URL(value);
  const trusted=VAULTS.includes(url.origin)||LOCAL.test(url.hostname)&&/^https?:$/.test(url.protocol);
  return trusted&&url.pathname.endsWith('/vaultofsecrets.html')?url.origin+url.pathname:'';
 }catch{return '';}
}
const back=vault(new URLSearchParams(location.search).get('return')||'');
if(back)location.replace(back+'#opted-out='+(saved?'1':'0'));
