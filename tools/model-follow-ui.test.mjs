import test from 'node:test';
import assert from 'node:assert/strict';
import {mountModelFollow} from '../dist/model-follows.js';

function fixture({saved='',failure}={}){
 const checkbox={checked:false},emailInput={value:''},submit={},recipient={},confirmButton={},status={};
 const form={querySelector:selector=>selector==='button'?submit:emailInput};
 const nodes={'[name="updateMe"]':checkbox,form,'.follow-recipient':recipient,'.follow-confirm':confirmButton,'.follow-status':status};
 let credential=saved,scrolls=0;const calls=[];
 const element={querySelector:selector=>nodes[selector],scrollIntoView:()=>scrolls++};
 const storage={getItem:()=>credential,setItem:(_key,value)=>{credential=value;},removeItem:()=>{credential='';}};
 const reader={token:'saved-reader',email:'reader@example.test',modelIds:['graveguard']};
 const fetchApi=async(url,options)=>{
  const action=new URL(url).searchParams.get('action');calls.push({action,input:options?JSON.parse(options.body):null});
  if(action==='feed')return {ok:true,json:async()=>({modelFollowsEnabled:true})};
  if(action==='follow-confirm'&&failure)return {ok:false,status:400,json:async()=>({error:failure})};
  return {ok:true,json:async()=>reader};
 };
 return {element,storage,fetchApi,checkbox,emailInput,submit,recipient,confirmButton,status,calls,get credential(){return credential;},get scrolls(){return scrolls;}};
}
test('an email link confirms automatically, shows success and the recipient, and persists the follow on reload',async()=>{
 const previous={location:globalThis.location,history:globalThis.history};let cleanUrl;
 globalThis.location={href:'https://www.lowpolyworks.com/model/graveguard/?follow-confirm=link#follow-confirm=link'};
 globalThis.history={replaceState:(_state,_title,url)=>{cleanUrl=url;}};
 try{
  const f=fixture();await mountModelFollow(f.element,{id:'graveguard'},{...f,confirmation:'link'});
  assert.equal(f.calls.filter(call=>call.action==='follow-confirm').length,1);
  assert.equal(f.status.textContent,'Email confirmed. Update me is on.');
  assert.equal(f.checkbox.checked,true);assert.equal(f.checkbox.disabled,false);assert.equal(f.confirmButton.hidden,true);
  assert.equal(f.emailInput.value,'reader@example.test');assert.equal(f.recipient.textContent,'Notifications to: reader@example.test');
  assert.equal(f.credential,'saved-reader');assert.equal(f.scrolls,1);
  assert.equal(cleanUrl,'https://www.lowpolyworks.com/model/graveguard/');
  const reload=fixture({saved:f.credential});await mountModelFollow(reload.element,{id:'graveguard'},reload);
  assert.equal(reload.checkbox.checked,true);assert.equal(reload.status.textContent,'Update me is on.');
  assert.equal(reload.calls.some(call=>call.action==='follow-confirm'),false);
 }finally{Object.assign(globalThis,previous);}
});
test('a rejected email link shows the actual failure and never marks the model as followed',async()=>{
 const f=fixture({failure:'This confirmation has expired. Request Update me again.'});
 await mountModelFollow(f.element,{id:'graveguard'},{...f,confirmation:'expired'});
 assert.equal(f.status.textContent,'This confirmation has expired. Request Update me again.');
 assert.equal(f.checkbox.checked,false);assert.equal(f.credential,'');assert.equal(f.confirmButton.hidden,false);
});
