import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Writable} from 'node:stream';
import {createMediaHandler} from './api/media.js';
test('media serves exact GIF bytes only after the image is attached to a published post',async()=>{
 const id=randomUUID(),bytes=Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
 const state={uploads:[{id,pathname:'publishing/media/test.gif',type:'image/gif',ready:true}],posts:[]};let reads=0;
 const handler=createMediaHandler({store:{read:async()=>({state})},getBlob:async()=>{reads++;return {statusCode:200,stream:new ReadableStream({start(controller){controller.enqueue(bytes);controller.close();}})};}});
 async function call(){const chunks=[],res=new Writable({write(chunk,_encoding,done){chunks.push(chunk);done();}});res.headers={};res.setHeader=(key,value)=>res.headers[key]=value;res.status=code=>{res.statusCode=code;return res;};await handler({method:'GET',url:'/api/media?id='+id},res);return {...res,body:Buffer.concat(chunks)};}
 assert.equal((await call()).statusCode,404);assert.equal(reads,0);
 state.posts.push({media:[{id}]});const response=await call();assert.deepEqual(response.body,bytes);assert.equal(response.headers['Content-Type'],'image/gif');assert.equal(response.headers['X-Content-Type-Options'],'nosniff');
 state.posts[0].deletedAt=new Date().toISOString();assert.equal((await call()).statusCode,404);assert.equal(reads,1);delete state.posts[0].deletedAt;assert.deepEqual((await call()).body,bytes);
});
