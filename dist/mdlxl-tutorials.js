import {applyMdlxlShellLanguage} from './mdlxl-languages.js?v=20261119-no-discord';
import {mdlxlHref} from './mdlxl-routes.js?v=20261127-cut-tutorial';
import {mountTutorialPlayers} from './mdlxl/tutorials/playback.js?v=20261109-tutorial-mp4';
import {startToolPings} from './mdlxl/tutorials/highlights.js?v=20261030-tutorial-languages';
import {recordTutorial} from './usage.js?v=20261025-amsterdam-days';
import {tutorialLanguages,tutorialText} from './mdlxl/tutorials/languages.js?v=20261119-fit-tutorial';
const version='20261127-cut-tutorial';
const valid=language=>tutorialLanguages.some(item=>item.id===language);
async function loadPlayers(state,article) {
  const content=state.body.firstElementChild;
  const generation=state.generation;
  const current=()=>generation===state.generation&&state.isCurrent()&&article.isConnected&&!article.hidden;
  try {
    let animations={};
    if(article.querySelector('[data-animation]')){
      const prefix=content.dataset.tutorialLocale==='en'?'':content.dataset.tutorialLocale+'/';
      content._tutorialAnimations??=fetch('/mdlxl/tutorials/'+prefix+'animation-index.json?v='+version).then(response=>{
        if(!response.ok)throw Error('Tutorial video metadata could not load');
        return response.json();
      });
      animations=await content._tutorialAnimations;
    }
    if(current())state.stopVideos=mountTutorialPlayers(article,animations);
  }catch(error){
    delete content._tutorialAnimations;
    if(current())console.error('Tutorial video metadata',error);
  }
}
// Library sorting: two shelves (quick tricks, tools) and the app area each guide belongs to.
// Guides not listed here: 1-2 steps count as quick tricks, otherwise tools; they show under All and their shelf.
const guideSorting={anchor:['quick','vertices'],align:['quick','vertices'],spread:['quick','vertices'],animated:['quick','vertices'],eachpiece:['quick','vertices'],cut:['quick','vertices'],fit:['quick','uv'],live:['quick','uv'],uvgrid:['quick','uv'],fskel:['quick','animation'],forge:['tools','vertices'],pose:['tools','animation'],glow:['tools','effects'],emtr:['tools','effects'],fx:['tools','effects'],corpse:['tools','model'],optixl:['tools','model']};
const areaOrder=['vertices','uv','animation','effects','model'];
function arrangeLibrary(state,text) {
  const menu=state.body.querySelector('.tutorial-menu');
  if(!menu||menu.dataset.sorted)return;
  menu.dataset.sorted='1';
  const cards=[...menu.querySelectorAll('.tutorial-card')];
  for(const card of cards){
    const [shelf,area]=guideSorting[card.dataset.tutorial]||[parseInt(card.querySelector('.tutorial-card-footer span')?.textContent,10)<=2?'quick':'tools',''];
    card.dataset.shelf=shelf;card.dataset.area=area;
  }
  const shelves={},rank=card=>{const i=areaOrder.indexOf(card.dataset.area);return i<0?areaOrder.length:i;};
  menu.classList.add('tutorial-menu-sorted');
  for(const shelf of ['quick','tools']){
    const section=document.createElement('section'),heading=document.createElement('h3'),grid=document.createElement('div');
    section.className='tutorial-shelf';section.dataset.shelf=shelf;heading.textContent=text.sort[shelf];grid.className='tutorial-shelf-cards';
    grid.append(...cards.filter(card=>card.dataset.shelf===shelf).sort((a,b)=>rank(a)-rank(b)||cards.indexOf(a)-cards.indexOf(b)));
    section.append(heading,grid);menu.append(section);shelves[shelf]=section;
  }
  const bar=document.createElement('div');bar.className='tutorial-filters';bar.setAttribute('role','group');bar.setAttribute('aria-label',text.sort.label);
  const filters=['all','quick','tools',...areaOrder.filter(area=>cards.some(card=>card.dataset.area===area))];
  const apply=filter=>{
    state.filter=filter;
    for(const button of bar.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.filter===filter));
    for(const card of cards)card.hidden=!(filter==='all'||card.dataset.shelf===filter||card.dataset.area===filter);
    for(const [shelf,section] of Object.entries(shelves))section.hidden=!cards.some(card=>card.dataset.shelf===shelf&&!card.hidden);
  };
  for(const filter of filters){
    if(filter===filters[3]){const gap=document.createElement('span');gap.className='tutorial-filter-gap';gap.setAttribute('aria-hidden','true');bar.append(gap);}
    const button=document.createElement('button');button.type='button';button.dataset.filter=filter;button.textContent=text.sort[filter];button.onclick=()=>apply(filter);bar.append(button);
  }
  menu.before(bar);
  apply(filters.includes(state.filter)?state.filter:'all');
}
function showTutorial(state) {
  const cards=[...state.body.querySelectorAll('.tutorial-card')];
  const selected=cards.find(card=>card.dataset.tutorial===state.requested);
  state.body.querySelector('#tutorial-library').hidden=!!selected;
  state.body.querySelector('#tutorial-back').hidden=!selected;
  const search=new URLSearchParams(location.search);search.set('lang',state.select.value);
  for(const link of state.panel.closest('.mdlxl-layout').querySelectorAll('.mdlxl-menu nav a')){const url=new URL(link.href);url.searchParams.set('lang',state.select.value);link.href=url;}
  for(const card of cards){state.body.querySelector('#'+card.getAttribute('aria-controls')).hidden=card!==selected;card.href=mdlxlHref('tutorials',card.dataset.tutorial,search);}
  state.stopVideos?.();
  const article=selected?state.body.querySelector('#'+selected.getAttribute('aria-controls')):null;
  state.stopVideos=null;
  if(article)loadPlayers(state,article);
  state.body.querySelector('#tutorial-back').href=mdlxlHref('tutorials',undefined,search);
  const heading=selected?state.body.querySelector('#'+selected.getAttribute('aria-controls')+' h3'):state.title;
  if(document.activeElement!==state.select){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  recordTutorial(selected?selected.dataset.tutorial:'library',state.select.value);
  const rect=state.header.getBoundingClientRect();if(rect.top<0||rect.bottom>innerHeight)state.header.scrollIntoView({block:'start'});
}
export async function renderTutorials(panel,isCurrent,requested) {
  if(!document.getElementById('mdlxl-tutorial-style')){
    const style=document.createElement('link');style.id='mdlxl-tutorial-style';style.rel='stylesheet';style.href='/mdlxl-tutorials.css?v=20261127-cut-tutorial';document.head.append(style);
  }
  let state=panel._tutorialController;
  if(!state||!state.header.isConnected){
    panel.innerHTML='<header class="tutorial-header" id="tutorial-header"><h2 id="tutorial-heading">Tutorials</h2><label class="tutorial-language"><span class="tutorial-language-label">Language</span><select id="tutorial-language" aria-label="Language">'+tutorialLanguages.map(item=>'<option value="'+item.id+'">'+item.label+'</option>').join('')+'</select></label></header><div class="tutorial-body" id="tutorial-body"></div>';
    state=panel._tutorialController={panel,header:panel.querySelector('#tutorial-header'),title:panel.querySelector('#tutorial-heading'),select:panel.querySelector('#tutorial-language'),body:panel.querySelector('#tutorial-body'),generation:0,loadedLanguage:null};
    state.select.onchange=()=>{const language=state.select.value;localStorage.setItem('mdlxl-tutorial-language',language);const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url);renderTutorials(panel,state.isCurrent,state.requested);};
  }
  state.isCurrent=isCurrent;state.requested=requested;
  const query=new URLSearchParams(location.search).get('lang'),saved=localStorage.getItem('mdlxl-tutorial-language'),language=valid(query)?query:valid(saved)?saved:'en',text=tutorialText[language],generation=++state.generation;
  if(valid(query))localStorage.setItem('mdlxl-tutorial-language',language);
  applyMdlxlShellLanguage(panel.closest('.mdlxl-layout')?.parentElement,language);
  state.select.value=language;state.select.setAttribute('aria-label',text.language);state.select.title=text.language;state.title.textContent=text.title;panel.querySelector('.tutorial-language-label').textContent=text.language;
  panel.dataset.tutorialLanguage=language;panel.lang=language;document.title=text.title+' — MDLxL — LowPolyWorks';
  if(state.loadedLanguage===language){showTutorial(state);return;}
  state.stopVideos?.();state.stopVideos=null;
  state.loadedLanguage=null;state.body.textContent=text.loading;
  const prefix=language==='en'?'':language+'/';
  try{
    const response=await fetch('/mdlxl/tutorials/'+prefix+'content.html?v='+version);
    if(!response.ok)throw Error('Tutorial language could not load');
    const markup=await response.text();if(generation!==state.generation||!state.isCurrent()||!panel.isConnected)return;
    const content=document.createElement('div');content.className='tutorial-language-body';content.dataset.tutorialLocale=language;content.innerHTML=markup;for(const image of content.querySelectorAll('img'))image.loading='lazy';state.body.replaceChildren(content);
    state.loadedLanguage=language;startToolPings(content);arrangeLibrary(state,text);showTutorial(state);
  }catch(error){if(generation===state.generation&&state.isCurrent()&&panel.isConnected)state.body.textContent=text.error;}
}
