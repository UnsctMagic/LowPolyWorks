// Adds the Focused Skeleton and POSE tutorial cards and articles to every tutorial language page
// (EN/ES/RU/ZH/FR/DE, plus the Mordor page, which shows the English guides and clips like Spread pieces).
// Media URLs and hashes come from the animation-index records written by encode.mjs. Running it again replaces
// the earlier cards and articles, and removes the old combined "animated" guide's Forge clip (animated-forge).
import fs from 'node:fs'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
const SITE = process.env.LPW_SITE || 'D:/Claude/LowPolyWorks-anim-tut/dist/mdlxl/tutorials';
const WORK = process.env.LPW_WORK || 'D:/Claude/animtut2-work';
const FFMPEG = 'D:/Claude/MDLxL/electron/ffmpeg/ffmpeg.exe';
const LANGS = ['en', 'es', 'ru', 'zh', 'fr', 'de'], PAGES = [...LANGS, 'mordor'];
const folder = page => SITE + '/' + (page === 'en' ? '' : page + '/');
const k = key => key.split(' + ').map(part => `<kbd>${part}</kbd>`).join(' + ');
const s = label => `<strong>${label}</strong>`;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const ALL = [
  { key: 'fskel', slug: 'focused-skeleton', card: 'fskel-card.png', clips: ['fskel-pick', 'fskel-animate'] },
  { key: 'pose', slug: 'pose', card: 'pose-card.png', clips: ['pose-on', 'pose-arms', 'pose-legs'] },
];
// LPW_ONLY=pose re-runs one guide only (the other cards, articles and clips stay as they are).
const TUTORIALS = process.env.LPW_ONLY ? ALL.filter(t => t.key === process.env.LPW_ONLY) : ALL;
// Control names are the app's own labels from src/locales/<language>.json (POSE is not translated).
const TEXT = {
  en: { open: 'Open tutorial',
    fskel: { category: 'Movement', title: 'Focused Skeleton', steps: '2 steps', description: 'Animate a part with only its own bones shown.',
      intro: `${s('F.Skeleton')} shows only the bones of the selected part, so ${s('Bones')} and ${s('Skeleton')} can stay off.`,
      list: [['1. Double-click a part', `${k('LMB × 2')} on a limb selects its bones and turns on ${s('F.Skeleton')}. A second limb moves the focus.`],
        ['2. Animate the part', `Click a frame on the timeline, choose ${s('YZ')} under ${s('Workplane')}, then ${k('R + LMB')} and drag. ${k('Space')} plays it.`]] },
    pose: { category: 'Movement', title: 'POSE', steps: '3 steps', description: 'Pose a body with hand, foot and Body handles.',
      intro: `${s('POSE')} adds handles for the hands, feet and ${s('Body')}.`,
      list: [['1. Turn on POSE', `Click a frame on the timeline, then ${s('POSE')} under ${s('Tools')}.`],
        ['2. Place the arms', `Drag the ${s('Hand')} handles to place the arms.`],
        ['3. Body and foot', `Drag ${s('Body')} down and a ${s('Foot')} forward. ${k('Alt + LMB')} turns the view.`]] } },
  es: { open: 'Abrir tutorial',
    fskel: { category: 'Movimiento', title: 'Esqueleto enfocado', steps: '2 pasos', description: 'Anima una parte mostrando solo sus huesos.',
      intro: `${s('Esq. enf.')} muestra solo los huesos de la parte seleccionada, así que ${s('Huesos')} y ${s('Esqueleto')} pueden seguir desactivados.`,
      list: [['1. Doble clic en una parte', `${k('LMB × 2')} en una extremidad selecciona sus huesos y activa ${s('Esq. enf.')}. Otra extremidad mueve el foco.`],
        ['2. Anima la parte', `Haz clic en un fotograma de la línea de tiempo, elige ${s('YZ')} en ${s('Plano de trabajo')}, luego ${k('R + LMB')} y arrastra. ${k('Space')} la reproduce.`]] },
    pose: { category: 'Movimiento', title: 'POSE', steps: '3 pasos', description: 'Coloca un cuerpo con tiradores de manos, pies y cuerpo.',
      intro: `${s('POSE')} añade tiradores para las manos, los pies y el ${s('Cuerpo')}.`,
      list: [['1. Activa POSE', `Haz clic en un fotograma de la línea de tiempo y luego en ${s('POSE')} en ${s('Herramientas')}.`],
        ['2. Coloca los brazos', `Arrastra los tiradores de ${s('Mano')} para colocar los brazos.`],
        ['3. Cuerpo y pie', `Arrastra ${s('Cuerpo')} hacia abajo y un ${s('Pie')} hacia adelante. ${k('Alt + LMB')} gira la vista.`]] } },
  ru: { open: 'Открыть урок',
    fskel: { category: 'Движение', title: 'Выбранный скелет', steps: '2 шага', description: 'Анимируйте часть, показывая только её кости.',
      intro: `${s('Выбр. скелет')} показывает только кости выбранной части, поэтому ${s('Кости')} и ${s('Скелет')} можно не включать.`,
      list: [['1. Двойной щелчок по части', `${k('LMB × 2')} по конечности выбирает её кости и включает ${s('Выбр. скелет')}. Другая конечность переносит фокус.`],
        ['2. Анимируйте часть', `Щёлкните кадр на шкале, выберите ${s('YZ')} в ${s('Рабочая плоскость')}, затем ${k('R + LMB')} и потяните. ${k('Space')} воспроизводит.`]] },
    pose: { category: 'Движение', title: 'POSE', steps: '3 шага', description: 'Поза тела с ручками кистей, стоп и тела.',
      intro: `${s('POSE')} добавляет ручки для кистей, стоп и ${s('Тело')}.`,
      list: [['1. Включите POSE', `Щёлкните кадр на шкале, затем ${s('POSE')} в ${s('Инструменты')}.`],
        ['2. Расставьте руки', `Потяните ручки ${s('Кисть')}, чтобы расположить руки.`],
        ['3. Тело и стопа', `Потяните ${s('Тело')} вниз, а ${s('Стопа')} вперёд. ${k('Alt + LMB')} вращает вид.`]] } },
  zh: { open: '打开教程',
    fskel: { category: '运动', title: '聚焦骨架', steps: '2 个步骤', description: '只显示所选部位的骨骼来制作动画。',
      intro: `${s('聚焦骨架')}只显示所选部位的骨骼，因此${s('骨骼')}和${s('骨架')}可以保持关闭。`,
      list: [['1. 双击部位', `在肢体上 ${k('LMB × 2')} 会选中它的骨骼并开启${s('聚焦骨架')}。再双击另一个肢体即可转移焦点。`],
        ['2. 为该部位做动画', `点击时间轴上的一帧，在${s('工作平面')}中选择 ${s('YZ')}，然后 ${k('R + LMB')} 并拖动。${k('Space')} 播放。`]] },
    pose: { category: '运动', title: 'POSE', steps: '3 个步骤', description: '用手、脚和身体控制点摆姿势。',
      intro: `${s('POSE')}为手、脚和${s('身体')}添加控制点。`,
      list: [['1. 开启 POSE', `点击时间轴上的一帧，然后点击${s('工具')}中的 ${s('POSE')}。`],
        ['2. 摆放手臂', `拖动${s('手')}控制点来摆放手臂。`],
        ['3. 身体和脚', `把${s('身体')}向下拖，把${s('脚')}向前拖。${k('Alt + LMB')} 转动视图。`]] } },
  fr: { open: 'Ouvrir le tutoriel',
    fskel: { category: 'Mouvement', title: 'Squelette ciblé', steps: '2 étapes', description: 'Animez une partie en n’affichant que ses os.',
      intro: `${s('Squel. ciblé')} n’affiche que les os de la partie sélectionnée : ${s('Os')} et ${s('Squelette')} peuvent rester désactivés.`,
      list: [['1. Double-cliquer sur une partie', `${k('LMB × 2')} sur un membre sélectionne ses os et active ${s('Squel. ciblé')}. Un autre membre déplace le focus.`],
        ['2. Animer la partie', `Cliquez sur une image de la chronologie, choisissez ${s('YZ')} sous ${s('Plan de travail')}, puis ${k('R + LMB')} et faites glisser. ${k('Space')} la lit.`]] },
    pose: { category: 'Mouvement', title: 'POSE', steps: '3 étapes', description: 'Posez un corps avec les poignées des mains, pieds et du corps.',
      intro: `${s('POSE')} ajoute des poignées pour les mains, les pieds et le ${s('Corps')}.`,
      list: [['1. Activer POSE', `Cliquez sur une image de la chronologie, puis sur ${s('POSE')} sous ${s('Outils')}.`],
        ['2. Placer les bras', `Faites glisser les poignées ${s('Main')} pour placer les bras.`],
        ['3. Corps et pied', `Faites glisser ${s('Corps')} vers le bas et un ${s('Pied')} vers l’avant. ${k('Alt + LMB')} tourne la vue.`]] } },
  de: { open: 'Tutorial öffnen',
    fskel: { category: 'Bewegung', title: 'Fokussiertes Skelett', steps: '2 Schritte', description: 'Ein Teil animieren, nur mit seinen Knochen.',
      intro: `${s('F.Skelett')} zeigt nur die Knochen des gewählten Teils, ${s('Knochen')} und ${s('Skelett')} können aus bleiben.`,
      list: [['1. Teil doppelt anklicken', `${k('LMB × 2')} auf ein Glied wählt seine Knochen und schaltet ${s('F.Skelett')} ein. Ein anderes Glied verschiebt den Fokus.`],
        ['2. Das Teil animieren', `Ein Bild auf der Zeitleiste anklicken, unter ${s('Arbeitsebene')} ${s('YZ')} wählen, dann ${k('R + LMB')} und ziehen. ${k('Space')} spielt es ab.`]] },
    pose: { category: 'Bewegung', title: 'POSE', steps: '3 Schritte', description: 'Einen Körper mit Hand-, Fuß- und Körpergriffen posieren.',
      intro: `${s('POSE')} fügt Griffe für Hände, Füße und ${s('Körper')} hinzu.`,
      list: [['1. POSE einschalten', `Ein Bild auf der Zeitleiste anklicken, dann ${s('POSE')} unter ${s('Werkzeuge')}.`],
        ['2. Die Arme platzieren', `Die ${s('Hand')}-Griffe ziehen, um die Arme zu platzieren.`],
        ['3. Körper und Fuß', `${s('Körper')} nach unten und einen ${s('Fuß')} nach vorn ziehen. ${k('Alt + LMB')} dreht die Ansicht.`]] } },
};
const strip = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const escapeAttr = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

