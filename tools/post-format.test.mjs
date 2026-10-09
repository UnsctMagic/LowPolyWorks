import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {postBody,contentUrl} from '../tracker/post-format.js';
import {uploadImage} from '../tracker/upload-workflow.js';

test('embedded post formatting binds its own toolbar and preserves the unit editor handler',()=>{
 const unitClick=()=>{},unitTools={onclick:unitClick},postTools={},row={},url={focus(){}},status={};
 const body={value:'Selected text',selectionStart:0,selectionEnd:13,focus(){},setRangeText(text,start,end){this.value=this.value.slice(0,start)+text+this.value.slice(end);},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;},dispatchEvent(){}};
 const nodes={'#post-body':body,'#editor-link-row':row,'#editor-url':url,'#editor-cancel':{},'#editor-insert':{},'#post-status':status,'.editor-tools':unitTools};
 const source=fs.readFileSync('tracker/author.js','utf8');
 const context=vm.createContext({app:{querySelector:selector=>selector==='.editor-tools'?postTools:nodes[selector]},document:{querySelector:selector=>nodes[selector]},Event,contentUrl});
 vm.runInContext(source.slice(source.indexOf('function bindEditor(){'))+'\nbindEditor();',context);
 assert.equal(unitTools.onclick,unitClick,'Unit toolbar handler must remain attached');
 assert.equal(typeof postTools.onclick,'function','Post toolbar must receive the click handler');
 postTools.onclick({target:{closest:()=>({dataset:{format:'bold'}})}});assert.equal(body.value,'**Selected text**');
 postTools.onclick({target:{closest:()=>({dataset:{format:'link'}})}});assert.equal(row.hidden,false);assert.equal(url.disabled,false);
 url.value='https://example.com/';nodes['#editor-insert'].onclick();assert.equal(body.value,'**[Selected text](https://example.com/)**');assert.equal(row.hidden,true);
});

test('author preview and feed ship exactly the same formatter',()=>{
 assert.equal(fs.readFileSync('tracker/post-format.js','utf8'),fs.readFileSync('dist/post-format.js','utf8'));
 assert.equal(fs.readFileSync('tracker/post-content.js','utf8'),fs.readFileSync('dist/post-content.js','utf8'));
});
test('Markdown and forum formatting support nested emphasis, links, images and escaped stars',()=>{
 const html=postBody('**Stay tuned!** and *italic* and __bold__ and [b]forum [i]italic[/i][/b]\n\\*literal stars\\*\n[img]https://files.catbox.moe/example.gif[/img]\n![A & B](https://example.com/image.png)\n[website](https://example.com/)\n[url=https://example.com/]BBCode link[/url]');
 for(const value of ['<strong>Stay tuned!</strong>','<em>italic</em>','<strong>bold</strong>','<strong>forum <em>italic</em></strong>','*literal stars*','src="https://files.catbox.moe/example.gif"','alt="A &amp; B"','>website</a>','>BBCode link</a>'])assert(html.includes(value),value);
});
test('lists, quotes, paragraphs and code retain intended structure',()=>{
 const html=postBody('# Heading\n\nFirst\nsecond\n\n- One\n- Two\n\n1. Alpha\n2. Beta\n\n> Quote\n\n```js\n**literal** <img onerror=x>\n```');
 assert(html.includes('<h3>Heading</h3>'));assert(html.includes('<p>First<br>second</p>'));assert(html.includes('<ul><li>One</li><li>Two</li></ul>'));assert(html.includes('<ol><li>Alpha</li><li>Beta</li></ol>'));assert(html.includes('<blockquote><p>Quote</p></blockquote>'));assert(html.includes('<pre><code>**literal** &lt;img onerror=x&gt;</code></pre>'));
 assert(postBody('`**literal**`').includes('<code>**literal**</code>'));
});
test('raw HTML, unsafe schemes, credentials and attribute injection cannot execute',()=>{
 const html=postBody('<script>alert(1)</script>\n[img]javascript:alert(1)[/img]\n[x](javascript:alert(1))\n[url=javascript:alert(1)]x[/url]\n![x" onerror="alert(1)](https://example.com/image.png)\n[img]https://user:password@example.com/image.gif[/img]');
 assert(!html.includes('<script>'));assert(!html.includes('src="javascript:'));assert(!html.includes('href="javascript:'));assert(!html.includes(' onerror="'));assert(!html.includes('src="https://user:'));assert(html.includes('&lt;script&gt;'));
 assert.throws(()=>contentUrl('http://example.com/image.gif'));assert.throws(()=>contentUrl('https://user:pass@example.com/'));
 assert.doesNotThrow(()=>postBody('>'.repeat(20000)));
});
test('upload passes the unchanged file, progress and cancellation signal through to the SDK',async()=>{
 const file=new File(['GIF89a original bytes'],'unchanged.gif',{type:'image/gif'}),progress=[];let uploaded;
 const result=await uploadImage(file,{api:async(action,input)=>action==='upload-token'?{id:'uploaded-image',pathname:'private/test.gif',clientToken:'client-token'}:{media:{id:input.id}},put:async(path,body,options)=>{uploaded={path,body,options};options.onUploadProgress({percentage:42});},onProgress:p=>progress.push(p.percentage)});
 assert.equal(uploaded.body,file);assert.equal(uploaded.options.access,'private');assert.equal(uploaded.options.contentType,'image/gif');assert(uploaded.options.abortSignal instanceof AbortSignal);assert.deepEqual(progress,[42,100]);assert.equal(result.media.id,'uploaded-image');
});
test('an unresponsive upload stops at the deadline and does not mark the file complete',async()=>{
 let signal,completed=false;
 await assert.rejects(uploadImage(new File(['gif'],'test.gif',{type:'image/gif'}),{timeout:15,api:async action=>{if(action==='upload-complete')completed=true;return {pathname:'test.gif',clientToken:'client-token'};},put:async(_path,_file,options)=>{signal=options.abortSignal;await new Promise(()=>{});}}),/timed out/);
 assert(signal.aborted);assert.equal(completed,false);
});
test('cancel also interrupts stalled token creation and confirmation',async()=>{
 for(const stage of ['upload-token','upload-complete']){
  const controller=new AbortController();let started;
  const entered=new Promise(resolve=>started=resolve);
  const work=uploadImage(new File(['gif'],'test.gif',{type:'image/gif'}),{signal:controller.signal,api:async action=>{if(action===stage){started();await new Promise(()=>{});}return {pathname:'test.gif',clientToken:'client-token'};},put:async()=>{}});
  await entered;controller.abort();await assert.rejects(work,/cancelled/);
 }
});
