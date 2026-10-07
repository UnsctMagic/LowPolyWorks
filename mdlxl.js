const REPO='https://github.com/UnsctMagic/MDLxL';
const API='https://api.github.com/repos/UnsctMagic/MDLxL';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections={updates:'Patch updates',about:'About MDLxL',preview:'Preview',tutorials:'Tutorials',credits:'Credits'};

// Render release prose as text and a small set of Markdown elements, never raw HTML.
function inline(text){
 const tokens=/(`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*)/g;
 return text.split(tokens).map(part=>{
  if(part.startsWith('`')&&part.endsWith('`'))return `<code>${escape(part.slice(1,-1))}</code>`;
  const link=part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
  if(link)return `<a href="${escape(link[2])}" target="_blank" rel="noopener noreferrer">${escape(link[1])}</a>`;
  if(part.startsWith('**')&&part.endsWith('**'))return `<strong>${escape(part.slice(2,-2))}</strong>`;
  return escape(part);
 }).join('');
}
export function markdown(text){
 let html='',list='',code=null,paragraph=[];
 const flush=()=>{if(paragraph.length){html+=`<p>${inline(paragraph.join(' '))}</p>`;paragraph=[];}if(list){html+=`</${list}>`;list='';}};
 for(const line of String(text).replace(/\r/g,'').split('\n')){
  if(line.startsWith('```')){flush();if(code!==null){html+=`<pre><code>${escape(code.join('\n'))}</code></pre>`;code=null;}else code=[];continue;}
  if(code!==null){code.push(line);continue;}
  if(!line.trim()){flush();continue;}
  const heading=line.match(/^(#{1,6})\s+(.+)/),item=line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)/);
  if(heading){flush();const level=Math.min(heading[1].length+1,6);html+=`<h${level}>${inline(heading[2])}</h${level}>`;}
  else if(item){const type=item[1]?'ul':'ol';if(paragraph.length||list!==type){flush();html+=`<${type}>`;list=type;}html+=`<li>${inline(item[2])}</li>`;}
  else{if(list)flush();paragraph.push(line);}
 }
 flush();if(code!==null)html+=`<pre><code>${escape(code.join('\n'))}</code></pre>`;return html;
}
export function notesSource(release){
 const match=String(release.body||'').match(/\[English\]\((https:\/\/github\.com\/UnsctMagic\/MDLxL\/blob\/[^\s)]+)\)/i);
 return match?match[1].replace('https://github.com/UnsctMagic/MDLxL/blob/','https://raw.githubusercontent.com/UnsctMagic/MDLxL/'):null;
}
export function downloadUrl(release){return release.assets?.find(a=>/^MDLxL-[\d.]+-win32-x64\.zip$/i.test(a.name))?.browser_download_url||REPO+'/releases/latest';}
async function json(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('GitHub is temporarily unavailable.');return response.json();}
async function notes(release){const url=notesSource(release);if(!url)return release.body||'No patch notes were included with this release.';const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Patch notes could not be loaded.');return response.text();}
const prose=lines=>lines.map(line=>`<p>${escape(line.replace(/^- /,''))}</p>`).join('');
function contentSection(section,data){
 if(section==='preview')return '<h2>Preview</h2><div class="mdlxl-placeholder"><span aria-hidden="true">◇</span><h3>A look inside MDLxL</h3><p>Screenshots are coming soon.</p></div>';
 if(section==='tutorials')return '<h2>Tutorials</h2><div class="mdlxl-placeholder"><span aria-hidden="true">✧</span><h3>From the first vertex onwards</h3><p>Tutorials are coming soon.</p></div>';
 if(section==='credits')return `<h2>Credits & acknowledgements</h2>${prose(data.creditIntro)}${data.credits.map(group=>`<section class="mdlxl-text-group"><h3>${escape(group.title)}</h3>${prose(group.lines)}</section>`).join('')}`;
 if(section==='about')return `<h2>A dream for more CTRL+Z.</h2>${prose(data.intro)}<section class="mdlxl-text-group"><h3>In the author's words</h3>${prose(data.story)}</section><h2 class="mdlxl-features-heading">Inside the workshop</h2>${data.features.map(group=>`<section class="mdlxl-text-group"><h3>${escape(group.title)}</h3>${prose(group.lines)}</section>`).join('')}${prose(data.closing)}`;
 return '<div class="mdlxl-section-heading"><h2>Patch updates</h2><a href="'+REPO+'/releases" target="_blank" rel="noopener noreferrer">All releases ↗</a></div><p class="mdlxl-muted">The latest published changes, directly from GitHub.</p><div id="mdlxl-releases" aria-live="polite"><p>Loading patch notes…</p></div>';
}
export async function renderMdlxl(app,isCurrent){
 const requested=location.hash.split('/')[2]||'updates',section=Object.hasOwn(sections,requested)?requested:'updates';
 document.title=`${sections[section]} — MDLxL — LowPolyWorks`;
 app.innerHTML=`<section class="mdlxl-hero slab"><img src="ui/mdlxl-icon.png" alt="MDLxL helmet: half wireframe, half textured" width="128" height="128"><div class="mdlxl-identity"><p class="kicker">THE WARCRAFT III MODEL WORKSHOP</p><h1>MDLxL</h1><p>You wanted more CTRL Z? You got this</p><small>Built for Warcraft III SD models.</small></div><div class="mdlxl-download"><a id="mdlxl-download" class="iron-button primary" href="${REPO}/releases/latest">Download latest ↗</a><span id="mdlxl-version">Windows · Portable ZIP</span></div></section><div class="mdlxl-layout"><aside class="mdlxl-menu side-menu"><p class="mdlxl-menu-label">THE WORKSHOP</p><nav aria-label="MDLxL sections">${Object.entries(sections).map(([key,label])=>`<a href="#project/mdlxl${key==='updates'?'':'/'+key}" ${key===section?'aria-current="page"':''}>${label}</a>`).join('')}</nav><a class="mdlxl-source" href="${REPO}" target="_blank" rel="noopener noreferrer">MDLxL on GitHub ↗</a></aside><section class="mdlxl-content slab" id="mdlxl-content"><p>Loading…</p></section></div>`;
 const latestPromise=json(API+'/releases/latest');
 // The download remains available while GitHub resolves the current asset.
 const latestTask=latestPromise.then(release=>{if(!isCurrent())return;app.querySelector('#mdlxl-download').href=downloadUrl(release);app.querySelector('#mdlxl-download').textContent='Download '+release.tag_name+' ↗';app.querySelector('#mdlxl-version').textContent='Windows · Portable ZIP';}).catch(()=>{if(isCurrent())app.querySelector('#mdlxl-version').textContent='Get the latest release on GitHub';});
 const panel=app.querySelector('#mdlxl-content');
 if(section!=='updates'){
  try{const data=await json('mdlxl-content.json');if(!isCurrent())return;panel.innerHTML=contentSection(section,data);}catch{if(isCurrent())panel.innerHTML='<p>This section could not load. Please reload the page.</p>';}
  await latestTask;return;
 }
 panel.innerHTML=contentSection(section);
 const feed=app.querySelector('#mdlxl-releases');
 try{
  const [latest,recent]=await Promise.all([latestPromise,json(API+'/releases?per_page=8')]);
  if(!isCurrent())return;
  const releases=[latest,...recent.filter(r=>!r.draft&&!r.prerelease&&r.id!==latest.id)].slice(0,5);
  feed.innerHTML=releases.map((r,index)=>`<details class="mdlxl-release" ${index===0?'open':''}><summary><span>${index===0?'<small>LATEST RELEASE</small>':''}${escape(r.name||r.tag_name)}</span><time datetime="${escape(r.published_at)}">${escape(new Date(r.published_at).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}))}</time></summary><div class="mdlxl-release-body"><div class="mdlxl-notes">Loading patch notes…</div><a class="mdlxl-release-source" href="${escape(r.html_url)}" target="_blank" rel="noopener noreferrer">View release on GitHub ↗</a></div></details>`).join('');
  const cards=[...feed.querySelectorAll('details')];
  const load=async(card,release)=>{if(card.dataset.loaded)return;card.dataset.loaded='true';try{const body=await notes(release);if(isCurrent())card.querySelector('.mdlxl-notes').innerHTML=markdown(body);}catch{if(isCurrent())card.querySelector('.mdlxl-notes').textContent='Patch notes could not load. You can read this release on GitHub below.';}};
  cards.forEach((card,index)=>{card.ontoggle=()=>{if(card.open)load(card,releases[index]);};});
  await load(cards[0],releases[0]);
 }catch{if(isCurrent())feed.innerHTML=`<p>GitHub updates could not load right now. <a href="${REPO}/releases">Read the latest patch notes on GitHub ↗</a></p>`;}
 await latestTask;
}