function markup(lang, page, tutorial, index) {
  const t = TEXT[lang], u = t[tutorial.key], langAttr = page === lang ? '' : ` lang="${lang}"`;
  const card = '/mdlxl/tutorials/' + (lang === 'en' ? '' : lang + '/') + tutorial.card + '?v=' + hash(folder(lang) + tutorial.card);
  const steps = u.list.map(([title, text], i) => {
    const clip = tutorial.clips[i], id = clip + '-title', url = index[clip]?.url;
    if (!url) throw Error('No encoded clip ' + page + '/' + clip);
    return `      <section class="demo-step" aria-labelledby="${id}">
        <h4 id="${id}">${title}</h4>
        <figure class="gif-player" data-animation="${clip}"><video class="player-frame" data-tutorial-video="${url}" muted loop playsinline controls width="1264" height="760" preload="metadata" aria-label="${escapeAttr(title + '. ' + strip(text))}"></video></figure>
        <p>${text}</p>
      </section>`;
  }).join('\n');
  const cardHtml = `<a class="tutorial-card" id="tab-${tutorial.key}" aria-controls="tutorial-${tutorial.key}" data-tutorial="${tutorial.key}" href="/mdlxl/tutorials/${tutorial.slug}/?lang=${page}"${langAttr}>
          <span class="tutorial-card-media" aria-hidden="true"><img src="${card}" width="1264" height="760" alt=""></span>
          <span class="tutorial-card-copy">
            <span class="tutorial-card-category">${u.category}</span>
            <span class="tutorial-card-title">${u.title}</span>
            <span class="tutorial-card-description">${u.description}</span>
            <span class="tutorial-card-footer"><span>${u.steps}</span><span class="tutorial-card-open">${t.open} →</span></span>
          </span>
        </a>
`;
  const article = `<article class="tutorial-panel" role="region" id="tutorial-${tutorial.key}" aria-labelledby="tab-${tutorial.key}" hidden${langAttr}>
      <p class="sample-note">${u.category}</p>
      <h3 id="${tutorial.key}-title">${u.title}</h3>
      <p>${u.intro}</p>
${steps}
    </article>
`;
  return { cardHtml, article };
}

