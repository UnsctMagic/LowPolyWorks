import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {authorIdentity,postMedia,postPoll,videoFromUrl} from '../dist/post-content.js';
test('author composer includes media and poll inputs, and sends attachment IDs and separate video URLs',()=>{
 const nodes=new Map(),app={innerHTML:'',querySelector:()=>({})};const getNode=selector=>{if(!nodes.has(selector))nodes.set(selector,{});return nodes.get(selector);};
 const context=vm.createContext({document:{querySelector:selector=>selector==='#author-app'?app:getNode(selector),getElementById:getNode},crypto:{randomUUID},URLSearchParams,location:{hash:'',pathname:'/author.html'},history:{replaceState(){}},authorIdentity,postMedia,postPoll,videoFromUrl,FormData:class extends Map{constructor(){super([['title','Rich post'],['body',''],['kind','news'],['videos','https://youtu.be/dQw4w9WgXcQ\nhttps://vimeo.com/123456'],['pollQuestion','Next model?'],['pollOptions','A\nB']]);}}});
 const script=fs.readFileSync(new URL('../tracker/author.js',import.meta.url),'utf8').replace(/^import.*?;\r?\n/gm,'').replace('start();','');vm.runInContext(script,context);
 vm.runInContext("account={author:{name:'UnsanctionedMagic',icon:'',role:'owner'},projects:[],posts:[],pendingNotifications:0,mailEnabled:false,subscribers:0};workspace();attachments=[{id:'upload-id'}];",context);
 assert(app.innerHTML.includes('accept="image/png,image/jpeg,image/webp,image/gif"'));assert(app.innerHTML.includes('id="post-videos"'));assert(app.innerHTML.includes('id="poll-question"'));assert(app.innerHTML.includes('id="poll-options"'));
 const input=vm.runInContext('postInput({})',context);assert.equal(input.media[0],'upload-id');assert.equal(input.videos.length,2);assert.equal(input.poll.options.join(','),'A,B');assert(!Object.hasOwn(input,'pollOptions'));
});
test('the embedded-video preview accepts the same trusted providers and keeps other HTTPS services as links',()=>{
 assert.equal(videoFromUrl('https://youtu.be/dQw4w9WgXcQ').embedUrl,'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');assert.equal(videoFromUrl('https://vimeo.com/123456').embedUrl,'https://player.vimeo.com/video/123456');assert.equal(videoFromUrl('https://example.test/video.webm').type,'video');assert.equal(videoFromUrl('https://example.test/watch/anything').type,'link');assert.throws(()=>videoFromUrl('javascript:alert(1)'));
});
