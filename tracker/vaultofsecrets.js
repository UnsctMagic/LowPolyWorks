import {put} from './vendor/blob-client.js';
import {postBody} from './post-format.js';
import {uploadImage} from './upload-workflow.js';
const app=document.querySelector('#vault-app'),SITE='https://www.lowpolyworks.com',PREFS='lowpolyworks.vault';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain=value=>String(value||'').replace(/\[url=[^\]]*\]([^[]*)\[\/url\]/gi,'$1').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/\[\/?[a-z]+[^\]]*\]|[*_`]/gi,'').replace(/\s+/g,' ').trim();
const number=value=>new Intl.NumberFormat().format(value||0);
let account,csrf='',files=[],ready=null,cardId='',editing=null,busy=false,controller,coverUrl='',requestId='',completed=new Map(),coverUpload=null,postsLoaded=false;
let catalogueRows=null,reports={},loading={},countdown,activitySort='total';
const prefs=(()=>{try{return {query:'',army:'',status:'',source:'',sort:'army',...JSON.parse(localStorage.getItem(PREFS)||'{}')};}catch{return {query:'',army:'',status:'',source:'',sort:'army'};}})();
const savePrefs=()=>{try{localStorage.setItem(PREFS,JSON.stringify(prefs));}catch{}};
const activation=new URLSearchParams(location.hash.slice(1));if(location.hash)history.replaceState(null,'',location.pathname);
async function api(action,input,signal){const response=await fetch('/api/publishing?action='+action,{method:input?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:signal||AbortSignal.timeout(120000),headers:input?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{},body:input?JSON.stringify(input):undefined});const result=await response.json();if(!response.ok)throw Error(result.error||'Please try again.');return result;}
const owner=()=>account.author.role==='owner';
function login(message=''){
 const token=activation.get('invite')||activation.get('setup');app.innerHTML=`<section class="login"><h1>Vault of Secrets</h1><p class="hint">${token?'Create your invited author account.':'Sign in to upload unit cards and write posts.'}</p><form id="login-form"><label>Username<input name="username" autocomplete="username" maxlength="40" value="${escape(activation.get('username')||'UnsanctionedMagic')}" required></label>${token?'<label>Display name<input name="name" maxlength="60" required></label>':''}<label>${token?'Choose a password':'Password'}<input name="password" type="password" autocomplete="${token?'new-password':'current-password'}" ${token?'minlength="12"':''} maxlength="256" required></label><button type="submit">${token?'Create account':'Log in'}</button><p class="status" role="status">${escape(message)}</p></form></section>`;
 app.querySelector('form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{const input=Object.fromEntries(new FormData(event.target));await api(token?'activate':'login',token?{...input,token}:input);activation.delete('invite');activation.delete('setup');await loadVault();}catch(error){event.target.querySelector('.status').textContent=error.message;button.disabled=false;}};
}
function editorField(id,label,required=true){return `<label for="${id}">${label}</label><div class="editor-tools" data-editor="${id}" role="toolbar" aria-label="${label} formatting"><button type="button" data-mark="bold"><strong>B</strong></button><button type="button" data-mark="italic"><em>I</em></button><button type="button" data-mark="link">Link</button><button type="button" data-mark="image">Image</button></div><div class="editor-link-row" id="${id}-link" hidden><input type="url" placeholder="https://" aria-label="${label} link"><button type="button" data-insert="${id}">Insert</button><button type="button" data-close="${id}" class="secondary">Cancel</button></div><textarea id="${id}" name="${id}" maxlength="${id==='byline'?2000:20000}" rows="${id==='byline'?2:6}" ${required?'required':''}></textarea>`;}
const armyOptions=(selected='')=>account.unitArmies.map(a=>`<option value="${escape(a.id)}" ${a.id===selected?'selected':''}>${escape(a.name)}</option>`).join('');
function workspace(){
 postsLoaded=false;
 app.innerHTML=`<div class="vault-top"><div><h1>Vault of Secrets</h1><p class="muted">${escape(account.author.name)}${owner()?' <span class="badge">Admin</span>':''}</p></div><button id="logout" class="secondary">Log out</button></div>
<nav class="vault-nav" aria-label="Workspace"><button data-tab="units">Unit cards</button><button data-tab="upload">New unit card</button><button data-tab="posts">Posts &amp; account</button>${owner()?'<button data-tab="activity">Activity</button>':''}</nav>
<section id="units-panel">
 <div id="removals" class="removals" hidden></div>
 <div class="filters" role="search"><input type="search" id="filter-query" placeholder="Search by name, author or army" aria-label="Search unit cards" value="${escape(prefs.query)}"><select id="filter-army" aria-label="Army"><option value="">All armies</option>${armyOptions(prefs.army)}<option value="other" ${prefs.army==='other'?'selected':''}>Other projects</option></select><select id="filter-status" aria-label="Status"><option value="">Any status</option><option value="live">On the site</option><option value="hidden">Hidden</option><option value="edited">Edited in the Vault</option></select>${owner()?'<select id="filter-source" aria-label="Source"><option value="">All cards</option><option value="vault">Vault uploads</option><option value="catalogue">Original catalogue</option></select>':''}<select id="filter-sort" aria-label="Order"><option value="army">Group by army</option><option value="name">Name A–Z</option><option value="downloads">Most downloads</option><option value="recent">Recently added</option></select></div>
 <p id="unit-count" class="hint"></p><div id="unit-groups"></div><p id="manage-status" class="status" role="status"></p>
</section>
<section id="catalogue-panel" hidden></section>
<section id="upload-panel" hidden><form id="unit-form">
 <div class="panel-head"><h2 id="unit-heading">New unit card</h2><button type="button" id="cancel-unit" class="secondary" hidden>Cancel editing</button></div>
 <p id="edit-note" class="note" hidden>Add files only to replace this card’s models. Without new files the current models and picture stay.</p>
 <fieldset><legend>1 · Unit</legend><div class="row"><label>Project<select id="unit-project" name="projectId" required>${account.projects.map(p=>`<option value="${escape(p.id)}" ${p.id==='warhammercraft'?'selected':''}>${escape(p.name)}</option>`).join('')}</select></label><label id="army-field">Army<select id="unit-army" name="army">${armyOptions()}</select></label></div><label>Unit name<input id="unit-name" name="name" maxlength="160" required></label></fieldset>
 <fieldset><legend>2 · Model files</legend><div class="file-drop"><input id="unit-files" type="file" multiple accept=".mdx,.mdl,.zip,.blp,.tga,.png,.jpg,.jpeg,.webp" aria-label="Model files"><span class="hint">One model, several models, or a ZIP with models and textures. Up to 100 MB per file.</span></div><ul id="selected-files" class="file-list"></ul><div class="upload-preview"><iframe id="studio" title="Live model preview and automatic card image" src="${SITE}/upload-studio.html?v=20261009-unit-upload" referrerpolicy="no-referrer"></iframe><div class="cover-preview"><img id="card-cover" alt="Automatic unit card image" hidden><p>Card image</p><span class="hint">Created automatically from the selected model.</span></div></div><p id="preview-status" class="status" role="status">Choose files to generate the card image.</p></fieldset>
 <fieldset><legend>3 · Text &amp; credits</legend>${editorField('description','Description')}${editorField('byline','By — finished model authors')}${editorField('credits','Credits')}<p class="hint">Markdown and BBCode work here, including links and images.</p><button type="button" id="text-preview" class="secondary">Preview text</button><section id="text-result" class="post-body" hidden></section></fieldset>
 <div class="actions"><button id="publish-unit" type="submit" disabled>Publish unit card</button><button type="button" id="cancel-upload" class="secondary" hidden>Cancel upload</button></div><p id="unit-status" class="status" role="status"></p>
</form></section>
<section id="posts-panel" hidden><div id="author-app"></div></section><section id="activity-panel" hidden></section>`;
 app.querySelector('#logout').onclick=async()=>{await api('logout',{});account=null;clearDraft();login();};
 app.querySelector('.vault-nav').onclick=event=>{const tab=event.target.closest('[data-tab]')?.dataset.tab;if(tab)openTab(tab);};
 for(const id of ['query','army','status','source','sort']){const input=app.querySelector('#filter-'+id);if(!input)continue;input.value=prefs[id]||'';input[id==='query'?'oninput':'onchange']=()=>{prefs[id]=input.value;savePrefs();renderUnits();};}
 app.querySelector('#units-panel').onclick=unitAction;
 app.querySelector('#unit-files').onchange=event=>{if(busy)return;files=[...files,...event.target.files];completed.clear();coverUpload=null;updateFiles();sendFiles();event.target.value='';};
 app.querySelector('#selected-files').onclick=event=>{const index=event.target.dataset.removeFile;if(index===undefined||busy)return;files.splice(Number(index),1);completed.clear();updateFiles();sendFiles();};
 app.querySelector('#unit-project').onchange=projectChanged;app.querySelector('#unit-army').onchange=()=>app.querySelector('#studio').contentWindow.postMessage({type:'studio-colour',colour:armyColour()},SITE);
 app.querySelector('#text-preview').onclick=()=>{const result=app.querySelector('#text-result');result.hidden=false;result.innerHTML='<h3>Description</h3>'+postBody(app.querySelector('#description').value)+'<h3>By</h3>'+postBody(app.querySelector('#byline').value)+'<h3>Credits</h3>'+postBody(app.querySelector('#credits').value);};
 app.querySelector('#unit-form').onsubmit=publishUnit;app.querySelector('#cancel-unit').onclick=()=>{clearDraft();resetForm();openTab('units');};app.querySelector('#cancel-upload').onclick=()=>controller?.abort();
 bindFormatting();clearDraft();resetForm();openTab('units');
 clearInterval(countdown);countdown=setInterval(()=>{if(!app.querySelector('#removals')?.hidden)renderRemovals();},60000);
 if(owner()){loadCatalogue().then(renderUnits,error=>status('#manage-status',error.message));loadReport().then(renderUnits,()=>{});}
}
function openTab(tab){
 const panel=tab==='catalogue'?'catalogue':tab;
 for(const name of ['units','catalogue','upload','posts','activity'])app.querySelector('#'+name+'-panel').hidden=name!==panel;
 for(const button of app.querySelectorAll('[data-tab]')){const current=button.dataset.tab===(tab==='catalogue'?'units':tab);if(current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
 const run=async()=>{if(tab==='posts'&&!postsLoaded){postsLoaded=true;const editor=await import('./author.js?v=20261009-unit-upload');await editor.start();}if(tab==='activity')await activity();if(tab==='units')renderUnits();};
 run().catch(error=>app.querySelector('#'+panel+'-panel').append(Object.assign(document.createElement('p'),{className:'status',textContent:error.message})));
}
const status=(selector,message)=>{const node=app.querySelector(selector);if(node)node.textContent=message;};
async function loadCatalogue(){if(!catalogueRows){const response=await fetch(SITE+'/catalogue.json',{cache:'no-store'});if(!response.ok)throw Error('The original catalogue is unavailable right now.');catalogueRows=await response.json();}return catalogueRows;}
// Each report lists the private event store, so it is fetched once per period and reused.
function loadReport(days=''){return loading[days]??=api('analytics'+(days?'&days='+days:'')).then(result=>reports[days]=result,error=>{delete loading[days];throw error;});}
const armyName=id=>account.unitArmies.find(a=>a.id===id)?.name||'';
const hoursLeft=at=>{const minutes=Math.max(0,Math.ceil((Date.parse(at)-Date.now())/60000));return minutes>=60?Math.floor(minutes/60)+' h '+(minutes%60)+' min':minutes+' min';};
// One list for Vault uploads and the original catalogue, so every card is found in the same place.
function units(){
 const rows=account.unitCards.map(card=>({key:'vault:'+card.id,kind:'vault',id:card.id,name:card.name,army:card.projectId==='warhammercraft'?card.army:'other',group:card.projectId==='warhammercraft'?armyName(card.army):card.projectName,authors:plain(card.byline),thumb:card.coverUrl,url:card.url,models:card.models.length,hidden:Boolean(card.deletedAt&&!card.removeAt),removeAt:card.removeAt,edited:false,added:card.publishedAt,revision:card.revision||0}));
 if(owner()&&catalogueRows){const edits=account.modelEdits||{},removed=new Set(account.removedModels||[]);rows.push(...catalogueRows.filter(row=>!removed.has(row.id)).map((row,index)=>{const edit=edits[row.id],army=edit?.army||row.army;return {key:'catalogue:'+row.id,kind:'catalogue',id:row.id,name:edit?.name||row.name,army,group:armyName(army),authors:(edit?.authors||row.authors||[]).map(a=>a.name).join(', '),thumb:SITE+'/thumbs/unit-'+row.id+'.png',url:SITE+'/model/'+(row.slug||row.id)+'/',hidden:account.hiddenModels.includes(row.id)&&!account.modelRemovals?.[row.id],removeAt:account.modelRemovals?.[row.id]?.removeAt,edited:Boolean(edit),added:'',order:index,revision:edit?.revision||0};}));}
 const counts=new Map((reports['']?.models||[]).map(row=>[row.id,row]));
 for(const row of rows)row.downloads=counts.get(row.id)||null;
 return rows;
}
function renderUnits(){
 const groups=app.querySelector('#unit-groups');if(!groups||!account)return;
 renderRemovals();
 const all=units().filter(row=>!row.removeAt),query=prefs.query.trim().toLowerCase();
 const rows=all.filter(row=>(!query||[row.name,row.authors,row.group,row.id].join(' ').toLowerCase().includes(query))&&(!prefs.army||row.army===prefs.army)&&(!prefs.source||row.kind===prefs.source)&&(!prefs.status||prefs.status==='live'&&!row.hidden||prefs.status==='hidden'&&row.hidden||prefs.status==='edited'&&row.edited));
 const total=row=>row.downloads?.total||0,byName=(a,b)=>a.name.localeCompare(b.name);
 rows.sort(prefs.sort==='downloads'?(a,b)=>total(b)-total(a)||byName(a,b):prefs.sort==='recent'?(a,b)=>(b.added||'').localeCompare(a.added||'')||(b.order??0)-(a.order??0):byName);
 const hidden=all.filter(row=>row.hidden).length;
 app.querySelector('#unit-count').textContent=`${rows.length===all.length?all.length+' unit cards':rows.length+' of '+all.length+' unit cards'}${hidden?' · '+hidden+' hidden':''}${owner()&&!catalogueRows?' · loading the original catalogue…':''}`;
 if(!rows.length){groups.innerHTML=`<p class="empty">${all.length?'No unit cards match these filters.':'No unit cards yet. Use New unit card to publish one.'}</p>`;return;}
 if(prefs.sort!=='army'){groups.innerHTML=`<ul class="unit-list">${rows.map(unitRow).join('')}</ul>`;return;}
 const order=[...account.unitArmies.map(a=>a.name)],names=[...new Set(rows.map(row=>row.group||'Other'))].sort((a,b)=>(order.indexOf(a)+1||99)-(order.indexOf(b)+1||99)||a.localeCompare(b));
 groups.innerHTML=names.map(name=>{const list=rows.filter(row=>(row.group||'Other')===name);return `<details class="unit-group" open><summary><span>${escape(name)}</span><small>${list.length}</small></summary><ul class="unit-list">${list.map(unitRow).join('')}</ul></details>`;}).join('');
}
function unitRow(row){
 const d=row.downloads,count=reports['']?`<div class="unit-downloads" title="${d?`MDX ${d.mdxClicks} · Pack ${d.packClicks}`:'No downloads yet'}"><strong>${number(d?.total)}</strong><span>downloads</span></div>`:owner()?'<div class="unit-downloads"><strong>–</strong><span>downloads</span></div>':'';
 const actions=[row.hidden&&row.kind==='vault'?'':`<button class="secondary" data-action="edit" data-key="${escape(row.key)}">Edit</button>`,owner()?`<button class="secondary" data-action="${row.hidden?'show':'hide'}" data-key="${escape(row.key)}">${row.hidden?'Show':'Hide'}</button><button class="danger" data-action="remove" data-key="${escape(row.key)}">Remove…</button>`:''].join('');
 return `<li class="unit-row${row.hidden?' is-hidden':''}"><img class="unit-thumb" src="${escape(row.thumb)}" alt="" loading="lazy"><div class="unit-main"><a href="${escape(row.url)}" target="_blank" rel="noopener">${escape(row.name)}</a>${row.hidden?' <span class="badge muted-badge">Hidden</span>':''}${row.edited&&row.kind==='catalogue'?' <span class="badge">Edited</span>':''}<small>${[row.kind==='vault'?'Vault upload':'Catalogue',prefs.sort==='army'?'':row.group,row.authors&&'By '+row.authors,row.models>1?row.models+' models':''].filter(Boolean).map(escape).join(' · ')}</small></div>${count}<div class="unit-actions">${actions}</div></li>`;
}
function renderRemovals(){
 const box=app.querySelector('#removals');if(!box)return;const rows=units().filter(row=>row.removeAt).sort((a,b)=>a.removeAt.localeCompare(b.removeAt));
 box.hidden=!rows.length;box.innerHTML=`<h2>Removing permanently</h2><p class="hint">Hidden from the site now. Each is deleted for good when its timer ends; undo brings it back as it was.</p><ul class="unit-list">${rows.map(row=>`<li class="unit-row"><img class="unit-thumb" src="${escape(row.thumb)}" alt="" loading="lazy"><div class="unit-main"><strong>${escape(row.name)}</strong><small>Deleted for good in ${hoursLeft(row.removeAt)} · ${escape(new Date(row.removeAt).toLocaleString())}</small></div><div class="unit-actions"><button data-action="undo" data-key="${escape(row.key)}">Undo removal</button></div></li>`).join('')}</ul>`;
}
async function unitAction(event){
 const button=event.target.closest('[data-action]');if(!button||busy)return;
 const row=units().find(item=>item.key===button.dataset.key),action=button.dataset.action;if(!row)return;
 if(action==='edit'){if(row.kind==='catalogue')return editCatalogue(row.id);return editUnit(row.id);}
 if(action==='remove'&&!confirm(`Remove “${row.name}” permanently?\n\nIt disappears from the site now. You can undo this for 24 hours. After that the card${row.kind==='vault'?', its front-page post and its uploaded files are':' is'} deleted for good.`))return;
 const vault=row.kind==='vault',name={show:vault?'restore-unit':'restore-model',hide:vault?'delete-unit':'hide-model',remove:vault?'remove-unit':'remove-model',undo:vault?'undo-remove-unit':'undo-remove-model'}[action];
 button.disabled=true;status('#manage-status','');
 try{await api(name,vault?{id:row.id,revision:row.revision}:{id:row.id});account=await api('me');csrf=account.csrf;renderUnits();status('#manage-status',{show:'Shown on the site: ',hide:'Hidden from the site: ',remove:'Removing permanently in 24 hours: ',undo:'Removal undone: '}[action]+row.name);}
 catch(error){status('#manage-status',error.message);button.disabled=false;}
}
function editUnit(id){
 if(ready||files.length){status('#manage-status','Publish or cancel the card in New unit card before editing another.');return;}
 const card=account.unitCards.find(c=>c.id===id);editing=card;cardId=card.id;
 const values={name:card.name,projectId:card.projectId,army:card.army||'',description:card.description,credits:card.credits,byline:card.byline};
 for(const [key,value] of Object.entries(values))app.querySelector('#unit-form').elements.namedItem(key).value=value;
 app.querySelector('#unit-heading').textContent='Edit '+card.name;app.querySelector('#publish-unit').textContent='Save changes';app.querySelector('#cancel-unit').hidden=false;app.querySelector('#edit-note').hidden=false;
 projectChanged();openTab('upload');sendCard();
}
const linkLines=(rows,key)=>(rows||[]).map(row=>row[key]+' | '+row.url).join('\n');
const parseLinks=(value,key,label)=>value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const index=line.lastIndexOf('|');if(index<1)throw Error(`Write each ${label} as: Name | https://link`);return {[key]:line.slice(0,index).trim(),url:line.slice(index+1).trim()};});
// Catalogue cards keep their published files and picture; the Vault changes their text and credits.
async function editCatalogue(id){
 const original=(await loadCatalogue()).find(row=>row.id===id),edit=account.modelEdits?.[id],row={...original,...edit},panel=app.querySelector('#catalogue-panel');
 panel.innerHTML=`<form id="catalogue-form"><div class="panel-head"><h2>Edit ${escape(row.name)}</h2><button type="button" class="secondary" data-back>Back to unit cards</button></div><p class="note">Saved changes appear on the site straight away. The model files and card picture stay as published.${edit?' This card has Vault edits.':''}</p>
<fieldset><legend>Card</legend><div class="row"><label>Unit name<input name="name" maxlength="160" required value="${escape(row.name)}"></label><label>Army<select name="army" required>${armyOptions(row.army)}</select></label></div><label>Description <span class="hint">Plain text. Leave a blank line between paragraphs.</span><textarea name="description" rows="8" maxlength="20000" required>${escape(row.description)}</textarea></label></fieldset>
<fieldset><legend>Authors &amp; credits</legend><label>By — finished model authors <span class="hint">One per line: Name | https://link</span><textarea name="authors" rows="3" required>${escape(linkLines(row.authors,'name'))}</textarea></label><label>Credits <span class="hint">One line per credit, for example: Model Base - Necron Guard by Rhapsodie</span><textarea name="credits" rows="7" maxlength="20000" required>${escape(row.credits)}</textarea></label><label>Credit links <span class="hint">Words in the credits and description that become links. One per line: Text | https://link</span><textarea name="creditLinks" rows="6">${escape(linkLines(row.creditLinks,'text'))}</textarea></label></fieldset>
<div class="actions"><button type="submit">Save changes</button>${edit?'<button type="button" class="secondary" data-reset>Restore original text</button>':''}<a href="${SITE}/model/${escape(row.slug||row.id)}/" target="_blank" rel="noopener">View on site ↗</a></div><p class="status" role="status"></p></form>`;
 const form=panel.querySelector('form'),note=form.querySelector('.status');
 form.querySelector('[data-back]').onclick=()=>openTab('units');
 const save=async(action,input)=>{for(const control of form.elements)control.disabled=true;try{await api(action,{id,revision:edit?.revision||0,...input});account=await api('me');csrf=account.csrf;openTab('units');status('#manage-status',(action==='reset-model'?'Original text restored: ':'Saved: ')+(input.name||original.name));}catch(error){note.textContent=error.message;for(const control of form.elements)control.disabled=false;}};
 form.onsubmit=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form));try{save('edit-model',{...values,authors:parseLinks(values.authors,'name','author'),creditLinks:parseLinks(values.creditLinks,'text','credit link')});}catch(error){note.textContent=error.message;}};
 form.querySelector('[data-reset]')?.addEventListener('click',()=>{if(confirm('Restore the original published text and credits for '+original.name+'?'))save('reset-model',{});});
 openTab('catalogue');
}
function armyColour(){const army=account.unitArmies.find(a=>a.id===app.querySelector('#unit-army').value);return army?.teamColour||army?.colour||'#ff0303';}
function projectChanged(){const warhammer=app.querySelector('#unit-project').value==='warhammercraft';app.querySelector('#army-field').hidden=!warhammer;app.querySelector('#unit-army').required=warhammer;}
function clearDraft(){files=[];ready=null;editing=null;cardId='unit-'+crypto.randomUUID();requestId=crypto.randomUUID();completed.clear();coverUpload=null;if(coverUrl)URL.revokeObjectURL(coverUrl);coverUrl='';}
function resetForm(){app.querySelector('#unit-form').reset();app.querySelector('#unit-project').value='warhammercraft';app.querySelector('#byline').value=account.author.name;app.querySelector('#unit-heading').textContent='New unit card';app.querySelector('#publish-unit').textContent='Publish unit card';app.querySelector('#publish-unit').disabled=true;app.querySelector('#cancel-unit').hidden=true;app.querySelector('#edit-note').hidden=true;app.querySelector('#card-cover').hidden=true;app.querySelector('#text-result').hidden=true;app.querySelector('#unit-status').textContent='';app.querySelector('#preview-status').textContent='Choose files to generate the card image.';projectChanged();updateFiles();app.querySelector('#studio').contentWindow.postMessage({type:'studio-clear'},SITE);}
function updateFiles(){app.querySelector('#selected-files').innerHTML=files.map((file,i)=>`<li><span>${escape(file.name)} <small>${(file.size/1024).toFixed(0)} KB</small></span><button type="button" class="secondary" data-remove-file="${i}" aria-label="Remove ${escape(file.name)}">Remove</button></li>`).join('');}
function sendFiles(){requestId=crypto.randomUUID();ready=null;coverUpload=null;app.querySelector('#publish-unit').disabled=true;app.querySelector('#card-cover').hidden=true;app.querySelector('#studio').contentWindow.postMessage({type:'studio-files',requestId,files,colour:armyColour()},SITE);}
function sendCard(){requestId=crypto.randomUUID();app.querySelector('#studio').contentWindow.postMessage({type:'studio-card',requestId,card:editing,colour:armyColour()},SITE);}
window.addEventListener('message',event=>{
 if(event.origin!==SITE||event.source!==app.querySelector('#studio')?.contentWindow)return;
 if(event.data?.type==='studio-mounted'){if(files.length)sendFiles();else if(editing)sendCard();return;}
 if(event.data?.requestId!==requestId)return;
 const preview=app.querySelector('#preview-status');if(event.data.type==='studio-loading'){ready=null;app.querySelector('#publish-unit').disabled=true;preview.textContent='Preparing preview and card image…';}
 if(event.data.type==='studio-error'){ready=null;preview.textContent=event.data.error;}
 if(event.data.type==='studio-ready'){ready=event.data;coverUpload=null;if(coverUrl)URL.revokeObjectURL(coverUrl);coverUrl=URL.createObjectURL(ready.cover);const image=app.querySelector('#card-cover');image.src=coverUrl;image.hidden=false;preview.textContent=ready.models.length+' model'+(ready.models.length===1?'':'s')+' ready. Use the Model selector to choose the card image.';app.querySelector('#publish-unit').disabled=busy;}
});
async function uploadFile(file,signal){
 const permit=await api('unit-upload-token',{name:file.name,size:file.size},signal);await put(permit.pathname,file,{access:'private',token:permit.clientToken,contentType:permit.type,abortSignal:signal,onUploadProgress:p=>app.querySelector('#unit-status').textContent='Uploading '+file.name+' — '+Math.round(p.percentage)+'%'});return (await api('unit-upload-complete',{id:permit.id},signal)).upload;
}
async function publishUnit(event){
 event.preventDefault();if(busy||!ready)return;busy=true;controller=new AbortController();const signal=controller.signal,form=event.target,result=app.querySelector('#unit-status'),button=app.querySelector('#publish-unit');button.disabled=true;app.querySelector('#studio').inert=true;app.querySelector('#cancel-upload').hidden=false;form.querySelectorAll('input,select,textarea,[data-mark]').forEach(el=>el.disabled=true);
 try{
  const uploads=[];for(let i=0;i<files.length;i++){const file=files[i],key=i+':'+file.name+':'+file.size;let upload=completed.get(key);if(!upload){upload=await uploadFile(file,signal);completed.set(key,upload);}const expected=ready.sourceHashes[i];if(upload.sha256!==expected?.sha256)throw Error('The uploaded file differs from '+file.name+'. Select the original files again.');uploads.push(upload);}
  if(!coverUpload){result.textContent='Saving card image…';coverUpload=(await uploadImage(new File([ready.cover],'unit-card.png',{type:'image/png'}),{api,put,signal})).media;}
  const models=uploads.length?uploads.flatMap(u=>u.models):editing.models,selected=models[ready.selectedIndex];if(!selected)throw Error('Choose the model for this card.');
  result.textContent=editing?'Saving changes…':'Publishing unit card…';
  const input={id:cardId,name:app.querySelector('#unit-name').value,projectId:app.querySelector('#unit-project').value,army:app.querySelector('#unit-army').value,description:app.querySelector('#description').value,credits:app.querySelector('#credits').value,byline:app.querySelector('#byline').value,uploadIds:uploads.length?uploads.map(u=>u.id):editing.uploadIds,coverId:coverUpload.id,defaultModelId:selected.assetId,teamColour:ready.teamColour,...(editing?{revision:editing.revision||0}:{})};
  const published=await api(editing?'update-unit':'publish-unit',input,signal);account=await api('me');csrf=account.csrf;const wasEditing=Boolean(editing);clearDraft();resetForm();result.innerHTML=(wasEditing?'Changes saved. ':'Published. ')+`<a href="${escape(published.card.url)}" target="_blank" rel="noopener">View ${escape(published.card.name)} ↗</a>`;renderUnits();
 }catch(error){result.textContent=signal.aborted?'Upload cancelled. Your text and selected files are kept.':error.message;}
 finally{busy=false;controller=null;app.querySelector('#studio').inert=false;form.querySelectorAll('input,select,textarea,[data-mark]').forEach(el=>el.disabled=false);button.disabled=!ready;app.querySelector('#cancel-upload').hidden=true;}
}
function bindFormatting(){
 let selection;
 app.querySelector('#unit-form').addEventListener('click',event=>{
  const button=event.target.closest('[data-mark],[data-insert],[data-close]');if(!button)return;
  if(button.dataset.mark){const id=button.closest('[data-editor]').dataset.editor,area=app.querySelector('#'+id),start=area.selectionStart,end=area.selectionEnd,value=area.value.slice(start,end),mark=button.dataset.mark;if(mark==='link'||mark==='image'){selection={id,start,end,value,mark};app.querySelector('#'+id+'-link').hidden=false;app.querySelector('#'+id+'-link input').focus();return;}const wrapper=mark==='bold'?'**':'*';area.setRangeText(wrapper+(value||'text')+wrapper,start,end,'select');area.focus();return;}
  if(button.dataset.close){app.querySelector('#'+button.dataset.close+'-link').hidden=true;return;}
  const {id,start,end,value,mark}=selection,input=app.querySelector('#'+id+'-link input');let url;try{url=new URL(input.value);if(url.protocol!=='https:'||url.username||url.password)throw Error();}catch{app.querySelector('#unit-status').textContent='Enter a full HTTPS link.';return;}const area=app.querySelector('#'+id);area.setRangeText(mark==='image'?'[img]'+url.href+'[/img]':'['+(value||'link text')+']('+url.href+')',start,end,'end');app.querySelector('#'+id+'-link').hidden=true;input.value='';area.focus();
 });
}
// Downloads per unit, joined with the Vault's own card list for army and status.
async function activity(days=app.querySelector('#activity-period')?.value||''){
 const panel=app.querySelector('#activity-panel');if(!reports[days])panel.innerHTML='<p class="muted">Loading activity…</p>';
 const [report]=await Promise.all([loadReport(days),loadCatalogue().catch(()=>null)]);
 const percent=value=>new Intl.NumberFormat(undefined,{style:'percent',maximumFractionDigits:1}).format(value),cards=new Map(units().map(row=>[row.id,row])),removed=new Set(account.removedModels||[]);
 const rows=report.models.map(row=>{const card=cards.get(row.id),vault=account.unitCards.some(c=>c.id===row.id)||row.id.startsWith('unit-');return {...row,army:card?.group||'',tag:!card?(removed.has(row.id)||vault?'Removed':'Unlisted'):card.removeAt?'Removing':card.hidden?'Hidden':vault?'Vault':''};});
 const zero=rows.filter(row=>!row.total).length;
 panel.innerHTML=`<div class="panel-head"><h2>Site activity</h2><div class="inline-controls"><select id="activity-period" aria-label="Period"><option value="">All time</option><option value="30">Last 30 days</option><option value="7">Last 7 days</option></select><button type="button" class="secondary" id="activity-refresh">Refresh</button></div></div>
<div class="metrics"><div class="metric"><strong>${number(report.totals.pageLoads)}</strong><span>Page loads</span></div><div class="metric"><strong>${number(report.totals.uniqueVisitors)}</strong><span>Anonymous browsers</span></div><div class="metric"><strong>${number(report.totals.downloadClicks)}</strong><span>Download clicks</span></div><div class="metric"><strong>${number(report.applications[0]?.total)}</strong><span>MDLxL downloads</span></div></div>
<section class="downloads"><div class="panel-head"><h3>Downloads per unit</h3><input type="search" id="download-filter" placeholder="Filter units" aria-label="Filter units"></div><table class="download-table"><thead><tr><th scope="col"><button type="button" data-sort="name">Unit</button></th><th scope="col" class="army-column">Army</th><th scope="col" class="num"><button type="button" data-sort="mdxClicks">MDX</button></th><th scope="col" class="num"><button type="button" data-sort="packClicks">Pack</button></th><th scope="col" class="num"><button type="button" data-sort="total">Total</button></th></tr></thead><tbody></tbody></table><p class="hint">${rows.length} units · ${zero} without downloads yet. Counts are download-button clicks${days?' in the last '+days+' days':' since tracking began'}. New units appear here as soon as they are published.</p></section>
<details class="country-activity"><summary>Visitors by country · ${report.countries.length}</summary>${report.countries.length?`<table><thead><tr><th scope="col">Country</th><th scope="col" class="num">Anonymous browsers</th><th scope="col" class="num">Share</th></tr></thead><tbody>${report.countries.map(country=>`<tr><td>${escape(country.name)}</td><td class="num">${number(country.uniqueVisitors)}</td><td class="num">${percent(country.share)}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">No recorded visitors yet.</p>'}<p class="hint">Estimated from network location. Each browser counts once, using its first known country. Earlier or unavailable locations appear as Unknown.</p></details>
<p class="hint">Updated ${escape(new Date(report.asOf).toLocaleString())}.</p>`;
 const period=panel.querySelector('#activity-period'),filter=panel.querySelector('#download-filter'),body=panel.querySelector('tbody');period.value=days;
 const draw=()=>{const query=filter.value.trim().toLowerCase(),list=rows.filter(row=>!query||(row.name+' '+row.army+' '+row.tag).toLowerCase().includes(query)).sort(activitySort==='name'?(a,b)=>a.name.localeCompare(b.name):(a,b)=>b[activitySort]-a[activitySort]||a.name.localeCompare(b.name));body.innerHTML=list.length?list.map(row=>`<tr class="${row.total?'':'is-zero'}"><td>${escape(row.name)}${row.tag?` <span class="badge${row.tag==='Vault'?'':' muted-badge'}">${row.tag}</span>`:''}</td><td class="army-column">${escape(row.army)}</td><td class="num">${number(row.mdxClicks)}</td><td class="num">${number(row.packClicks)}</td><td class="num"><strong>${number(row.total)}</strong></td></tr>`).join(''):'<tr><td colspan="5" class="empty">No units match.</td></tr>';for(const button of panel.querySelectorAll('[data-sort]'))button.setAttribute('aria-pressed',String(button.dataset.sort===activitySort));};
 filter.oninput=draw;panel.querySelector('thead').onclick=event=>{const sort=event.target.closest('[data-sort]')?.dataset.sort;if(sort){activitySort=sort;draw();}};draw();
 period.onchange=()=>activity(period.value).then(renderUnits);
 panel.querySelector('#activity-refresh').onclick=()=>{delete loading[period.value];delete loading[''];activity(period.value).then(()=>loadReport()).then(renderUnits);};
}
async function loadVault(){account=await api('me');csrf=account.csrf;workspace();}
window.addEventListener('author-logout',()=>{clearDraft();login();});
loadVault().catch(error=>login(error.message==='Please log in.'?'':error.message));
