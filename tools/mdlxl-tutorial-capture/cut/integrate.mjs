// Adds the Cut tutorial card and article (vertex editor Cut tool, two clips) to every tutorial language page (EN/ES/RU/ZH/FR/DE) and the
// Mordor page, which shows the English guide and clips like the other vertex guides. Running it again replaces the earlier card and article.
// Control names are the app's own labels from MDLxL's src/locales/<language>.json (English is the source text).
import fs from 'node:fs'; import crypto from 'node:crypto';
const SITE = process.env.LPW_SITE || 'D:/Claude/LowPolyWorks-cut-tutorial/dist/mdlxl/tutorials';
const APP = process.env.LPW_APP || 'D:/Claude/MDLxL/.claude/worktrees/cut-tutorial-app';
const LANGS = ['en', 'es', 'ru', 'zh', 'fr', 'de'], PAGES = [...LANGS, 'mordor'];
const KEY = 'cut', SLUG = 'cut', CARD = 'cut-card.png', CLIPS = ['cut-line', 'cut-corner'];
const folder = page => SITE + '/' + (page === 'en' ? '' : page + '/');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const k = key => key.split(' + ').map(part => `<kbd>${part}</kbd>`).join(' + ');
const s = label => `<strong>${label}</strong>`;
const strip = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const escapeAttr = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const dict = lang => lang === 'en' ? {} : JSON.parse(fs.readFileSync(APP + '/src/locales/' + lang + '.json', 'utf8'));
const TEXT = {
  en: { open: 'Open tutorial', category: 'Vertex editor', steps: '2 steps', description: 'Split a triangle from a vertex.', list: [['Cut a line', 'Click {Cut}, then a vertex. Move onto a line across from it and click: a point is made there and both triangles beside the line split.'], ['Cut to a corner', 'Press {Z} to undo. With {Cut} on, click a vertex, then the corner across the line: the line between the two triangles turns to end there.']], intro: '{Cut} is beside {Create triangle} in the Vertex editor.' },
  es: { open: 'Abrir tutorial', category: 'Editor de vértices', steps: '2 pasos', description: 'Divide un triángulo desde un vértice.', list: [['Cortar una línea', 'Pulsa {Cut}, luego un vértice. Mueve el cursor sobre una línea frente a él y haz clic: se crea un punto y se dividen los dos triángulos junto a la línea.'], ['Cortar a una esquina', 'Pulsa {Z} para deshacer. Con {Cut} activo, pulsa un vértice y luego la esquina al otro lado de la línea: la línea entre los dos triángulos gira y termina allí.']], intro: '{Cut} está junto a {Create triangle} en el editor de vértices.' },
  ru: { open: 'Открыть урок', category: 'Редактор вершин', steps: '2 шага', description: 'Разделите треугольник от вершины.', list: [['Разрез по линии', 'Нажмите {Cut}, затем вершину. Наведите на линию напротив неё и нажмите: появится точка, и оба треугольника рядом с линией разделятся.'], ['Разрез к углу', 'Нажмите {Z}, чтобы отменить. При включённом {Cut} нажмите вершину, затем угол за линией: линия между двумя треугольниками повернётся и закончится там.']], intro: '{Cut} находится рядом с {Create triangle} в редакторе вершин.' },
  zh: { open: '打开教程', category: '顶点编辑器', steps: '2 个步骤', description: '从顶点分割三角形。', list: [['切割线', '点击{Cut}，再点击一个顶点。移到它对面的线上并点击：在该处生成一个点，线两侧的两个三角形都被分割。'], ['切割到角', '按 {Z} 撤销。保持{Cut}开启，点击一个顶点，再点击线对面的角：两个三角形之间的线转向并终止于该角。']], intro: '{Cut}位于顶点编辑器中的{Create triangle}旁边。' },
  fr: { open: 'Ouvrir le tutoriel', category: 'Éditeur de sommets', steps: '2 étapes', description: 'Divisez un triangle depuis un sommet.', list: [['Couper une ligne', 'Cliquez sur {Cut}, puis sur un sommet. Passez sur une ligne en face et cliquez : un point est créé et les deux triangles de part et d’autre de la ligne sont divisés.'], ['Couper vers un coin', 'Appuyez sur {Z} pour annuler. Avec {Cut} actif, cliquez sur un sommet, puis sur le coin de l’autre côté de la ligne : la ligne entre les deux triangles pivote et s’arrête là.']], intro: '{Cut} se trouve à côté de {Create triangle} dans l’éditeur de sommets.' },
  de: { open: 'Tutorial öffnen', category: 'Vertex-Editor', steps: '2 Schritte', description: 'Ein Dreieck von einem Scheitelpunkt aus teilen.', list: [['Eine Linie schneiden', '{Cut} anklicken, dann einen Scheitelpunkt. Auf eine Linie gegenüber zeigen und klicken: Dort entsteht ein Punkt und beide Dreiecke neben der Linie werden geteilt.'], ['Zu einer Ecke schneiden', 'Mit {Z} rückgängig machen. Bei aktivem {Cut} einen Scheitelpunkt anklicken, dann die Ecke hinter der Linie: Die Linie zwischen den beiden Dreiecken dreht sich und endet dort.']], intro: '{Cut} steht neben {Create triangle} im Vertex-Editor.' },
};
function markup(lang, page, index) {
  const d = dict(lang), l = key => d[key] ?? key, t = TEXT[lang], langAttr = page === lang ? '' : ` lang="${lang}"`;
  const fill = text => text.replaceAll('{Cut}', s(l('Cut'))).replaceAll('{Create triangle}', s(l('Create triangle'))).replaceAll('{Z}', k('Ctrl + Z'));
  const title = l('Cut');
  const card = '/mdlxl/tutorials/' + (lang === 'en' ? '' : lang + '/') + CARD + '?v=' + hash(folder(lang) + CARD);
  const steps = t.list.map(([heading, text], i) => {
    const clip = CLIPS[i], id = clip + '-title', url = index[clip]?.url, body = fill(text);
    if (!url) throw Error('No encoded clip ' + page + '/' + clip);
    return `      <section class="demo-step" aria-labelledby="${id}">
        <h4 id="${id}">${heading}</h4>
        <figure class="gif-player" data-animation="${clip}"><video class="player-frame" data-tutorial-video="${url}" muted loop playsinline controls width="1264" height="760" preload="metadata" aria-label="${escapeAttr(heading + '. ' + strip(body))}"></video></figure>
        <p>${body}</p>
      </section>`;
  }).join('\n');
  const cardHtml = `<a class="tutorial-card" id="tab-${KEY}" aria-controls="tutorial-${KEY}" data-tutorial="${KEY}" href="/mdlxl/tutorials/${SLUG}/?lang=${page}"${langAttr}>
          <span class="tutorial-card-media" aria-hidden="true"><img src="${card}" width="1264" height="760" alt=""></span>
          <span class="tutorial-card-copy">
            <span class="tutorial-card-category">${t.category}</span>
            <span class="tutorial-card-title">${title}</span>
            <span class="tutorial-card-description">${t.description}</span>
            <span class="tutorial-card-footer"><span>${t.steps}</span><span class="tutorial-card-open">${t.open} →</span></span>
          </span>
        </a>
`;
  const article = `<article class="tutorial-panel" role="region" id="tutorial-${KEY}" aria-labelledby="tab-${KEY}" hidden${langAttr}>
      <p class="sample-note">${t.category}</p>
      <h3 id="${KEY}-title">${title}</h3>
      <p>${fill(t.intro)}</p>
${steps}
    </article>
`;
  return { cardHtml, article };
}
// The Mordor page plays the English clips from its own folder.
{
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
  console.log('Added Cut to ' + page);
}
