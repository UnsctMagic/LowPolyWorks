// Adds the XFER tutorial card and article (Transfer window, ten clips) to every tutorial language page (EN/ES/RU/ZH/FR/DE) and the
// Mordor page, which shows the English guide and clips like the other guides. Running it again replaces the earlier card and article.
// Control names are the app's own labels from MDLxL's src/locales/<language>.json (English is the source text); labels the catalog lacks are listed at the end.
// LPW_PAGES=en,es,... limits the pages. Guide text: guide-text.json.
import fs from 'node:fs'; import crypto from 'node:crypto';
const SITE = process.env.LPW_SITE || 'D:/Claude/LowPolyWorks-xfer-tutorial/dist/mdlxl/tutorials';
const APP = process.env.LPW_APP || 'D:/Claude/xfertut-work/MDLxL';
const KEY = 'xfer', SLUG = 'xfer', CARD = 'xfer-card.png';
const CLIPS = ['xfer-open', 'xfer-views', 'xfer-transplant-method', 'xfer-transplant-options', 'xfer-transplant-apply', 'xfer-retarget-take', 'xfer-retarget-tune', 'xfer-retarget-timeline', 'xfer-retarget-switches', 'xfer-retarget-finish'];
const LANGS = ['en', 'es', 'ru', 'zh', 'fr', 'de'], PAGES = process.env.LPW_PAGES ? process.env.LPW_PAGES.split(',') : [...LANGS, 'mordor'];
const TEXT = JSON.parse(fs.readFileSync(new URL('./guide-text.json', import.meta.url), 'utf8'));
const folder = page => SITE + '/' + (page === 'en' ? '' : page + '/');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const k = key => key.split(' + ').map(part => `<kbd>${part}</kbd>`).join(' + ');
const s = label => `<strong>${label}</strong>`;
const strip = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const escapeAttr = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const dict = lang => lang === 'en' ? {} : JSON.parse(fs.readFileSync(APP + '/src/locales/' + lang + '.json', 'utf8'));
const missing = {};
// {Name} becomes the bold control name as the app shows it in that language, {{Name}} the plain name (headings), {key:Ctrl + Z} a keyboard cue.
const filler = lang => {
  const d = dict(lang), l = name => { if (!(name in d) && lang !== 'en' && name !== 'XFER' && name !== '↺') (missing[lang] ||= new Set()).add(name); return d[name] ?? name; };
  return text => text.replace(/\{key:([^}]+)\}/g, (_, key) => k(key)).replace(/\{\{([^}]+)\}\}/g, (_, name) => l(name)).replace(/\{([^}]+)\}/g, (_, name) => s(l(name)));
};
function markup(lang, page, index) {
  const t = TEXT[lang], fill = filler(lang), langAttr = page === lang ? '' : ` lang="${lang}"`;
  const card = '/mdlxl/tutorials/' + (lang === 'en' ? '' : lang + '/') + CARD + '?v=' + hash(folder(lang) + CARD);
  const steps = CLIPS.map((clip, i) => {
    const [heading0, text] = t.list[i], heading = fill(heading0).replace(/<[^>]+>/g, ''), id = clip + '-title', url = index[clip]?.url, body = fill(text);
    if (!url) throw Error('No encoded clip ' + page + '/' + clip);
    return `      <section class="demo-step" aria-labelledby="${id}">
        <h4 id="${id}">${heading}</h4>
        <figure class="gif-player" data-animation="${clip}"><video class="player-frame" data-tutorial-video="${url}" muted loop playsinline controls width="1600" height="900" preload="metadata" aria-label="${escapeAttr(heading + '. ' + strip(body))}"></video></figure>
        <p>${body}</p>
      </section>`;
  }).join('\n');
  const cardHtml = `<a class="tutorial-card" id="tab-${KEY}" aria-controls="tutorial-${KEY}" data-tutorial="${KEY}" href="/mdlxl/tutorials/${SLUG}/?lang=${page}"${langAttr}>
          <span class="tutorial-card-media" aria-hidden="true"><img src="${card}" width="960" height="504" alt=""></span>
          <span class="tutorial-card-copy">
            <span class="tutorial-card-category">${t.category}</span>
            <span class="tutorial-card-title">${t.title}</span>
            <span class="tutorial-card-description">${t.description}</span>
            <span class="tutorial-card-footer"><span>${t.steps}</span><span class="tutorial-card-open">${t.open} →</span></span>
          </span>
        </a>
`;
  const article = `<article class="tutorial-panel" role="region" id="tutorial-${KEY}" aria-labelledby="tab-${KEY}" hidden${langAttr}>
      <p class="sample-note">${t.category}</p>
      <h3 id="${KEY}-title">${t.title}</h3>
      <p>${fill(t.intro)}</p>
${steps}
    </article>
`;
  return { cardHtml, article };
}
// The Mordor page plays the English clips from its own folder.
if (PAGES.includes('mordor')) {
  const en = JSON.parse(fs.readFileSync(SITE + '/animation-index.json', 'utf8')), file = SITE + '/mordor/animation-index.json', mordor = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const clip of CLIPS) {
    fs.copyFileSync(SITE + '/' + clip + '.mp4', SITE + '/mordor/' + clip + '.mp4');
    mordor[clip] = { ...en[clip], url: en[clip].url.replace('/mdlxl/tutorials/', '/mdlxl/tutorials/mordor/') };
  }
  fs.writeFileSync(file, JSON.stringify(mordor) + '\n');
}
for (const page of PAGES) {
  const lang = page === 'mordor' ? 'en' : page, file = folder(page) + 'content.html';
  const index = JSON.parse(fs.readFileSync(folder(page) + 'animation-index.json', 'utf8'));
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(new RegExp(`<a class="tutorial-card" id="tab-${KEY}"[\\s\\S]*?<\\/a>\\n`), '').replace(new RegExp(`<article class="tutorial-panel" role="region" id="tutorial-${KEY}"[\\s\\S]*?<\\/article>\\n`), '');
  const m = markup(lang, page, index);
  if (!html.includes('</nav>')) throw Error('No card list in ' + file);
  html = html.replace('</nav>', m.cardHtml + '</nav>');
  html = (html.endsWith('\n') ? html : html + '\n') + m.article;
  fs.writeFileSync(file, html);
  console.log('Added XFER to ' + page);
}
for (const [lang, names] of Object.entries(missing)) console.log('Labels not in the ' + lang + ' catalog (shown as in English): ' + [...names].join(', '));
