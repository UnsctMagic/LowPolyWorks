const REPO='https://github.com/UnsctMagic/MDLxL';
const API='https://api.github.com/repos/UnsctMagic/MDLxL';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections={updates:'Patch updates',about:'About MDLxL',preview:'Preview',tutorials:'Tutorials',credits:'Credits'};
const creditLinks={
 'Codex Astra and Sol':'https://openai.com/codex/',
 'HerrDave':'https://www.hiveworkshop.com/media/albums/users/herrdave.234820/',
 'POMEXI':'https://www.hiveworkshop.com/threads/rohirrim.370823/',
 'Alexey / Алексей':'https://www.hiveworkshop.com/threads/mdlvis.317175/',
 'MDLVis':'https://www.hiveworkshop.com/threads/mdlvis.317175/',
 '4eb0da':'https://github.com/4eb0da/war3-model', 'war3-model':'https://github.com/4eb0da/war3-model',
 'GhostWolf':'https://github.com/flowtsohg/mdx-m3-viewer', 'mdx-m3-viewer':'https://github.com/flowtsohg/mdx-m3-viewer',
 'BlinkBoy / Fernando Sahmkow':'https://github.com/FernandoS27/WhiteoutLib', 'WhiteoutLib':'https://github.com/FernandoS27/WhiteoutLib',
 'Ladislav Zezula / Ladik':'https://github.com/ladislav-zezula/CascLib', 'CascLib':'https://github.com/ladislav-zezula/CascLib', 'StormLib':'https://github.com/ladislav-zezula/StormLib',
 'Darithos':'https://github.com/Darithos/W3ModelViewer', 'W3ModelViewer':'https://github.com/Darithos/W3ModelViewer',
 'Retera':'https://github.com/Retera/ReterasModelStudio', 'Retera Model Studio':'https://github.com/Retera/ReterasModelStudio', 'Warsmash Mod Engine':'https://github.com/Retera/WarsmashModEngine',
 'Magos':'https://www.hiveworkshop.com/threads/war3-model-editor.62876/', 'War3 Model Editor':'https://www.hiveworkshop.com/threads/war3-model-editor.62876/',
 'Kanma / Philip Abbet':'https://www.wc3campaigns.net/showthread.php?t=101788', 'BLPConverter':'https://www.wc3campaigns.net/showthread.php?t=101788',
 'Pillow contributors':'https://github.com/python-pillow/Pillow', 'Pillow':'https://github.com/python-pillow/Pillow',
 'Dominic Szablewski / phoboslab':'https://github.com/phoboslab/qoi', 'QOI':'https://github.com/phoboslab/qoi',
 'Three.js authors and contributors':'https://threejs.org/', 'Three.js':'https://threejs.org/',
 'Arseny Kapoulkine and contributors':'https://github.com/zeux/meshoptimizer', 'meshoptimizer':'https://github.com/zeux/meshoptimizer',
 'Angus Johnson and Timo':'https://www.angusj.com/delphi/clipper.php', 'Clipper / clipper-lib':'https://www.angusj.com/delphi/clipper.php', "Tom Wu's JSBN":'http://www-cs-students.stanford.edu/~tjw/jsbn/',
 'Brandon Jones, Colin MacKenzie IV and contributors':'https://github.com/toji/gl-matrix', 'gl-matrix':'https://github.com/toji/gl-matrix',
 'Meta Platforms and React contributors':'https://react.dev/', 'React, React DOM and Scheduler':'https://react.dev/',
 'Electron contributors':'https://www.electronjs.org/', 'Electron':'https://www.electronjs.org/',
 'Lucide contributors and Cole Bemis':'https://lucide.dev/', 'Lucide':'https://lucide.dev/',
 'Feross Aboukhadijeh and contributors':'https://github.com/feross/buffer', 'buffer':'https://github.com/feross/buffer',
 'Jameson Little':'https://github.com/beatgammit/base64-js', 'base64-js':'https://github.com/beatgammit/base64-js',
 'Fair Oaks Labs and contributors':'https://github.com/feross/ieee754', 'ieee754':'https://github.com/feross/ieee754',
 'FFmpeg developers':'https://ffmpeg.org/', 'FFmpeg':'https://ffmpeg.org/', 'Intel oneVPL':'https://github.com/intel/libvpl', 'Cisco OpenH264':'https://github.com/cisco/openh264', 'mingw-w64/winpthreads':'https://www.mingw-w64.org/', 'GCC runtime libraries':'https://gcc.gnu.org/', 'NVIDIA codec headers':'https://github.com/FFmpeg/nv-codec-headers', 'AMD AMF':'https://github.com/GPUOpen-LibrariesAndSDKs/AMF',
 'serversideup':'https://github.com/serversideup/ffmpeg-lgpl', 'ffmpeg-lgpl-builds':'https://github.com/serversideup/ffmpeg-lgpl',
 'Matt DesLauriers':'https://github.com/mattdesl/gifenc', 'gifenc':'https://github.com/mattdesl/gifenc',
 'Blizzard Entertainment':'https://warcraft3.blizzard.com/', 'Warcraft III':'https://warcraft3.blizzard.com/', 'The original MDLVis authors':'https://www.hiveworkshop.com/threads/mdlvis.317175/',
 'rubberduck':'https://opengameart.org/content/60-free-gimp-krita-brushes', '60 Free GIMP / Krita Brushes':'https://opengameart.org/content/60-free-gimp-krita-brushes',
 'ElDuderino':'https://opengameart.org/content/scratch-damaged-paint-brush', 'Scratch / Damaged Paint Brush':'https://opengameart.org/content/scratch-damaged-paint-brush',
 'OpenAI ImageGen':'https://openai.com/index/image-generation-api/',
 'Google Fonts':'https://fonts.google.com/', 'SIL Open Font License 1.1':'https://openfontlicense.org/', 'Cinzel Decorative':'https://fonts.google.com/specimen/Cinzel+Decorative', 'Natanael Gama':'https://fonts.google.com/specimen/Cinzel+Decorative', 'MedievalSharp':'https://fonts.google.com/specimen/MedievalSharp', 'wmk69':'https://fonts.google.com/specimen/MedievalSharp', 'Uncial Antiqua':'https://fonts.google.com/specimen/Uncial+Antiqua', 'Brian J. Bonislawsky / Astigmatic':'https://fonts.google.com/specimen/Uncial+Antiqua', 'Pirata One':'https://fonts.google.com/specimen/Pirata+One', 'Rodrigo Fuenzalida and Nicolas Massi':'https://fonts.google.com/specimen/Pirata+One', 'Almendra':'https://fonts.google.com/specimen/Almendra', 'Ana Sanfelippo':'https://fonts.google.com/specimen/Almendra', 'IM Fell English':'https://fonts.google.com/specimen/IM+Fell+English', 'Igino Marini':'https://fonts.google.com/specimen/IM+Fell+English', 'Lato':'https://fonts.google.com/specimen/Lato', 'Łukasz Dziedzic / tyPoland':'https://fonts.google.com/specimen/Lato', 'Lora':'https://fonts.google.com/specimen/Lora', 'The Lora Project Authors':'https://fonts.google.com/specimen/Lora', 'Open Sans':'https://fonts.google.com/specimen/Open+Sans', 'The Open Sans Project Authors':'https://fonts.google.com/specimen/Open+Sans', 'Orbitron':'https://fonts.google.com/specimen/Orbitron', 'The Oxanium Project Authors':'https://fonts.google.com/specimen/Orbitron', 'Rajdhani':'https://fonts.google.com/specimen/Rajdhani', 'Indian Type Foundry':'https://fonts.google.com/specimen/Rajdhani', 'Cormorant SC':'https://fonts.google.com/specimen/Cormorant+SC', 'The Cormorant Project Authors':'https://fonts.google.com/specimen/Cormorant+SC', 'Grenze Gotisch':'https://fonts.google.com/specimen/Grenze+Gotisch', 'The Grenze Gotisch Project Authors':'https://fonts.google.com/specimen/Grenze+Gotisch', 'Marcellus':'https://fonts.google.com/specimen/Marcellus', 'The Marcellus Project Authors':'https://fonts.google.com/specimen/Marcellus', 'Tengwar Annatar':'https://www.dafont.com/tengwar-annatar.font', 'Johan Winge':'https://www.dafont.com/tengwar-annatar.font',
 'Vite contributors':'https://vite.dev/', 'Vite':'https://vite.dev/', 'Rollup contributors':'https://rollupjs.org/', 'Rollup':'https://rollupjs.org/', 'esbuild contributors':'https://esbuild.github.io/', 'esbuild':'https://esbuild.github.io/', 'Electron Packager contributors':'https://github.com/electron/packager', 'Electron Packager':'https://github.com/electron/packager', 'Emscripten contributors':'https://emscripten.org/', 'Emscripten':'https://emscripten.org/', 'CMake contributors':'https://cmake.org/', 'CMake':'https://cmake.org/', 'Ninja contributors':'https://ninja-build.org/', 'Ninja':'https://ninja-build.org/', 'Catbox':'https://catbox.moe/',
 'Kwah':'https://www.hiveworkshop.com/threads/basic-animations.97548/', 'Basic Animations':'https://www.hiveworkshop.com/threads/basic-animations.97548/', 'Vinz':'https://www.hiveworkshop.com/threads/particle-emitters-2.329335/', 'Particle Emitters 2':'https://www.hiveworkshop.com/threads/particle-emitters-2.329335/', 'Hermit':'https://www.hiveworkshop.com/threads/particle-emitters-2.329335/', 'tillinghast':'https://www.hiveworkshop.com/threads/particle-emitters-2.329335/', 'doom_sheep':'https://www.hiveworkshop.com/threads/particle-emitters-2.329335/', 'The Hive Workshop':'https://www.hiveworkshop.com/', 'XGM':'https://xgm.guru/'
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
export function notesSource(release){
 const match=String(release.body||'').match(/\[English\]\((https:\/\/github\.com\/UnsctMagic\/MDLxL\/blob\/[^\s)]+)\)/i);
 return match?match[1].replace('https://github.com/UnsctMagic/MDLxL/blob/','https://raw.githubusercontent.com/UnsctMagic/MDLxL/'):null;
}
export function downloadUrl(release){return release.assets?.find(a=>/^MDLxL-[\d.]+-win32-x64\.zip$/i.test(a.name))?.browser_download_url||REPO+'/releases/latest';}
async function json(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('GitHub is temporarily unavailable.');return response.json();}
async function notes(release){const url=notesSource(release);if(!url)return release.body||'No patch notes were included with this release.';const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Patch notes could not be loaded.');return response.text();}
const prose=lines=>lines.map(line=>`<p>${escape(line.replace(/^- /,''))}</p>`).join('');
const creditProse=lines=>lines.map(line=>`<p>${creditLine(line.replace(/^- /,''))}</p>`).join('');
function contentSection(section,data){
 if(section==='preview')return '<h2>Preview</h2><div class="mdlxl-placeholder"><span aria-hidden="true">◇</span><h3>A look inside MDLxL</h3><p>Screenshots are coming soon.</p></div>';
 if(section==='tutorials')return '<h2>Tutorials</h2><div class="mdlxl-placeholder"><span aria-hidden="true">✧</span><h3>From the first vertex onwards</h3><p>Tutorials are coming soon.</p></div>';
 if(section==='credits')return `<h2>Credits & acknowledgements</h2>${creditProse(data.creditIntro)}${data.credits.map(group=>`<section class="mdlxl-text-group"><h3>${escape(group.title)}</h3>${creditProse(group.lines)}</section>`).join('')}`;
 if(section==='about')return `<h2>A dream for more CTRL+Z.</h2>${prose(data.intro)}<section class="mdlxl-text-group"><h3>In the author's words</h3>${prose(data.story)}</section><h2 class="mdlxl-features-heading">Inside the workshop</h2>${data.features.map(group=>`<section class="mdlxl-text-group"><h3>${escape(group.title)}</h3>${prose(group.lines)}</section>`).join('')}${prose(data.closing)}`;
 return '<div class="mdlxl-section-heading"><h2>Patch updates</h2><a href="'+REPO+'/releases" target="_blank" rel="noopener noreferrer">All releases ↗</a></div><p class="mdlxl-muted">The latest published changes, directly from GitHub.</p><div id="mdlxl-releases" aria-live="polite"><p>Loading patch notes…</p></div>';
}
export async function renderMdlxl(app,isCurrent){
 const requested=location.hash.split('/')[2]||'updates',section=Object.hasOwn(sections,requested)?requested:'updates';
 document.title=`${sections[section]} — MDLxL — LowPolyWorks`;
 app.innerHTML=`<section class="mdlxl-hero slab"><img src="ui/mdlxl-icon.png" alt="MDLxL helmet: half wireframe, half textured" width="128" height="128"><div class="mdlxl-identity"><p class="kicker">THE WARCRAFT III MODEL WORKSHOP</p><h1>MDLxL</h1><p>You wanted more CTRL Z?</p><small>Built for Warcraft III SD models.</small></div><div class="mdlxl-download"><a id="mdlxl-download" class="iron-button primary" href="${REPO}/releases/latest">Download latest ↗</a><span id="mdlxl-version">Windows · Portable ZIP</span></div></section><div class="mdlxl-layout"><aside class="mdlxl-menu side-menu"><p class="mdlxl-menu-label">THE WORKSHOP</p><nav aria-label="MDLxL sections">${Object.entries(sections).map(([key,label])=>`<a href="#project/mdlxl${key==='updates'?'':'/'+key}" ${key===section?'aria-current="page"':''}>${label}</a>`).join('')}</nav><a class="mdlxl-source" href="${REPO}" target="_blank" rel="noopener noreferrer">MDLxL on GitHub ↗</a></aside><section class="mdlxl-content slab" id="mdlxl-content"><p>Loading…</p></section></div>`;
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
