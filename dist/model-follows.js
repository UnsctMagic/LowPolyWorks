const API='https://lowpolyworks-internal-tracker.vercel.app/api/publishing';
const storageKey='lowpolyworks.modelFollows';
export function modelFollowMarkup(){return `<section class="model-follow" aria-label="Model emails"><label class="model-follow-label"><input type="checkbox" name="updateMe" disabled>Update me</label><p>Emails for this model’s updates and new uploads.</p><form><label for="model-follow-email">Your email</label><input id="model-follow-email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com" required disabled><button class="iron-button" type="submit" disabled>Confirm by email</button></form><p class="follow-recipient"></p><button class="iron-button follow-confirm" type="button" hidden>Confirm Update me</button><p class="follow-status" role="status">Checking availability…</p></section>`;}
export async function mountModelFollow(element,row,{confirmation='',fetchApi=fetch,storage=localStorage}={}){
 const checkbox=element.querySelector('[name="updateMe"]'),form=element.querySelector('form'),emailInput=form.querySelector('[name="email"]'),submit=form.querySelector('button'),recipient=element.querySelector('.follow-recipient'),confirmButton=element.querySelector('.follow-confirm'),status=element.querySelector('.follow-status');
 let credential='',email='',modelIds=[],enabled=false,busy=false;
 const address=()=>emailInput.value.trim().toLowerCase();
 const usingSavedAddress=()=>Boolean(credential)&&address()===email;
 async function api(action,input){const response=await fetchApi(API+'?action='+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'Please try again.'),{status:response.status});return result;}
 function render(){
  checkbox.disabled=!enabled||busy||Boolean(confirmation);emailInput.disabled=!enabled||busy||Boolean(confirmation);
  submit.hidden=usingSavedAddress()||Boolean(confirmation);submit.disabled=!enabled||busy||!checkbox.checked;
  confirmButton.hidden=!confirmation;confirmButton.disabled=busy;
  recipient.textContent=email?(modelIds.includes(row.id)?'Notifications to: ':'Confirmed email: ')+email:'';
 }
 function save(result){if(result.token){credential=result.token;storage.setItem(storageKey,credential);}modelIds=result.modelIds;email=result.email||'';emailInput.value=email;checkbox.checked=modelIds.includes(row.id);}
 async function change(action){busy=true;render();status.textContent='Saving…';try{save(await api(action,{token:credential,modelId:row.id}));status.textContent=action==='follow'?'Update me is on.':modelIds.length?'Update me is off for this model.':'Update me is off. You will receive no model emails.';}catch(error){checkbox.checked=modelIds.includes(row.id);status.textContent=error.message;}finally{busy=false;render();}}
 checkbox.onchange=()=>{if(credential&&(!checkbox.checked||usingSavedAddress()))return change(checkbox.checked?'follow':'unfollow');status.textContent=checkbox.checked?'Enter your email, then confirm by email.':'';render();};
 emailInput.oninput=()=>{if(usingSavedAddress()){checkbox.checked=modelIds.includes(row.id);status.textContent='';}else status.textContent=email?'Confirm the new address before emails switch to it.':'Check Update me, enter your email, then confirm.';render();};
 form.onsubmit=async event=>{
  event.preventDefault();if(!checkbox.checked)return;
  if(usingSavedAddress())return change('follow');
  const requested=address();busy=true;render();status.textContent='Sending confirmation…';
  try{await api('follow',{email:requested,modelId:row.id,...(credential?{previousToken:credential}:{})});checkbox.checked=modelIds.includes(row.id);status.textContent='Confirmation sent to '+requested+'. Open it to '+(credential?'confirm this address.':'turn Update me on.');}
  catch(error){status.textContent=error.message;}
  finally{busy=false;render();}
 };
 confirmButton.onclick=async()=>{busy=true;render();status.textContent='Confirming…';try{save(await api('follow-confirm',{token:confirmation}));confirmation='';status.textContent='Email confirmed. Update me is on.';}catch(error){status.textContent=error.message;}finally{busy=false;render();}};
 try{
  const response=await fetchApi(API+'?action=feed');if(!response.ok)throw Error('Could not check Update me availability.');enabled=(await response.json()).modelFollowsEnabled===true;
  credential=storage.getItem(storageKey)||'';
  if(credential){try{save(await api('follow-status',{token:credential}));}catch(error){if(error.status!==403)throw error;storage.removeItem(storageKey);credential='';status.textContent=error.message;}}
  if(confirmation)status.textContent='Confirm emails for this model and new uploads.';
  else if(!enabled)status.textContent='Update me is not live yet.';
  else if(modelIds.includes(row.id))status.textContent='Update me is on.';
  else status.textContent=credential?'Check Update me to follow this model.':'Check Update me, enter your email, then confirm.';
  render();
 }catch(error){status.textContent=error.message;enabled=false;render();}
}
