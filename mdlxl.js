const REPO='https://github.com/UnsctMagic/MDLxL';
const API='https://api.github.com/repos/UnsctMagic/MDLxL';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections={updates:'Patch updates',about:'About MDLxL',preview:'Preview',tutorials:'Tutorials',credits:'Credits'};
const creditLinks={
 'Codex Astra and Sol':'https://openai.com/codex/',
 'HerrDave':'https://www.hiveworkshop.com/members/herrdave.234820/',
 'POMEXI':'https://www.hiveworkshop.com/members/pomexi.326199/',
 'Alexey / Алексей':'https://xgm.guru/user/%D0%90%D0%BB%D0%B5%D0%BA%D1%81%D0%B5%D0%B9',
 'MDLVis':'https://xgm.guru/p/wc3/mdlvis',
 '4eb0da':'https://github.com/4eb0da', 'war3-model':'https://github.com/4eb0da/war3-model',
 'GhostWolf':'https://www.hiveworkshop.com/members/ghostwolf.137310/', 'mdx-m3-viewer':'https://github.com/flowtsohg/mdx-m3-viewer',
 'BlinkBoy / Fernando Sahmkow':'https://github.com/FernandoS27', 'WhiteoutLib':'https://github.com/FernandoS27/WhiteoutLib',
 'Ladislav Zezula / Ladik':'https://github.com/ladislav-zezula', 'CascLib':'https://github.com/ladislav-zezula/CascLib', 'StormLib':'https://github.com/ladislav-zezula/StormLib',
 'Darithos':'https://github.com/Darithos', 'W3ModelViewer':'https://github.com/Darithos/W3ModelViewer',
 'Retera':'https://github.com/Retera', 'Retera Model Studio':'https://github.com/Retera/ReterasModelStudio', 'Warsmash Mod Engine':'https://github.com/Retera/WarsmashModEngine',
 'Magos':'https://www.hiveworkshop.com/members/magos.110124/', 'War3 Model Editor':'https://www.hiveworkshop.com/threads/war3-model-editor.62876/',
 'Kanma / Philip Abbet':'https://github.com/Kanma', 'BLPConverter':'https://github.com/Kanma/BLPConverter',
 'Pillow contributors':'https://github.com/python-pillow', 'Pillow':'https://github.com/python-pillow/Pillow',
 'Dominic Szablewski / phoboslab':'https://github.com/phoboslab', 'QOI':'https://github.com/phoboslab/qoi',
 'Three.js authors and contributors':'https://github.com/threejs', 'Three.js':'https://threejs.org/',
 'Arseny Kapoulkine':'https://github.com/zeux', 'meshoptimizer':'https://github.com/zeux/meshoptimizer',
 'Angus Johnson':'https://github.com/AngusJohnson', 'Timo':'https://sourceforge.net/u/timo23414/profile/', 'Clipper':'https://sourceforge.net/projects/polyclipping/', 'clipper-lib':'https://github.com/junmer/clipper-lib', 'Tom Wu':'http://www-cs-students.stanford.edu/~tjw/', 'JSBN':'http://www-cs-students.stanford.edu/~tjw/jsbn/',
 'Brandon Jones':'https://github.com/toji', 'Colin MacKenzie IV':'https://github.com/sinisterchipmunk', 'gl-matrix':'https://github.com/toji/gl-matrix',
 'Meta Platforms':'https://github.com/facebook', 'React contributors':'https://github.com/facebook/react/graphs/contributors', 'React DOM':'https://github.com/facebook/react/tree/main/packages/react-dom', 'Scheduler':'https://github.com/facebook/react/tree/main/packages/scheduler', 'React':'https://react.dev/',
 'Electron contributors':'https://github.com/electron', 'Electron':'https://www.electronjs.org/', 'Chromium':'https://www.chromium.org/', 'Node.js':'https://nodejs.org/',
 'Lucide contributors':'https://github.com/lucide-icons', 'Cole Bemis':'https://github.com/colebemis', 'Lucide':'https://lucide.dev/', 'Feather':'https://github.com/feathericons/feather',
 'Feross Aboukhadijeh':'https://github.com/feross', 'buffer':'https://github.com/feross/buffer',
 'Jameson Little':'https://github.com/beatgammit', 'base64-js':'https://github.com/beatgammit/base64-js',
 'Fair Oaks Labs':'https://apps.apple.com/us/developer/fair-oaks-labs-inc/id327652659', 'ieee754':'https://github.com/feross/ieee754',
 'FFmpeg developers':'https://github.com/FFmpeg', 'FFmpeg':'https://ffmpeg.org/', 'Intel':'https://github.com/intel', 'oneVPL':'https://github.com/intel/libvpl', 'Cisco':'https://github.com/cisco', 'OpenH264':'https://github.com/cisco/openh264', 'mingw-w64':'https://www.mingw-w64.org/', 'winpthreads':'https://github.com/mingw-w64/mingw-w64/tree/master/mingw-w64-libraries/winpthreads', 'GCC runtime libraries':'https://gcc.gnu.org/onlinedocs/libstdc++/', 'NVIDIA':'https://github.com/NVIDIA', 'codec headers':'https://github.com/FFmpeg/nv-codec-headers', 'AMD':'https://github.com/GPUOpen-LibrariesAndSDKs', 'AMF':'https://github.com/GPUOpen-LibrariesAndSDKs/AMF',
 'serversideup':'https://github.com/serversideup', 'ffmpeg-lgpl-builds':'https://github.com/serversideup/ffmpeg-lgpl-builds',
 'Matt DesLauriers':'https://github.com/mattdesl', 'gifenc':'https://github.com/mattdesl/gifenc',
 'Blizzard Entertainment':'https://www.blizzard.com/company/about', 'Warcraft III':'https://warcraft3.blizzard.com/', 'The original MDLVis authors':'https://xgm.guru/user/%D0%90%D0%BB%D0%B5%D0%BA%D1%81%D0%B5%D0%B9',
 'rubberduck':'https://opengameart.org/users/rubberduck', '60 Free GIMP / Krita Brushes':'https://opengameart.org/content/60-free-gimp-krita-brushes',
 'ElDuderino':'https://opengameart.org/users/elduderino', 'Scratch / Damaged Paint Brush':'https://opengameart.org/content/scratch-damaged-paint-brush',
 'OpenAI ImageGen':'https://openai.com/index/image-generation-api/',
 'Google Fonts':'https://fonts.google.com/', 'SIL Open Font License 1.1':'https://openfontlicense.org/',
 'Cinzel Decorative':'https://fonts.google.com/specimen/Cinzel+Decorative', 'Natanael Gama':'https://github.com/NDISCOVER',
 'MedievalSharp':'https://fonts.google.com/specimen/MedievalSharp', 'wmk69':'https://github.com/wmk69',
 'Uncial Antiqua':'https://fonts.google.com/specimen/Uncial+Antiqua', 'Brian J. Bonislawsky / Astigmatic':'https://www.myfonts.com/collections/brian-j-bonislawsky',
 'Pirata One':'https://fonts.google.com/specimen/Pirata+One', 'Rodrigo Fuenzalida':'https://www.behance.net/erreefe', 'Nicolas Massi':'https://github.com/nmassi',
 'Almendra':'https://fonts.google.com/specimen/Almendra', 'Ana Sanfelippo':'https://www.behance.net/anasanfelippo',
 'IM Fell English':'https://fonts.google.com/specimen/IM+Fell+English', 'Igino Marini':'https://www.ikern.space/about',
 'Lato':'https://fonts.google.com/specimen/Lato', 'Łukasz Dziedzic / tyPoland':'https://www.lukaszdziedzic.eu/',
 'Lora':'https://fonts.google.com/specimen/Lora', 'The Lora Project Authors':'https://github.com/cyrealtype',
 'Open Sans':'https://fonts.google.com/specimen/Open+Sans', 'The Open Sans Project Authors':'https://mattesontypographics.com/about',
 'Orbitron':'https://fonts.google.com/specimen/Orbitron', 'The Orbitron Project Authors':'https://github.com/theleagueof',
 'Rajdhani':'https://fonts.google.com/specimen/Rajdhani', 'Indian Type Foundry':'https://github.com/itfoundry',
 'Cormorant SC':'https://fonts.google.com/specimen/Cormorant+SC', 'The Cormorant Project Authors':'https://github.com/CatharsisFonts',
 'Grenze Gotisch':'https://fonts.google.com/specimen/Grenze+Gotisch', 'The Grenze Gotisch Project Authors':'https://github.com/Omnibus-Type',
 'Marcellus':'https://fonts.google.com/specimen/Marcellus', 'Tengwar Annatar':'https://www.dafont.com/tengwar-annatar.font', 'Johan Winge':'https://www.dafont.com/johan-winge.d757',
 'Vite contributors':'https://github.com/vitejs', 'Vite':'https://vite.dev/', 'Rollup contributors':'https://github.com/rollup', 'Rollup':'https://rollupjs.org/', 'esbuild contributors':'https://github.com/evanw/esbuild/graphs/contributors', 'esbuild':'https://esbuild.github.io/', 'Electron Packager contributors':'https://github.com/electron/packager/graphs/contributors', 'Electron Packager':'https://github.com/electron/packager', 'Emscripten contributors':'https://github.com/emscripten-core', 'Emscripten':'https://emscripten.org/', 'CMake contributors':'https://github.com/Kitware', 'CMake':'https://cmake.org/', 'Ninja contributors':'https://github.com/ninja-build', 'Ninja':'https://ninja-build.org/', 'Catbox':'https://catbox.moe/',
 'Kwah':'https://www.hiveworkshop.com/members/kwah.135511/', 'Basic Animations':'https://www.hiveworkshop.com/threads/basic-animations.97548/', 'Vinz':'https://www.hiveworkshop.com/members/vinz.230106/', 'Particle Emitters 2':'https://www.hiveworkshop.com/threads/particle-emitters-2.329335/', 'Hermit':'https://www.hiveworkshop.com/members/hermit.229531/', 'tillinghast':'https://www.hiveworkshop.com/members/tillinghast.243965/', 'doom_sheep':'https://www.hiveworkshop.com/members/doom_sheep.158897/', 'The Hive Workshop':'https://www.hiveworkshop.com/', 'XGM':'https://xgm.guru/', 'community research bibliography':'https://github.com/UnsctMagic/MDLxL/blob/main/docs/COMMUNITY_RESEARCH.md'
};
const creditPattern=new RegExp(`(${Object.keys(creditLinks).sort((a,b)=>b.length-a.length).map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})`,'gu');
export const creditLine=text=>{let html='',offset=0;for(const match of String(text).matchAll(creditPattern)){html+=escape(String(text).slice(offset,match.index))+`<a href="${creditLinks[match[0]]}" target="_blank" rel="noopener noreferrer">${escape(match[0])}</a>`;offset=match.index+match[0].length;}return html+escape(String(text).slice(offset));};

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
const languages={en:'English',ru:'Русский',es:'Español',zh:'简体中文'};
export function officialNotes(release){return /\[English\]\(https:\/\/www\.lowpolyworks\.com\/mdlxl(?:[/?][^\s)]*)?\)/.test(release.body||'');}
export function notesSource(release,language='en'){
 const label=languages[language]||languages.en;
 const match=[...String(release.body||'').matchAll(/\[([^\]]+)\]\((https:\/\/github\.com\/UnsctMagic\/MDLxL\/blob\/[^\s)]+)\)/g)].find(item=>item[1]===label);
 return match?match[2].replace('https://github.com/UnsctMagic/MDLxL/blob/','https://raw.githubusercontent.com/UnsctMagic/MDLxL/'):null;
}
export function downloadUrl(release){return release.assets?.find(a=>a.name===`MDLxL-${release.tag_name.replace(/^v/,'')}-win32-x64.zip`)?.browser_download_url||null;}
async function json(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('GitHub is temporarily unavailable.');return response.json();}
async function notes(release,language){
 if(officialNotes(release)){const post=await json(`/mdlxl/releases/${release.tag_name.replace(/^v/,'')}.json`);if(post.version!==release.tag_name.replace(/^v/,'')||typeof post.notes[language]!=='string')throw Error('Patch notes could not be loaded.');return post.notes[language];}
 const url=notesSource(release,language);if(!url)return release.body||'No patch notes were included with this release.';const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Patch notes could not be loaded.');return response.text();
}
const prose=lines=>lines.map(line=>`<p>${escape(line.replace(/^- /,''))}</p>`).join('');
const creditProse=lines=>lines.map(line=>`<p>${creditLine(line.replace(/^- /,''))}</p>`).join('');
function contentSection(section,data){
 if(section==='preview')return '<h2>Preview</h2><div class="mdlxl-placeholder"><span aria-hidden="true">◇</span><p>Screenshots are coming soon.</p></div>';
 if(section==='tutorials')return '<h2>Tutorials</h2><div class="mdlxl-placeholder"><span aria-hidden="true">✧</span><p>Tutorials are coming soon.</p></div>';
 if(section==='credits')return `<h2>Credits & acknowledgements</h2>${creditProse(data.creditIntro)}${data.credits.map(group=>`<section class="mdlxl-text-group"><h3>${escape(group.title)}</h3>${creditProse(group.lines)}</section>`).join('')}`;
 if(section==='about')return `<h2>A dream for more CTRL+Z.</h2>${prose(data.intro)}<img class="mdlxl-author-image" src="ui/author-space-dog.gif" alt="A dog in a space station with the caption: I have no idea what I'm doing.">${prose(data.story)}<h2 class="mdlxl-features-heading">Inside the workshop</h2>${data.features.map(group=>`<section class="mdlxl-text-group"><h3>${escape(group.title)}</h3>${prose(group.lines)}</section>`).join('')}${prose(data.closing)}`;
 return '<div class="mdlxl-section-heading"><h2>Patch updates</h2></div><p class="mdlxl-muted">Update posts and official downloads from Low Polyworks.</p><div id="mdlxl-releases" aria-live="polite"><p>Loading patch notes…</p></div>';
}
export async function renderMdlxl(app,isCurrent,recordUsage){
 const requested=location.hash.split('/')[2]||'updates',section=Object.hasOwn(sections,requested)?requested:'updates';
 document.title=`${sections[section]} — MDLxL — LowPolyWorks`;
 app.innerHTML=`<section class="mdlxl-hero slab"><img src="ui/mdlxl-icon.png" alt="MDLxL helmet: half wireframe, half textured" width="128" height="128"><div class="mdlxl-identity"><p class="kicker">THE WARCRAFT III MODEL WORKSHOP</p><h1>MDLxL</h1><p>You wanted more CTRL Z?</p><small>Built for Warcraft III SD models.</small></div><div class="mdlxl-download"><a id="mdlxl-download" class="iron-button primary" aria-disabled="true" href="/mdlxl">Loading download…</a><span id="mdlxl-version">Windows · Portable ZIP</span><a id="mdlxl-ffmpeg-source" hidden>FFmpeg corresponding source ↗</a></div></section><div class="mdlxl-layout"><aside class="mdlxl-menu side-menu"><p class="mdlxl-menu-label">THE WORKSHOP</p><nav aria-label="MDLxL sections">${Object.entries(sections).map(([key,label])=>`<a href="/mdlxl/#project/mdlxl${key==='updates'?'':'/'+key}" ${key===section?'aria-current="page"':''}>${label}</a>`).join('')}</nav><a class="mdlxl-source" href="${REPO}" target="_blank" rel="noopener noreferrer">MDLxL source code ↗</a></aside><section class="mdlxl-content slab" id="mdlxl-content"><p>Loading…</p></section></div>`;
 const latestPromise=json(API+'/releases/latest');
 const button=app.querySelector('#mdlxl-download');button.onclick=event=>{if(button.getAttribute('aria-disabled')==='true')event.preventDefault();else recordUsage('download','mdlxl','zip');};
 const latestTask=latestPromise.then(release=>{if(!isCurrent())return;const url=downloadUrl(release);if(!url)throw Error('No application ZIP');button.href=url;button.removeAttribute('aria-disabled');button.textContent='Download '+release.tag_name+' ↗';app.querySelector('#mdlxl-version').textContent='Windows · Portable ZIP';const source=release.assets?.find(a=>/FFmpeg-corresponding-source.*\.zip$/i.test(a.name));if(source){const link=app.querySelector('#mdlxl-ffmpeg-source');link.href=source.browser_download_url;link.hidden=false;}}).catch(()=>{if(isCurrent()){button.textContent='Download unavailable';app.querySelector('#mdlxl-version').textContent='Please try again later.';}});
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
  const available=[latest,...recent.filter(r=>!r.draft&&!r.prerelease&&r.id!==latest.id)];
  const hotfix=available.find(r=>r.tag_name==='v0.21.2'),base=available.find(r=>r.tag_name==='v0.21.1');
  const groupedHotfix=hotfix&&base?hotfix:null;
  const releases=available.filter(r=>r!==groupedHotfix).slice(0,5);
  const query=new URLSearchParams(location.search),version=(query.get('version')||'').replace(/^v/,''),shownVersion=groupedHotfix&&version==='0.21.2'?'0.21.1':version,chosen=releases.findIndex(r=>r.tag_name.replace(/^v/,'')===shownVersion),open=chosen<0?0:chosen,initialLanguage=Object.hasOwn(languages,query.get('lang'))?query.get('lang'):'en';
  feed.innerHTML=releases.map((r,index)=>`<details class="mdlxl-release" ${index===open?'open':''}><summary><span>${index===0?'<small>LATEST RELEASE</small>':''}${escape(r.name||r.tag_name)}</span><time datetime="${escape(r.published_at)}">${escape(new Date(r.published_at).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}))}</time></summary><div class="mdlxl-release-body"><nav class="mdlxl-note-languages" aria-label="Update post language">${Object.entries(languages).filter(([key])=>officialNotes(r)||notesSource(r,key)).map(([key,label])=>`<button type="button" class="iron-button" data-note-language="${key}" aria-pressed="${key===initialLanguage}">${label}</button>`).join('')}</nav><div class="mdlxl-notes" lang="${initialLanguage==='zh'?'zh-CN':initialLanguage}">Loading patch notes…</div></div></details>`).join('');
  const cards=[...feed.querySelectorAll('details')];
  const load=async(card,release,language=initialLanguage)=>{if(card.dataset.loaded===language)return;card.dataset.loaded=language;const panel=card.querySelector('.mdlxl-notes');panel.textContent='Loading patch notes…';card.querySelectorAll('[data-note-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.noteLanguage===language)));try{const body=await notes(release,language);const addition=groupedHotfix&&release===base?await notes(groupedHotfix,language):'';if(isCurrent()&&card.dataset.loaded===language){panel.lang=language==='zh'?'zh-CN':language;panel.innerHTML=markdown(addition?`${body.trimEnd()}\n\n${addition.replace(/^# /,'## ')}`:body);}}catch{if(isCurrent()&&card.dataset.loaded===language){delete card.dataset.loaded;panel.textContent='Patch notes could not load. Please try again.';}}};
  cards.forEach((card,index)=>{const release=releases[index];card.ontoggle=()=>{if(card.open&&!card.dataset.loaded)load(card,release);};card.querySelectorAll('[data-note-language]').forEach(button=>{button.onclick=()=>{const next=new URL(location.href);next.searchParams.set('version',release.tag_name.replace(/^v/,''));next.searchParams.set('lang',button.dataset.noteLanguage);history.replaceState(null,'',next);load(card,release,button.dataset.noteLanguage);};});});
  await load(cards[open],releases[open]);
 }catch{if(isCurrent())feed.innerHTML='<p>Updates could not load right now. Please try again later.</p>';}
 await latestTask;
}
