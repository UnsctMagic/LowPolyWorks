import test from 'node:test';
import assert from 'node:assert/strict';
import {modelEmail,modelDigestEmail} from './lib/model-email.js';

test('model updates contain the real picture, model page and unsubscribe link in HTML plus readable plain text',()=>{
 const model={name:'Von Carstein Vampire',url:'https://www.lowpolyworks.com/model/von-carstein/'};
 const mail=modelEmail({modelId:'von-carstein',kind:'model-update',model},'https://example.test/unsubscribe');
 assert.equal(mail.subject,'Model update: Von Carstein Vampire');assert.match(mail.html,/<img src="https:\/\/www.lowpolyworks.com\/thumbs\/unit-von-carstein.png"/);assert(mail.html.includes('href="'+model.url+'"'));assert.match(mail.text,/A model you follow has been updated/);assert(!mail.text.includes('test email'));assert.equal(mail.headers['List-Unsubscribe'],'<https://example.test/unsubscribe>');
});

test('Vault pictures use the published card asset, and model names and links are escaped',()=>{
 const mail=modelEmail({kind:'model-upload',model:{name:'A & <script>"',url:'https://example.test/?a=1&b=2',imageUrl:'https://example.test/image.png?a=1&b=2'}},'https://example.test/off');
 assert(!mail.html.includes('<script>'));assert.match(mail.html,/A &amp; &lt;script&gt;&quot;/);assert(mail.html.includes('src="https://example.test/image.png?a=1&amp;b=2"'));assert.equal(mail.subject,'New model: A & <script>"');
});

test('a digest includes all distinct models once, with the latest names, links and images',()=>{
 const jobs=[{modelId:'a',kind:'model-upload',model:{name:'Old A',url:'https://example.test/old'}},{modelId:'b',kind:'model-update',model:{name:'B',url:'https://example.test/b'}},{modelId:'a',kind:'model-update',model:{name:'Latest A',url:'https://example.test/a',imageUrl:'https://example.test/a.png'}}];
 const mail=modelDigestEmail(jobs,'https://example.test/off');assert.equal(mail.subject,'LowPolyWorks: 2 model releases and updates');assert(!mail.text.includes('Old A'));assert.equal((mail.text.match(/Latest A/g)||[]).length,1);assert.match(mail.text,/A new model is available/);assert.match(mail.text,/A model you follow has been updated/);assert.match(mail.html,/https:\/\/example.test\/a.png/);assert.match(mail.text,/48 hours/);assert.equal((mail.html.match(/<img /g)||[]).length,2);assert.throws(()=>modelDigestEmail([],'off'),/at least one/);
});