// The Mordor page plays the English clips with English captions, from its own folder like its other clips.
{
  const en = JSON.parse(fs.readFileSync(SITE + '/animation-index.json', 'utf8')), mordorFile = SITE + '/mordor/animation-index.json', mordor = JSON.parse(fs.readFileSync(mordorFile, 'utf8'));
  for (const clip of TUTORIALS.flatMap(t => t.clips)) {
    fs.copyFileSync(SITE + '/' + clip + '.mp4', SITE + '/mordor/' + clip + '.mp4');
    mordor[clip] = { ...en[clip], url: en[clip].url.replace('/mdlxl/tutorials/', '/mdlxl/tutorials/mordor/') };
  }
  fs.writeFileSync(mordorFile, JSON.stringify(mordor) + '\n');
}
for (const page of PAGES) {
  const lang = page === 'mordor' ? 'en' : page, file = folder(page) + 'content.html', indexFile = folder(page) + 'animation-index.json';
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  let html = fs.readFileSync(file, 'utf8');
  for (const key of TUTORIALS.map(t => t.key))
    html = html.replace(new RegExp(`<a class="tutorial-card" id="tab-${key}"[\\s\\S]*?<\\/a>\\n`), '').replace(new RegExp(`<article class="tutorial-panel" role="region" id="tutorial-${key}"[\\s\\S]*?<\\/article>\\n`), '');
  let cards = '', articles = '';
  for (const tutorial of TUTORIALS) { const m = markup(lang, page, tutorial, index); cards += m.cardHtml; articles += m.article; }
  if (!html.includes('</nav>')) throw Error('No card list in ' + file);
  html = html.replace('</nav>', cards + '</nav>');
  html = (html.endsWith('\n') ? html : html + '\n') + articles;
  fs.writeFileSync(file, html);
  console.log('Added Focused Skeleton and POSE to ' + page);
}
