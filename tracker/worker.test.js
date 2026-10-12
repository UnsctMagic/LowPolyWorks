import test from 'node:test';
import assert from 'node:assert/strict';
import {runVercelHandler} from './cloudflare/adapter.js';

test('the Worker adapter passes Cloudflare client details and returns the handler response',async()=>{
 let seen;
 const handler=async(req,res)=>{seen=req;res.setHeader('Set-Cookie','lpw_session=x; Path=/api/publishing');res.status(201).json({ok:true});};
 const response=await runVercelHandler(handler,new Request('https://worker.example/api/publishing?action=login',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':'6.6.6.6','X-Vercel-IP-Country':'AQ','CF-Connecting-IP':'1.2.3.4','CF-IPCountry':'NL'},body:'{"username":"a"}'}));
 assert.equal(seen.url,'/api/publishing?action=login');assert.deepEqual(seen.body,{username:'a'});
 assert.equal(seen.headers['x-forwarded-for'],'1.2.3.4');assert.equal(seen.headers['x-vercel-ip-country'],'NL');
 assert.equal(response.status,201);assert.deepEqual(await response.json(),{ok:true});
 assert.equal(response.headers.get('set-cookie'),'lpw_session=x; Path=/api/publishing');assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
});
test('the Worker adapter keeps malformed JSON as text and rejects oversized bodies',async()=>{
 let body;const handler=async(req,res)=>{body=req.body;res.status(204).end();};
 assert.equal((await runVercelHandler(handler,new Request('https://worker.example/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:'{oops'}))).status,204);assert.equal(body,'{oops');
 assert.equal((await runVercelHandler(handler,new Request('https://worker.example/api/events',{method:'POST',body:'x'.repeat(20)}),{maxBody:10})).status,413);
});
