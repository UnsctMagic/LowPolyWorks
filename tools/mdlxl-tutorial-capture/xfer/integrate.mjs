// Adds the XFER tutorial card and article (Transfer window, ten clips) to the English tutorial page. Running it again replaces the earlier card and article.
// English only for now: the other five languages and the Mordor page come after the English clips are approved.
// Control names are the app's own English labels.
import fs from 'node:fs'; import crypto from 'node:crypto';
const SITE = process.env.LPW_SITE || 'D:/Claude/LowPolyWorks-xfer-tutorial/dist/mdlxl/tutorials';
const KEY = 'xfer', SLUG = 'xfer', CARD = 'xfer-card.png';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const k = key => key.split(' + ').map(part => `<kbd>${part}</kbd>`).join(' + ');
const s = label => `<strong>${label}</strong>`;
const strip = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const escapeAttr = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
// {Name} becomes a bold control name, {key:Ctrl + Z} a keyboard cue.
const fill = text => text.replace(/\{key:([^}]+)\}/g, (_, key) => k(key)).replace(/\{([^}]+)\}/g, (_, name) => s(name));
const T = {
  category: 'Animation', steps: '10 steps', open: 'Open tutorial', title: 'XFER: transfer animations',
  description: 'Move animations from one model to another, whole skeleton or part by part.',
  intro: '{XFER} gives the open model movement from another model. {Transplant} puts the model on the donor\'s skeleton. {Retarget} takes parts one at a time. This guide moves the animations of one model to another with both.',
  list: [
    ['xfer-open', 'Open XFER and choose the donor', 'Click {XFER}. The window opens in {Transplant}; the switch at the top changes between {Transplant} and {Retarget}. Under {From}, click {Open file...} and pick the donor. Click an animation under {Animations}: both views play it.'],
    ['xfer-views', 'Views and playback', 'Each view has {Pause} / {Play}, a track to drag through the animation, a {Speed} that only changes how fast the view plays, and a dropdown of animations. Drag in either view to turn both. Click {↺} to frame the model again and turn both views back.'],
    ['xfer-transplant-method', 'Transplant: method', '{Rotation} turns each joint like the donor\'s. {Position} sends hands and feet where the donor\'s go; the star marks the suggestion. {Mix} shows a dot on each arm and leg: click one and choose {Rotation} or {Position} for that part. {All animations} applies a choice to every animation, {This animation} only to the one shown.'],
    ['xfer-transplant-options', 'Transplant: Mirror, Sounds, Effects, Keep', '{Mirror} swaps the donor\'s left and right. {Sounds} keeps the donor\'s sounds, {Effects} adds its particle effects. Under {Keep}, a ticked piece stays on its own bone.'],
    ['xfer-transplant-apply', 'Transplant and undo', 'Click {Transplant}. The model gets the donor\'s bones and all its animations; the button turns off until a setting changes. Close the window and look at the {Animations} tab. {key:Ctrl + Z} undoes it in one step.'],
    ['xfer-retarget-take', 'Retarget: take parts', 'Click {Retarget}. Click an animation, then click a hand or foot handle on the donor: that part is taken and its switch turns on in the parts list. {Take whole body} takes every part, {Clear all} removes them. {Mirror} and {Other side} take from the donor\'s other side.'],
    ['xfer-retarget-tune', 'Retarget: tune and aim', 'Select a taken part. {Strength}, {Pose} (Mine to Theirs), {Raise}, {Turn} and {Roll} change it, and the orange path follows. Double-click a slider to put its default back. Drag the hand on the result: {Whole movement} turns the whole movement, {This moment} fixes one moment (a diamond shows on the timeline), {Clear fixes} removes the fixes.'],
    ['xfer-retarget-timeline', 'Retarget: timeline', 'Drag a clip sideways to set {Delay}. Drag an edge to trim it, double-click the edge to put it back. {Timing} holds {Delay}, {Speed} and {Ease}. {Add after} plays the donor\'s shown animation after the first one in a lane of its own; its × removes it.'],
    ['xfer-retarget-switches', 'Retarget: switches', '{All taken parts} changes every taken part at once. {Keep foot on the ground}, {Stay in own range}, {Keep arm out of the body}, {Travel} and, on an arm that holds a weapon, {Keep weapon above the ground}. {Take from} takes the selected part from the animation the donor view shows now.'],
    ['xfer-retarget-finish', 'Retarget: finish', 'Type a {Name} and click {Add animation}: it joins the model\'s animations. {Add all} adds the donor\'s whole set; {Keep own animations} adds only the ones the model does not have. {Save as…} keeps the setup, {Load from…} uses it again.'],
  ],
};
const file = SITE + '/content.html', index = JSON.parse(fs.readFileSync(SITE + '/animation-index.json', 'utf8'));
const card = '/mdlxl/tutorials/' + CARD + '?v=' + hash(SITE + '/' + CARD);
const steps = T.list.map(([clip, heading, text]) => {
  const url = index[clip]?.url, body = fill(text), id = clip + '-title';
  if (!url) throw Error('No encoded clip ' + clip);
  return `      <section class="demo-step" aria-labelledby="${id}">
        <h4 id="${id}">${heading}</h4>
        <figure class="gif-player" data-animation="${clip}"><video class="player-frame" data-tutorial-video="${url}" muted loop playsinline controls width="1600" height="900" preload="metadata" aria-label="${escapeAttr(heading + '. ' + strip(body))}"></video></figure>
        <p>${body}</p>
      </section>`;
}).join('\n');
const cardHtml = `<a class="tutorial-card" id="tab-${KEY}" aria-controls="tutorial-${KEY}" data-tutorial="${KEY}" href="/mdlxl/tutorials/${SLUG}/?lang=en">
          <span class="tutorial-card-media" aria-hidden="true"><img src="${card}" width="960" height="504" alt=""></span>
          <span class="tutorial-card-copy">
            <span class="tutorial-card-category">${T.category}</span>
            <span class="tutorial-card-title">${T.title}</span>
            <span class="tutorial-card-description">${T.description}</span>
            <span class="tutorial-card-footer"><span>${T.steps}</span><span class="tutorial-card-open">${T.open} →</span></span>
          </span>
        </a>
`;
const article = `<article class="tutorial-panel" role="region" id="tutorial-${KEY}" aria-labelledby="tab-${KEY}" hidden>
      <p class="sample-note">${T.category}</p>
      <h3 id="${KEY}-title">${T.title}</h3>
      <p>${fill(T.intro)}</p>
${steps}
    </article>
`;
let html = fs.readFileSync(file, 'utf8');
html = html.replace(new RegExp(`<a class="tutorial-card" id="tab-${KEY}"[\\s\\S]*?<\\/a>\\n`), '').replace(new RegExp(`<article class="tutorial-panel" role="region" id="tutorial-${KEY}"[\\s\\S]*?<\\/article>\\n`), '');
if (!html.includes('</nav>')) throw Error('No card list in ' + file);
html = html.replace('</nav>', cardHtml + '</nav>');
html = (html.endsWith('\n') ? html : html + '\n') + article;
fs.writeFileSync(file, html);
console.log('Added XFER to en');
