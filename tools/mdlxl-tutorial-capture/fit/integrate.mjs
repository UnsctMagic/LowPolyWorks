// Adds the Fit tutorial card and article (UV Wrapper Fit tool, two clips) to every tutorial language page (EN/ES/RU/ZH/FR/DE) and the
// Mordor page, which shows the English guide and clips like the other UV guides. Running it again replaces the earlier card and article.
// Control names are the app's own labels from MDLxL's src/locales/<language>.json (English is the source text).
import fs from 'node:fs'; import crypto from 'node:crypto';
const SITE = process.env.LPW_SITE || 'D:/Claude/LowPolyWorks-fit-tutorial/dist/mdlxl/tutorials';
const APP = process.env.LPW_APP || 'D:/Claude/MDLxL/.claude/worktrees/fit-tutorial-app';
const LANGS = ['en', 'es', 'ru', 'zh', 'fr', 'de'], PAGES = [...LANGS, 'mordor'];
const KEY = 'fit', SLUG = 'fit', CARD = 'fit-card.png', CLIPS = ['fit-area', 'fit-move'];
const folder = page => SITE + '/' + (page === 'en' ? '' : page + '/');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const k = key => key.split(' + ').map(part => `<kbd>${part}</kbd>`).join(' + ');
const s = label => `<strong>${label}</strong>`;
const strip = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const escapeAttr = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const dict = lang => lang === 'en' ? {} : JSON.parse(fs.readFileSync(APP + '/src/locales/' + lang + '.json', 'utf8'));
const TEXT = {
  en: { open: 'Open tutorial', category: 'UV Wrapper', steps: '2 steps', description: 'Fit the UV selection into an area marked on the texture.', list: [['Mark an area', 'Select the points, click {Fit}, then click the corners with {Polygon lasso} around a part of the texture. Press {Enter} to close it.'], ['Fit', 'Click {Fit} again: the selected UVs move into the area. Only existing points move.']], intro: '{Fit} is in the UV Wrapper tools. {Freehand lasso} and {Magic wand} mark an area too.' },
  es: { open: 'Abrir tutorial', category: 'Editor UV', steps: '2 pasos', description: 'Ajusta la selección UV a un área marcada en la textura.', list: [['Marcar un área', 'Selecciona los puntos, pulsa {Fit} y haz clic en las esquinas con {Polygon lasso} alrededor de una parte de la textura. Pulsa {Enter} para cerrarla.'], ['Ajustar', 'Pulsa {Fit} otra vez: las UV seleccionadas se mueven al área. Solo se mueven los puntos existentes.']], intro: '{Fit} está en las herramientas del UV Wrapper. {Freehand lasso} y {Magic wand} también marcan un área.' },
  ru: { open: 'Открыть урок', category: 'UV-развёртка', steps: '2 шага', description: 'Впишите выбранные UV в область, отмеченную на текстуре.', list: [['Отметьте область', 'Выберите точки, нажмите {Fit}, затем щёлкайте по углам с помощью {Polygon lasso} вокруг части текстуры. Нажмите {Enter}, чтобы замкнуть контур.'], ['Вписать', 'Нажмите {Fit} ещё раз: выбранные UV переместятся в область. Двигаются только существующие точки.']], intro: '{Fit} находится в инструментах UV Wrapper. {Freehand lasso} и {Magic wand} тоже отмечают область.' },
  zh: { open: '打开教程', category: 'UV 编辑器', steps: '2 个步骤', description: '将选中的 UV 适应到纹理上标出的区域。', list: [['标出区域', '选中点，点击{Fit}，再用{Polygon lasso}依次点击纹理某一部分周围的各个角。按 {Enter} 闭合。'], ['适应', '再次点击{Fit}：选中的 UV 移入该区域。只移动已有的点。']], intro: '{Fit}位于 UV Wrapper 工具中。{Freehand lasso}和{Magic wand}同样可以标出区域。' },
  fr: { open: 'Ouvrir le tutoriel', category: 'Éditeur UV', steps: '2 étapes', description: 'Cadrez la sélection UV dans une zone marquée sur la texture.', list: [['Marquer une zone', 'Sélectionnez les points, cliquez sur {Fit}, puis sur les coins avec {Polygon lasso} autour d’une partie de la texture. Appuyez sur {Enter} pour fermer.'], ['Cadrer', 'Cliquez à nouveau sur {Fit} : les UV sélectionnés se déplacent dans la zone. Seuls les points existants bougent.']], intro: '{Fit} se trouve dans les outils de l’UV Wrapper. {Freehand lasso} et {Magic wand} marquent aussi une zone.' },
  de: { open: 'Tutorial öffnen', category: 'UV-Editor', steps: '2 Schritte', description: 'Die UV-Auswahl in einen auf der Textur markierten Bereich einpassen.', list: [['Bereich markieren', 'Punkte auswählen, {Fit} anklicken und mit {Polygon lasso} die Ecken um einen Teil der Textur anklicken. Mit {Enter} schließen.'], ['Einpassen', '{Fit} erneut anklicken: Die ausgewählten UVs wandern in den Bereich. Nur vorhandene Punkte bewegen sich.']], intro: '{Fit} steht in den Werkzeugen des UV Wrappers. {Freehand lasso} und {Magic wand} markieren den Bereich ebenfalls.' },
};
function markup(lang, page, index) {
  const d = dict(lang), l = key => d[key] ?? key, t = TEXT[lang], langAttr = page === lang ? '' : ` lang="${lang}"`;
  const fill = text => text.replaceAll('{Fit}', s(l('Fit'))).replaceAll('{Polygon lasso}', s(l('Polygon lasso'))).replaceAll('{Freehand lasso}', s(l('Freehand lasso'))).replaceAll('{Magic wand}', s(l('Magic wand'))).replaceAll('{Enter}', k('Enter'));
  const title = lang === 'en' ? 'Fit' : l('Fit');
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
  console.log('Added Fit to ' + page);
}
