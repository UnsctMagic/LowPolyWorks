const API='https://lowpolyworks-internal-tracker.vercel.app/api/publishing';
const storageKey='lowpolyworks.modelFollows';
export function modelFollowMarkup(){return `<section class="model-follow" aria-label="Model emails"><label class="model-follow-label"><input type="checkbox" name="updateMe" disabled>Update me</label><p>Email me when this model is updated or new models are uploaded.</p><form hidden><label for="model-follow-email">Your email</label><input id="model-follow-email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com" required><button class="iron-button" type="submit">Confirm by email</button></form><button class="iron-button follow-confirm" type="button" hidden>Confirm Update me</button><p class="follow-status" role="status">Checking availability…</p></section>`;}
export async function mountModelFollow(element,row,{confirmation='',fetchApi=fetch,storage=localStorage}={}){
 const checkbox=element.querySelector('[name="updateMe"]'),form=element.querySelector('form'),confirmButton=element.querySelector('.follow-confirm'),status=element.querySelector('.follow-status');
 let credential='',modelIds=[],enabled=false,busy=false;
 async function api(action,input){const response=await fetchApi(API+'?action='+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'Please try again.'),{status:response.status});return result;}
 function render(){checkbox.disabled=!enabled||busy;if(!busy)checkbox.checked=modelIds.includes(row.id);form.hidden=Boolean(credential)||!enabled||Boolean(confirmation);confirmButton.hidden=!confirmation;confirmButton.disabled=busy;}
 function save(result){if(result.token){credential=result.token;storage.setItem(storageKey,credential);}modelIds=result.modelIds;}
 async function change(action){busy=true;render();status.textContent='Saving…';try{save(await api(action,{token:credential,modelId:row.id}));status.textContent=action==='follow'?'Update me is on for this model and new uploads.':modelIds.length?'Update me is off for this model.':'Update me is off. You will receive no model emails.';}catch(error){status.textContent=error.message;}finally{busy=false;render();}}
 checkbox.onchange=()=>{if(credential)return change(checkbox.checked?'follow':'unfollow');form.hidden=!checkbox.checked;status.textContent=checkbox.checked?'Enter your email to confirm.':'';};
 form.onsubmit=async event=>{event.preventDefault();busy=true;checkbox.disabled=true;form.querySelector('button').disabled=true;status.textContent='Sending confirmation…';try{const result=await api('follow',{email:new FormData(form).get('email'),modelId:row.id});status.textContent=result.message;form.hidden=true;checkbox.checked=false;form.reset();}catch(error){status.textContent=error.message;}finally{busy=false;checkbox.disabled=!enabled;form.querySelector('button').disabled=false;}};
 confirmButton.onclick=async()=>{busy=true;render();status.textContent='Confirming…';try{const result=await api('follow-confirm',{token:confirmation});modelIds=result.modelIds;credential=result.token;confirmation='';storage.setItem(storageKey,credential);status.textContent=result.message;}catch(error){status.textContent=error.message;}finally{busy=false;render();}};
 try{
  const response=await fetchApi(API+'?action=feed');if(!response.ok)throw Error('Could not check Update me availability.');enabled=(await response.json()).modelFollowsEnabled===true;
  credential=storage.getItem(storageKey)||'';
  if(credential){try{save(await api('follow-status',{token:credential}));}catch(error){if(error.status!==403)throw error;storage.removeItem(storageKey);credential='';status.textContent=error.message;}}
  if(confirmation)status.textContent='Confirm emails for this model and new uploads.';
  else if(!enabled)status.textContent='Update me is not live yet.';
  else if(modelIds.includes(row.id))status.textContent='Following this model and new uploads.';
  else status.textContent='';
  render();form.hidden=true;
 }catch(error){status.textContent=error.message;enabled=false;render();form.hidden=true;}
}
