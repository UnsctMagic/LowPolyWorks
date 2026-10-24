import {put} from './vendor/blob-client.js';
import {postBody} from './post-format.js';
import {uploadImage} from './upload-workflow.js';
const app=document.querySelector('#vault-app'),SITE='https://www.lowpolyworks.com',PREFS='lowpolyworks.vault';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain=value=>String(value||'').replace(/\[url=[^\]]*\]([^[]*)\[\/url\]/gi,'$1').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/\[\/?[a-z]+[^\]]*\]|[*_`]/gi,'').replace(/\s+/g,' ').trim();
const number=value=>new Intl.NumberFormat().format(value||0);
let account,csrf='',files=[],ready=null,cardId='',editing=null,busy=false,controller,coverUrl='',requestId='',completed=new Map(),coverUpload=null,postsLoaded=false;
let catalogueRows=null,reports={},loading={},countdown;
const prefs=(()=>{try{return {query:'',army:'',status:'',source:'',sort:'army',...JSON.parse(localStorage.getItem(PREFS)||'{}')};}catch{return {query:'',army:'',status:'',source:'',sort:'army'};}})();
const savePrefs=()=>{try{localStorage.setItem(PREFS,JSON.stringify(prefs));}catch{}};
const activation=new URLSearchParams(location.hash.slice(1));if(location.hash)history.replaceState(null,'',location.pathname);
async function api(action,input,signal){const response=await fetch('/api/publishing?action='+action,{method:input?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:signal||AbortSignal.timeout(120000),headers:input?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{},body:input?JSON.stringify(input):undefined});const result=await response.json();if(!response.ok)throw Error(result.error||'Please try again.');return result;}
const owner=()=>account.author.role==='owner';
function login(message=''){
 const token=activation.get('invite')||activation.get('setup');app.innerHTML=`<section class="login"><h1>Vault of Secrets</h1><p class="hint">${token?'Create your invited author account.':'Sign in to upload unit cards and write posts.'}</p><form id="login-form"><label>Username<input name="username" autocomplete="username" maxlength="40" value="${escape(activation.get('username')||'UnsanctionedMagic')}" required></label>${token?'<label>Display name<input name="name" maxlength="60" required></label>':''}<label>${token?'Choose a password':'Password'}<input name="password" type="password" autocomplete="${token?'new-password':'current-password'}" ${token?'minlength="12"':''} maxlength="256" required></label><button type="submit">${token?'Create account':'Log in'}</button><p class="status" role="status">${escape(message)}</p></form></section>`;
 app.querySelector('form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{const input=Object.fromEntries(new FormData(event.target));await api(token?'activate':'login',token?{...input,token}:input);activation.delete('invite');activation.delete('setup');await loadVault(true);}catch(error){event.target.querySelector('.status').textContent=error.message;button.disabled=false;}};
}
function editorField(id,label,required=true){return `<label for="${id}">${label}</label><div class="editor-tools" data-editor="${id}" role="toolbar" aria-label="${label} formatting"><button type="button" data-mark="bold"><strong>B</strong></button><button type="button" data-mark="italic"><em>I</em></button><button type="button" data-mark="link">Link</button><button type="button" data-mark="image">Image</button></div><div class="editor-link-row" id="${id}-link" hidden><input type="url" placeholder="https://" aria-label="${label} link"><button type="button" data-insert="${id}">Insert</button><button type="button" data-close="${id}" class="secondary">Cancel</button></div><textarea id="${id}" name="${id}" maxlength="${id==='byline'?2000:20000}" rows="${id==='byline'?2:6}" ${required?'required':''}></textarea>`;}
const armyOptions=(selected='')=>account.unitArmies.map(a=>`<option value="${escape(a.id)}" ${a.id===selected?'selected':''}>${escape(a.name)}</option>`).join('');
function workspace(){
 postsLoaded=false;
 app.innerHTML=`<div class="vault-top"><div><h1>Vault of Secrets</h1><p class="muted">${escape(account.author.name)}${owner()?' <span class="badge">Admin</span>':''}</p></div><button id="logout" class="secondary">Log out</button></div>
<nav class="vault-nav" aria-label="Workspace"><button data-tab="units">Unit cards</button><button data-tab="upload">New unit card</button><button data-tab="posts">Posts &amp; account</button>${owner()?'<button data-tab="activity">Activity</button><button data-tab="stash">Shredder&#39;s Stash</button>':''}</nav>
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
<section id="posts-panel" hidden><div id="author-app"></div></section><section id="activity-panel" hidden></section><section id="stash-panel" hidden></section>`;
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
 for(const name of ['units','catalogue','upload','posts','activity','stash'])app.querySelector('#'+name+'-panel').hidden=name!==panel;
 for(const button of app.querySelectorAll('[data-tab]')){const current=button.dataset.tab===(tab==='catalogue'?'units':tab);if(current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
 const run=async()=>{if(tab==='posts'&&!postsLoaded){postsLoaded=true;const editor=await import('./author.js?v=20261009-unit-upload');await editor.start();}if(tab==='activity')await activity();if(tab==='stash')await stash();if(tab==='units')renderUnits();};
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
 const d=row.downloads,count=reports['']?`<div class="unit-downloads" title="${d?`MDX ${d.mdxClicks} · Pack ${d.packClicks} · ${d.views||0} views`:'No downloads yet'}"><strong>${number(d?.total)}</strong><span>downloads</span></div>`:owner()?'<div class="unit-downloads"><strong>–</strong><span>downloads</span></div>':'';
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
// Activity: one all-time report, sliced in the browser by army, unit, file type and time step.
const GRAINS={day:{label:'Day',count:30,range:'last 30 days'},week:{label:'Week',count:26,range:'last 26 weeks'},month:{label:'Month',count:12,range:'last 12 months'},year:{label:'Year',count:10,range:'all years'}};
// Keys are calendar dates; utc() only does date arithmetic on them. Today follows Amsterdam time, like the stored days.
const DAY=86400000,utc=key=>Date.parse(key+'T00:00:00Z'),iso=time=>new Date(time).toISOString().slice(0,10),amsterdamDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}),today=()=>amsterdamDay.format(new Date());
function bucketStart(key,grain){const d=new Date(utc(key));if(grain==='week')d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));if(grain==='month'||grain==='year')d.setUTCDate(1);if(grain==='year')d.setUTCMonth(0);return iso(d.getTime());}
function nextBucket(key,grain){const d=new Date(utc(key));if(grain==='day')d.setUTCDate(d.getUTCDate()+1);if(grain==='week')d.setUTCDate(d.getUTCDate()+7);if(grain==='month')d.setUTCMonth(d.getUTCMonth()+1);if(grain==='year')d.setUTCFullYear(d.getUTCFullYear()+1);return iso(d.getTime());}
function previousBucket(key,grain,steps){const d=new Date(utc(key));if(grain==='day')d.setUTCDate(d.getUTCDate()-steps);if(grain==='week')d.setUTCDate(d.getUTCDate()-7*steps);if(grain==='month')d.setUTCMonth(d.getUTCMonth()-steps);if(grain==='year')d.setUTCFullYear(d.getUTCFullYear()-steps);return iso(d.getTime());}
// The visible buckets end today and never start before tracking began.
function buckets(grain,since){
 const end=bucketStart(today(),grain),first=bucketStart(since,grain),{count}=GRAINS[grain];
 let start=previousBucket(end,grain,count-1);if(start<first)start=first;
 const list=[];for(let key=start;key<=end;key=nextBucket(key,grain))list.push(key);
 return {list,start,end:nextBucket(end,grain),clipped:start===first};
}
const monthName=(key,style='short')=>new Date(utc(key)).toLocaleDateString(undefined,{month:style,timeZone:'UTC'});
function bucketLabel(key,grain,long=false){
 const d=new Date(utc(key)),day=d.toLocaleDateString(undefined,{day:'numeric',month:'short',timeZone:'UTC'});
 if(grain==='day')return long?d.toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):day;
 if(grain==='week')return long?'Week of '+day+' '+d.getUTCFullYear():day;
 if(grain==='month')return long?monthName(key,'long')+' '+d.getUTCFullYear():monthName(key)+(d.getUTCMonth()===0?' '+d.getUTCFullYear():'');
 return String(d.getUTCFullYear());
}
function niceScale(max){if(max<=0)return {top:1,step:1};const rough=max/3,power=10**Math.floor(Math.log10(rough)),step=[1,2,5,10].map(n=>n*power).find(n=>n>=rough)||power*10,top=Math.ceil(max/step)*step;return {top,step:Math.max(1,step)};}
const activity_state=(()=>({army:'',unit:'',format:'',grain:'day',sort:'total',query:'',...(prefs.activity||{})}))();
const saveActivity=()=>{prefs.activity=activity_state;savePrefs();};
function unitIndex(report){
 const index=new Map(units().map(row=>[row.id,{id:row.id,name:row.id==='nurgle'?'Knight of Nurgle - Old':row.name,army:row.army,group:row.group||'Other projects',tag:row.removeAt?'Removing':row.hidden?'Hidden':row.kind==='vault'?'Vault':''}])),removed=new Set(account.removedModels||[]);
 for(const row of report.models)if(!index.has(row.id))index.set(row.id,{id:row.id,name:row.name,army:'',group:'Removed or unlisted',tag:removed.has(row.id)||row.id.startsWith('unit-')?'Removed':'Unlisted'});
 return index;
}
// Shredder's Stash: how other people play with Shredder. Counts come batched from the site and never include opted-out browsers.
async function stash(){
 const panel=app.querySelector('#stash-panel');panel.textContent='Opening the stash…';
 const report=await api('analytics'),stats=report.shredder,number=value=>new Intl.NumberFormat().format(value||0);
 const rows=[['peek','Played with his peeking','Times they made him duck while he peeked'],['grab','Caught a falling peanut','Peanuts grabbed out of the air'],['feed','Fed him peanuts','Peanuts they threw that he caught'],['crack','Cracked a shell','Hard throws that broke the shell'],['follow','Led him across menus','Menu changes with a peanut in hand'],['attack','Sent him on a Bird Attack','Units he dived through in a model preview']];
 const metric=(value,label)=>`<div class="metric"><strong>${number(value)}</strong><span>${label}</span></div>`;
 panel.innerHTML=`<h2>Shredder's Stash</h2><div class="metrics">${metric(stats.people,'People who played with him')}${metric(stats.interactions.feed.count,'Peanuts fed')}${metric(stats.interactions.feed.people,'People who fed him')}</div><table><thead><tr><th scope="col">What they did</th><th scope="col">People</th><th scope="col">Times</th></tr></thead><tbody>${rows.map(([kind,label,detail])=>`<tr><td>${label}<br><span class="hint">${detail}</span></td><td>${number(stats.interactions[kind].people)}</td><td>${number(stats.interactions[kind].count)}</td></tr>`).join('')}</tbody></table><p class="hint" style="margin-top:12px">People are anonymous browsers. Your own play is never counted: browsers that opened the site with the opt-out link, the peanut test view and localhost send nothing. ${optOutSaved===false?'<strong>This browser blocks site storage, so it could not be excluded automatically.</strong> ':'This browser is excluded again every time you log in to the Vault. '}On a device where you don\'t open the Vault, use <a href="https://www.lowpolyworks.com/?tracking-opt-out" target="_blank" rel="noopener">Exclude this browser</a>. ${stats.lastPlayedAt?'Last play recorded '+escape(new Date(stats.lastPlayedAt).toLocaleString())+'.':'No play recorded yet.'} Updated ${escape(new Date(report.asOf).toLocaleString())}.</p>`;
}
// MDLxL in-app updates, beside GitHub's count of every release ZIP download (the website button and the updater together).
const releaseDownloads=fetch('https://api.github.com/repos/UnsctMagic/MDLxL/releases?per_page=100',{headers:{Accept:'application/vnd.github+json'}}).then(r=>r.ok?r.json():null).then(list=>list&&new Map(list.filter(r=>!r.draft).map(r=>{const version=r.tag_name.replace(/^v/,'');return [version,r.assets.find(a=>a.name===`MDLxL-${version}-win32-x64.zip`)?.download_count||0];}))).catch(()=>null);
function mdlxlUpdates(updates){
 return `<details class="country-activity" id="mdlxl-updates" open><summary>MDLxL in-app updates · ${number(updates.downloads)}</summary><div class="metrics"><div class="metric"><strong>${number(updates.downloads)}</strong><span>Updates installed in the app</span></div><div class="metric"><strong id="zip-total">…</strong><span>All release ZIP downloads (GitHub)</span></div></div><table><thead><tr><th scope="col">Version</th><th scope="col" class="num">In-app updates</th><th scope="col" class="num">All ZIP downloads</th></tr></thead><tbody></tbody></table><p class="hint">In-app updates count each update MDLxL installs through its own updater, starting with updates to MDLxL 0.31.0. All ZIP downloads come from GitHub and include the website button, the updater and direct downloads. The table lists the five newest versions; the totals above cover every version. ${updates.lastDownloadedAt?'Last update recorded '+escape(new Date(updates.lastDownloadedAt).toLocaleString())+'.':'No in-app update recorded yet.'}</p></details>`;
}
async function fillMdlxlUpdates(panel,updates){
 const section=panel.querySelector('#mdlxl-updates'),body=section.querySelector('tbody'),own=new Map(updates.versions.map(row=>[row.version,row])),row=(version,zips)=>`<tr><td>${escape(version)}</td><td class="num">${number(own.get(version)?.downloads)}</td><td class="num">${zips===undefined?'…':zips===null?'—':number(zips)}</td></tr>`;
 const newest=(a,b)=>b.split('.').reduce((order,part,i)=>order||Number(part)-Number(a.split('.')[i]),0);
 body.innerHTML=updates.versions.slice(0,5).map(r=>row(r.version)).join('');
 const github=await releaseDownloads;if(!section.isConnected)return;
 section.querySelector('#zip-total').textContent=github?number([...github.values()].reduce((a,b)=>a+b,0)):'—';
 const versions=[...new Set([...own.keys(),...github?.keys()||[]])].filter(v=>/^\d+\.\d+\.\d+$/.test(v)).sort(newest).slice(0,5);
 body.innerHTML=versions.length?versions.map(v=>row(v,github?github.get(v)??0:null)).join(''):'<tr><td colspan="3" class="empty">No releases yet.</td></tr>';
}
async function activity(){
 const panel=app.querySelector('#activity-panel');if(!reports[''])panel.innerHTML='<p class="muted">Loading activity…</p>';
 const [report]=await Promise.all([loadReport(),loadCatalogue().catch(()=>null)]);
 const firstView=report.timeline.find(row=>row[1]==='view')?.[0],index=unitIndex(report),state=activity_state,since=(report.trackingSince||report.timeline[0]?.[0]||today()).slice(0,10);
 if(state.unit&&state.unit!=='mdlxl'&&!index.has(state.unit))state.unit='';
 panel.innerHTML=`<div class="panel-head"><h2>Site activity</h2><div class="inline-controls"><span class="hint">Updated ${escape(new Date(report.asOf).toLocaleString())}</span><button type="button" class="secondary" id="activity-refresh">Refresh</button></div></div>
<div class="metrics"><div class="metric"><strong>${number(report.totals.pageLoads)}</strong><span>Page loads</span></div><div class="metric"><strong>${number(report.totals.uniqueVisitors)}</strong><span>Anonymous browsers</span></div><div class="metric"><strong>${number(report.totals.downloadClicks)}</strong><span>Download clicks</span></div><div class="metric"><strong>${number(report.totals.modelViews)}</strong><span>Model views</span></div></div>
<div class="insights"><aside class="picker" aria-label="Choose what to chart"><label>Army<select id="pick-army"><option value="">All units</option>${account.unitArmies.map(a=>`<option value="${escape(a.id)}">${escape(a.name)}</option>`).join('')}<option value="other">Other projects</option><option value="mdlxl">MDLxL application</option></select></label><label class="pick-search">Unit<input type="search" id="pick-search" placeholder="Find a unit" autocomplete="off"></label><ul class="pick-list" id="pick-list"></ul><div class="seg" role="group" aria-label="File type" id="pick-format"><button type="button" data-format="">All files</button><button type="button" data-format="mdx">MDX</button><button type="button" data-format="pack">Pack</button></div></aside>
<div class="charts"><div class="chart-toolbar"><div class="seg" role="group" aria-label="Time step" id="pick-grain">${Object.entries(GRAINS).map(([key,grain])=>`<button type="button" data-grain="${key}">${grain.label}</button>`).join('')}</div><span class="range-label" id="range-label"></span></div>
<figure class="chart" data-metric="download"><figcaption><div><h3>Downloads</h3><p class="chart-scope"></p></div><div class="chart-total"><strong></strong><small></small></div><button type="button" class="link-button" data-table>Table</button></figcaption><div class="plot"></div><div class="bucket-models" hidden></div></figure>
<figure class="chart" data-metric="view"><figcaption><div><h3>Model views</h3><p class="chart-scope"></p></div><div class="chart-total"><strong></strong><small></small></div><button type="button" class="link-button" data-table>Table</button></figcaption><div class="plot"></div></figure></div></div>
<section class="downloads"><div class="panel-head"><h3 id="unit-table-title">Per unit</h3></div><table class="download-table"><thead><tr><th scope="col"><button type="button" data-sort="name">Unit</button></th><th scope="col" class="army-column">Army</th><th scope="col" class="num"><button type="button" data-sort="views">Views</button></th><th scope="col" class="num"><button type="button" data-sort="mdx">MDX</button></th><th scope="col" class="num"><button type="button" data-sort="pack">Pack</button></th><th scope="col" class="num"><button type="button" data-sort="total">Downloads</button></th></tr></thead><tbody></tbody></table><p class="hint" id="unit-table-hint"></p><p class="hint">Downloads and views here follow the time step above. In the Unit cards tab, counts are all-time.</p></section>
<details class="country-activity"><summary>Visitors by country · ${report.countries.length}</summary>${report.countries.length?`<table><thead><tr><th scope="col">Country</th><th scope="col" class="num">Anonymous browsers</th><th scope="col" class="num">Share</th></tr></thead><tbody>${report.countries.map(country=>`<tr><td>${escape(country.name)}</td><td class="num">${number(country.uniqueVisitors)}</td><td class="num">${new Intl.NumberFormat(undefined,{style:'percent',maximumFractionDigits:1}).format(country.share)}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">No recorded visitors yet.</p>'}<p class="hint">Estimated from network location. Each browser counts once, using its first known country.</p></details>
${mdlxlUpdates(report.updates||{downloads:0,versions:[]})}
<p class="hint">Downloads are download-button clicks. Model views count a browser opening a model page, at most once per model per day; ${firstView?'recorded since '+escape(bucketLabel(firstView,'day',true)):'not recorded yet'}. Days follow Amsterdam time.</p>`;
 fillMdlxlUpdates(panel,report.updates||{downloads:0,versions:[]});
 const $=selector=>panel.querySelector(selector),tables=new Set();let picked='';
 $('#pick-army').value=state.army;$('#pick-search').value=state.query;
 const inArmy=id=>state.army==='mdlxl'?id==='mdlxl':id!=='mdlxl'&&(!state.army||index.get(id)?.army===state.army);
 const matches=([,kind,model,format])=>(state.unit?model===state.unit:inArmy(model))&&(kind==='view'||!state.format||state.army==='mdlxl'||format===state.format);
 const scopeName=()=>state.unit?(state.unit==='mdlxl'?'MDLxL application':index.get(state.unit)?.name||state.unit):state.army==='mdlxl'?'MDLxL application':state.army?(state.army==='other'?'Other projects':account.unitArmies.find(a=>a.id===state.army)?.name):'All units';
 function draw(){
  const grain=state.grain,{list,start,end,clipped}=buckets(grain,since),position=new Map(list.map((key,i)=>[key,i])),prevStart=previousBucket(start,grain,list.length);
  const series={download:list.map(()=>({total:0,mdx:0,pack:0})),view:list.map(()=>({total:0}))},previous={download:0,view:0},perUnit=new Map(),byModel=list.map(()=>new Map());
  for(const row of report.timeline){
   const [date,kind,model,format,count]=row;if(kind!=='download'&&kind!=='view')continue;
   if(date>=start&&date<end&&model!=='mdlxl'&&state.army!=='mdlxl'&&inArmy(model)){const entry=perUnit.get(model)||{views:0,mdx:0,pack:0,total:0};if(kind==='view')entry.views+=count;else{entry.total+=count;entry[format==='pack'?'pack':'mdx']+=count;}perUnit.set(model,entry);}
   if(!matches(row))continue;
   if(date>=start&&date<end){const i=position.get(bucketStart(date,grain)),bucket=series[kind][i],slot=format==='pack'?'pack':'mdx';bucket.total+=count;if(kind==='download'){bucket[slot]+=count;const m=byModel[i].get(model)||{mdx:0,pack:0,total:0};m[slot]+=count;m.total+=count;byModel[i].set(model,m);}}
   else if(date>=prevStart&&date<start)previous[kind]+=count;
  }
  $('#range-label').textContent=(clipped&&grain!=='year'?'Since tracking began · ':'')+bucketLabel(list[0],grain,true)+' – '+bucketLabel(list.at(-1),grain,true);
  for(const button of panel.querySelectorAll('[data-grain]'))button.setAttribute('aria-pressed',String(button.dataset.grain===grain));
  for(const button of panel.querySelectorAll('[data-format]'))button.setAttribute('aria-pressed',String(button.dataset.format===state.format));
  $('#pick-format').hidden=state.army==='mdlxl'||state.unit==='mdlxl';
  for(const figure of panel.querySelectorAll('.chart')){
   const metric=figure.dataset.metric,values=series[metric],total=values.reduce((sum,v)=>sum+v.total,0),prevOk=prevStart>=bucketStart(since,grain)&&!clipped,delta=total-previous[metric];
   const noViews=metric==='view'&&(state.army==='mdlxl'||state.unit==='mdlxl');
   figure.hidden=noViews;
   figure.querySelector('.chart-scope').textContent=scopeName()+(metric==='download'&&state.format&&state.army!=='mdlxl'?' · '+state.format.toUpperCase()+' only':'');
   figure.querySelector('.chart-total strong').textContent=number(total);
   figure.querySelector('.chart-total small').textContent=prevOk?(delta===0?'Same as':delta>0?'▲ '+number(delta)+' vs':'▼ '+number(-delta)+' vs')+' previous '+GRAINS[grain].range.replace('last ',''):'in range';
   const plot=figure.querySelector('.plot');
   if(tables.has(metric))plot.innerHTML=`<table class="bucket-table"><thead><tr><th scope="col">${GRAINS[grain].label}</th>${metric==='download'?'<th scope="col" class="num">MDX</th><th scope="col" class="num">Pack</th>':''}<th scope="col" class="num">${metric==='download'?'Downloads':'Views'}</th></tr></thead><tbody>${list.map((key,i)=>`<tr${metric==='download'&&values[i].total?` data-bucket="${key}" class="pickable${picked===key?' is-selected':''}"`:''}><td>${escape(bucketLabel(key,grain,true))}</td>${metric==='download'?`<td class="num">${number(values[i].mdx)}</td><td class="num">${number(values[i].pack)}</td>`:''}<td class="num">${number(values[i].total)}</td></tr>`).reverse().join('')}</tbody></table>`;
   else barChart(plot,list.map((key,i)=>({key,label:bucketLabel(key,grain),long:bucketLabel(key,grain,true),...values[i]})),{metric,colour:metric==='download'?'#b58a35':'#3f86c8',noun:metric==='download'?'download':'view',format:state.format,picked:metric==='download'?picked:'',onPick:metric==='download'?key=>{picked=picked===key?'':key;draw();}:null});
   figure.querySelector('[data-table]').textContent=tables.has(metric)?'Chart':'Table';
  }
  drawBucketModels(list,byModel);
  drawPicker(perUnit,series.download.reduce((sum,v)=>sum+v.total,0));drawUnits(perUnit,GRAINS[grain].range);
 }
 // Which models made up one bucket of the Downloads chart, under the same army/unit/file filters.
 function drawBucketModels(list,byModel){
  const box=panel.querySelector('.bucket-models'),i=list.indexOf(picked);
  if(i<0||!byModel[i].size){picked='';box.hidden=true;box.innerHTML='';return;}
  const name=id=>id==='mdlxl'?'MDLxL application':index.get(id)?.name||id,rows=[...byModel[i]].sort((a,b)=>b[1].total-a[1].total||name(a[0]).localeCompare(name(b[0])));
  box.hidden=false;
  box.innerHTML=`<div class="bucket-models-head"><strong>${escape(bucketLabel(picked,state.grain,true))}</strong><span>${number(rows.reduce((s,[,m])=>s+m.total,0))} downloads · ${rows.length} model${rows.length===1?'':'s'}</span><button type="button" class="link-button" data-bucket-close>Close</button></div><table><thead><tr><th scope="col">Model</th><th scope="col" class="num">MDX</th><th scope="col" class="num">Pack</th><th scope="col" class="num">Downloads</th></tr></thead><tbody>${rows.map(([id,m])=>`<tr><td>${escape(name(id))}</td><td class="num">${number(m.mdx)}</td><td class="num">${number(m.pack)}</td><td class="num"><strong>${number(m.total)}</strong></td></tr>`).join('')}</tbody></table>`;
 }
 function drawPicker(perUnit,mdlxlTotal){
  const query=state.query.trim().toLowerCase(),armyUnits=[...index.values()].filter(row=>inArmy(row.id)&&(!query||(row.name+' '+row.group).toLowerCase().includes(query)));
  armyUnits.sort((a,b)=>(perUnit.get(b.id)?.total||0)-(perUnit.get(a.id)?.total||0)||a.name.localeCompare(b.name));
  const all={total:0,views:0};for(const [id,row] of perUnit)if(inArmy(id)){all.total+=row.total;all.views+=row.views;}
  const item=(id,name,counts,extra='',views=true)=>`<li><button type="button" data-unit="${escape(id)}" aria-pressed="${state.unit===id}"><span>${escape(name)}${extra}</span><small title="${views?'Downloads · views':'Downloads'} in range">${number(counts?.total)}${views?' · '+number(counts?.views):''}</small></button></li>`;
  $('#pick-list').innerHTML=state.army==='mdlxl'?item('mdlxl','MDLxL application',{total:mdlxlTotal},'',false):item('','All '+(state.army?scopeNameForArmy():'units'),all)+armyUnits.map(row=>item(row.id,row.name,perUnit.get(row.id),row.tag?` <em>${row.tag}</em>`:'')).join('')+(armyUnits.length?'':'<li class="empty">No units match.</li>');
 }
 const scopeNameForArmy=()=>state.army==='other'?'other projects':'in '+(account.unitArmies.find(a=>a.id===state.army)?.name||'army');
 function drawUnits(perUnit,range){
  const query=state.query.trim().toLowerCase(),rows=[...index.values()].filter(row=>row.id!=='mdlxl'&&state.army!=='mdlxl'&&inArmy(row.id)&&(!query||(row.name+' '+row.group).toLowerCase().includes(query))).map(row=>({...row,views:0,mdx:0,pack:0,total:0,...perUnit.get(row.id)}));
  const key=state.sort;rows.sort(key==='name'?(a,b)=>a.name.localeCompare(b.name):(a,b)=>b[key]-a[key]||b.total-a.total||a.name.localeCompare(b.name));
  $('#unit-table-title').textContent='Per unit · '+range;
  panel.querySelector('.download-table tbody').innerHTML=rows.length?rows.map(row=>`<tr class="${row.total||row.views?'':'is-zero'}${state.unit===row.id?' is-selected':''}" data-unit="${escape(row.id)}"><td><button type="button" class="row-pick" data-unit="${escape(row.id)}">${escape(row.name)}</button>${row.tag?` <span class="badge${row.tag==='Vault'?'':' muted-badge'}">${row.tag}</span>`:''}</td><td class="army-column">${escape(row.group)}</td><td class="num">${number(row.views)}</td><td class="num">${number(row.mdx)}</td><td class="num">${number(row.pack)}</td><td class="num"><strong>${number(row.total)}</strong></td></tr>`).join(''):'<tr><td colspan="6" class="empty">'+(state.army==='mdlxl'?'MDLxL is an application, not a unit.':'No units match.')+'</td></tr>';
  for(const button of panel.querySelectorAll('[data-sort]'))button.setAttribute('aria-pressed',String(button.dataset.sort===key));
  $('#unit-table-hint').textContent=`${rows.length} units · ${rows.filter(row=>!row.total).length} without downloads in this range. Select a unit to chart it.`;
 }
 const update=()=>{saveActivity();draw();};
 $('#pick-army').onchange=event=>{state.army=event.target.value;state.unit=state.army==='mdlxl'?'mdlxl':'';update();};
 $('#pick-search').oninput=event=>{state.query=event.target.value;update();};
 panel.onclick=event=>{
  if(event.target.closest('[data-bucket-close]')){picked='';draw();return;}
  const bucketRow=event.target.closest('tr[data-bucket]');if(bucketRow){picked=picked===bucketRow.dataset.bucket?'':bucketRow.dataset.bucket;draw();return;}
  const target=event.target.closest('[data-unit],[data-format],[data-grain],[data-sort],[data-table]');if(!target)return;
  if(target.dataset.unit!==undefined&&target.closest('.picker,.download-table')){state.unit=state.unit===target.dataset.unit&&target.dataset.unit?'':target.dataset.unit;if(state.army==='mdlxl')state.unit='mdlxl';}
  else if(target.dataset.format!==undefined)state.format=target.dataset.format;
  else if(target.dataset.grain)state.grain=target.dataset.grain;
  else if(target.dataset.sort)state.sort=target.dataset.sort;
  else if(target.hasAttribute('data-table')){const metric=target.closest('.chart').dataset.metric;if(tables.has(metric))tables.delete(metric);else tables.add(metric);}
  else return;
  update();
 };
 $('#activity-refresh').onclick=()=>{delete loading[''];activity().then(renderUnits);};
 resizeCharts?.disconnect();let width=0;resizeCharts=new ResizeObserver(entries=>{const next=Math.round(entries[0].contentRect.width);if(next!==width){width=next;draw();}});resizeCharts.observe($('.charts'));
 draw();
}
let resizeCharts;
// Single-series column chart: thin rounded columns from one baseline, recessive grid, one peak label and a hover tooltip.
function barChart(plot,data,{colour,noun,format,picked='',onPick=null}){
 const width=Math.max(260,plot.clientWidth||600),height=190,left=34,right=8,top=20,bottom=24,inner=width-left-right,chart=height-top-bottom;
 const max=Math.max(0,...data.map(d=>d.total)),{top:ceiling,step}=niceScale(max),slot=inner/data.length,bar=Math.max(2,Math.min(24,slot*.68)),y=value=>top+chart-value/ceiling*chart;
 const ticks=[];for(let value=0;value<=ceiling;value+=step)ticks.push(value);
 const every=Math.max(1,Math.ceil(46/slot)),peak=max?data.findIndex(d=>d.total===max):-1;
 const column=(d,i)=>{if(!d.total)return '';const x=left+i*slot+(slot-bar)/2,h=Math.max(1,chart-(y(d.total)-top)),r=Math.min(4,bar/2,h),base=top+chart;return `<path class="bar${picked===d.key?' picked':''}" d="M${x},${base}V${base-h+r}Q${x},${base-h} ${x+r},${base-h}H${x+bar-r}Q${x+bar},${base-h} ${x+bar},${base-h+r}V${base}Z" fill="${colour}" data-i="${i}"/>`;};
 plot.innerHTML=`<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escape(`${data.reduce((s,d)=>s+d.total,0)} ${noun}s from ${data[0].long} to ${data.at(-1).long}; most in ${max?data[peak].long+' ('+max+')':'no period'}`)}">
${ticks.map(value=>`<line x1="${left}" x2="${width-right}" y1="${y(value)}" y2="${y(value)}" class="grid${value===0?' base':''}"/><text x="${left-6}" y="${y(value)+4}" class="tick" text-anchor="end">${number(value)}</text>`).join('')}
${data.map(column).join('')}
${data.map((d,i)=>(i%every===0&&data.length-1-i>=every)||i===data.length-1?`<text x="${left+i*slot+slot/2}" y="${height-7}" class="tick" text-anchor="middle">${escape(d.label)}</text>`:'').join('')}
${peak>=0?`<text x="${left+peak*slot+slot/2}" y="${y(max)-6}" class="peak" text-anchor="middle">${number(max)}</text>`:''}
${data.map((d,i)=>`<rect class="hit${onPick&&d.total?' pickable':''}" x="${left+i*slot}" y="${top}" width="${slot}" height="${chart}" data-i="${i}"/>`).join('')}
</svg>${max?'':`<p class="chart-empty">No ${noun}s in this range.</p>`}<div class="chart-tip" hidden></div>`;
 const tip=plot.querySelector('.chart-tip'),svg=plot.querySelector('svg');
 svg.onpointermove=event=>{
  const i=Number(event.target.dataset?.i);if(!event.target.classList.contains('hit')||Number.isNaN(i)){tip.hidden=true;svg.classList.remove('hovering');return;}
  const d=data[i];svg.classList.add('hovering');for(const path of svg.querySelectorAll('.bar'))path.classList.toggle('active',Number(path.dataset.i)===i);
  tip.innerHTML=`<strong>${number(d.total)} ${noun}${d.total===1?'':'s'}</strong><span>${escape(d.long)}</span>${noun==='download'&&!format&&d.total?`<span>MDX ${number(d.mdx)} · Pack ${number(d.pack)}</span>`:''}${onPick&&d.total?'<span>Click to see models</span>':''}`;
  tip.hidden=false;const box=plot.getBoundingClientRect(),x=(left+i*slot+slot/2)/width*box.width;tip.style.left=Math.min(Math.max(x,70),box.width-70)+'px';tip.style.top=Math.max(0,(y(d.total)/height)*box.height-8)+'px';
 };
 svg.onpointerleave=()=>{tip.hidden=true;svg.classList.remove('hovering');};
 if(onPick)svg.onclick=event=>{const i=Number(event.target.dataset?.i);if(event.target.classList.contains('hit')&&data[i]?.total)onPick(data[i].key);};
}
// The owner's statistics opt-out lives in www.lowpolyworks.com's own storage, which browsers clear on their own schedule
// and never share with this origin. Renew it with a quick round trip to the site's opt-out page on every login,
// and at least every few hours while a session stays open. The site sends us back with #opted-out=1 (or 0 if storage is blocked).
const OPT_OUT_KEY='lowpolyworks.vault.optOutRenewedAt',OPT_OUT_EVERY=6*60*60*1000;
const OPT_OUT_SITE=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?'http://127.0.0.1:4178':SITE;
let optOutSaved=null;
function renewOptOut(login){
 if(activation.has('opted-out')){optOutSaved=activation.get('opted-out')==='1';activation.delete('opted-out');try{localStorage.setItem(OPT_OUT_KEY,String(Date.now()));}catch{}return false;}
 let last=0;try{last=Number(localStorage.getItem(OPT_OUT_KEY))||0;}catch{}
 if(!login&&Date.now()-last<OPT_OUT_EVERY)return false;
 location.replace(OPT_OUT_SITE+'/opt-out.html?return='+encodeURIComponent(location.origin+location.pathname));
 return true;
}
async function loadVault(login=false){account=await api('me');csrf=account.csrf;if(owner()&&renewOptOut(login))return;workspace();}
window.addEventListener('author-logout',()=>{clearDraft();login();});
loadVault().catch(error=>login(error.message==='Please log in.'?'':error.message));
