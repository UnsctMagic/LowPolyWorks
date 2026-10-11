import test from 'node:test';
import assert from 'node:assert/strict';
import {modelEmail} from './lib/model-email.js';

test('model updates contain the real picture, model page and unsubscribe link in HTML plus readable plain text',()=>{
 const model={name:'Von Carstein Vampire',url:'https://www.lowpolyworks.com/model/von-carstein/'};
 const mail=modelEmail({modelId:'von-carstein',kind:'model-update',model},'https://example.test/unsubscribe');
 assert.equal(mail.subject,'Model update: Von Carstein Vampire');assert.match(mail.html,/<img src="https:\/\/www.lowpolyworks.com\/thumbs\/unit-von-carstein.png"/);assert(mail.html.includes('href="'+model.url+'"'));assert.match(mail.text,/A model you follow has been updated/);assert(!mail.text.includes('test email'));assert.equal(mail.headers['List-Unsubscribe'],'<https://example.test/unsubscribe>');
});

test('Vault pictures use the published card asset, and model names and links are escaped',()=>{
 const mail=modelEmail({kind:'model-upload',model:{name:'A & <script>"',url:'https://example.test/?a=1&b=2',imageUrl:'https://example.test/image.png?a=1&b=2'}},'https://example.test/off');
 assert(!mail.html.includes('<script>'));assert.match(mail.html,/A &amp; &lt;script&gt;&quot;/);assert(mail.html.includes('src="https://example.test/image.png?a=1&amp;b=2"'));assert.equal(mail.subject,'New model: A & <script>"');
});
