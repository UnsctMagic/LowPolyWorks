import {mountTutorialPlayers} from './mdlxl/tutorials/playback.js?v=20261030-tutorials';
import {startToolPings} from './mdlxl/tutorials/highlights.js?v=20261030-tutorials';
export async function renderTutorials(panel, isCurrent, requested) {
  if (!document.getElementById('mdlxl-tutorial-style')) {
    const style = document.createElement('link');style.id='mdlxl-tutorial-style';style.rel='stylesheet';style.href='/mdlxl-tutorials.css?v=20261030-tutorials';document.head.append(style);
  }
  const [response, {default: animations}] = await Promise.all([fetch('/mdlxl/tutorials/content.html?v=20261030-tutorials'), import('./mdlxl/tutorials/animation-data.js?v=20261030-tutorials')]);
  if (!response.ok) throw Error('Tutorials could not load.');
  const markup = await response.text();if (!isCurrent()) return;
  panel.innerHTML=markup;
  const cards=[...panel.querySelectorAll('.tutorial-card')], selected=cards.find(card=>card.dataset.tutorial===requested);
  panel.querySelector('#tutorial-library').hidden=!!selected;panel.querySelector('#tutorial-back').hidden=!selected;
  for(const card of cards){panel.querySelector('#'+card.getAttribute('aria-controls')).hidden=card!==selected;card.onclick=()=>{location.hash='project/mdlxl/tutorials/'+card.dataset.tutorial;};}
  panel.querySelector('#tutorial-back').onclick=()=>{location.hash='project/mdlxl/tutorials';};
  mountTutorialPlayers(panel,animations);startToolPings(panel);
  panel.scrollIntoView({block:'start'});
}
