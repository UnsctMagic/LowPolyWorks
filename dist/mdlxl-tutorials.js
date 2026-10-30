import {mdlxlHref} from './mdlxl-routes.js?v=20261030-glow-approved';
import {mountTutorialPlayers} from './mdlxl/tutorials/playback.js?v=20261030-tutorial-languages';
import {startToolPings} from './mdlxl/tutorials/highlights.js?v=20261030-tutorial-languages';
import {tutorialLanguages,tutorialText} from './mdlxl/tutorials/languages.js?v=20261030-tutorial-languages';
const version='20261030-glow-approved';
const valid=language=>tutorialLanguages.some(item=>item.id===language);
function showTutorial(state) {
  const cards=[...state.body.querySelectorAll('.tutorial-card')];
  const selected=cards.find(card=>card.dataset.tutorial===state.requested);
  state.body.querySelector('#tutorial-library').hidden=!!selected;
  state.body.querySelector('#tutorial-back').hidden=!selected;
  const search=new URLSearchParams(location.search);search.set('lang',state.select.value);
  for(const link of state.panel.closest('.mdlxl-layout').querySelectorAll('.mdlxl-menu nav a')){const url=new URL(link.href);url.searchParams.set('lang',state.select.value);link.href=url;}
  for(const card of cards){state.body.querySelector('#'+card.getAttribute('aria-controls')).hidden=card!==selected;card.href=mdlxlHref('tutorials',card.dataset.tutorial,search);}
  state.body.querySelector('#tutorial-back').href=mdlxlHref('tutorials',undefined,search);
  const heading=selected?state.body.querySelector('#'+selected.getAttribute('aria-controls')+' h3'):state.title;
  if(document.activeElement!==state.select){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  const rect=state.header.getBoundingClientRect();if(rect.top<0||rect.bottom>innerHeight)state.header.scrollIntoView({block:'start'});
}
export async function renderTutorials(panel,isCurrent,requested) {
  if(!document.getElementById('mdlxl-tutorial-style')){
    const style=document.createElement('link');style.id='mdlxl-tutorial-style';style.rel='stylesheet';style.href='/mdlxl-tutorials.css?v=20261031-compact-cards';document.head.append(style);
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
  state.select.value=language;state.select.setAttribute('aria-label',text.language);state.select.title=text.language;state.title.textContent=text.title;panel.querySelector('.tutorial-language-label').textContent=text.language;
  panel.dataset.tutorialLanguage=language;panel.lang=language;document.title=text.title+' — MDLxL — LowPolyWorks';
  if(state.loadedLanguage===language){showTutorial(state);return;}
  state.loadedLanguage=null;state.body.textContent=text.loading;
  const prefix=language==='en'?'':language+'/';
  try{
    const [response,{default:animations}]=await Promise.all([fetch('/mdlxl/tutorials/'+prefix+'content.html?v='+version),import('/mdlxl/tutorials/'+prefix+'animation-data.js?v='+version)]);
    if(!response.ok)throw Error('Tutorial language could not load');
    const markup=await response.text();if(generation!==state.generation||!state.isCurrent()||!panel.isConnected)return;
    const content=document.createElement('div');content.className='tutorial-language-body';content.dataset.tutorialLocale=language;content.innerHTML=markup;state.body.replaceChildren(content);
    for(const host of content.querySelectorAll('[data-animation]'))host.dataset.language=language;
    state.loadedLanguage=language;mountTutorialPlayers(content,animations);startToolPings(content);showTutorial(state);
  }catch(error){if(generation===state.generation&&state.isCurrent()&&panel.isConnected)state.body.textContent=text.error;}
}
