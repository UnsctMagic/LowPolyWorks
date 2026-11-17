// Writes the EMTR ribbon tutorial (Fire sweep on the Footman's sword, three clips) into every tutorial page: EN/ES/RU/ZH/FR/DE and the
// Mordor page. The card keeps its title, description and step count; its picture, the three steps and the two notes are replaced.
// Control names are the app's own labels from MDLxL's src/locales/<language>.json (English is the source text).
import fs from 'node:fs'; import crypto from 'node:crypto';
const SITE = process.env.LPW_SITE || 'D:/Claude/LowPolyWorks-ribbon/dist/mdlxl/tutorials';
const APP = process.env.LPW_APP || 'D:/Claude/MDLxL/.claude/worktrees/ribbon-app';
const LANGS = ['en', 'es', 'ru', 'zh', 'fr', 'de'];
const CLIPS = ['ribbon-add', 'ribbon-timing', 'ribbon-play'], W = 1264, H = 760;
const folder = page => SITE + '/' + (page === 'en' ? '' : page + '/');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const b = text => `<strong>${text}</strong>`, k = key => key.split(' + ').map(part => `<kbd>${part}</kbd>`).join(' + ');
const plain = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const attr = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const dict = lang => lang === 'en' ? {} : JSON.parse(fs.readFileSync(APP + '/src/locales/' + lang + '.json', 'utf8'));
// Step texts per language. Names in bold are the app's labels; each step is one short instruction.
const TEXT = {
  en: l => ({ steps: [
    `With the weapon faces selected, open ${b('EMTR')} and click ${b(l('Add ribbon'))}. Pick ${b(l('Fire'))} under ${b(l('Sweep'))}. Under ${b(l('Visibility'))}, check only the attack, then click ${b(l('Create'))}.`,
    `Click ${b('+')} next to ${b(l('Lasts'))} for a longer trail. Drag the first blue diamond to ${b('20%')} and the second to ${b('100%')}.`,
    `Click ${b(l('Play'))} and turn the view with ${k('Alt + LMB')}. An unchecked animation stays clean.`],
    notes: [['Longer sweep', `${b(l('Lasts'))} sets how long trail pieces remain.`], ['Each animation separately', `Repeat the timing for each animation that shows the ribbon.`]] }),
  es: l => ({ steps: [
    `Con las caras del arma marcadas, abre ${b('EMTR')} y pulsa ${b(l('Add ribbon'))}. Elige ${b(l('Fire'))} en ${b(l('Sweep'))}. En ${b(l('Visibility'))}, marca solo el ataque y pulsa ${b(l('Create'))}.`,
    `Pulsa ${b('+')} junto a ${b(l('Lasts'))} para alargar el rastro. Arrastra el primer rombo azul al ${b('20%')} y el segundo al ${b('100%')}.`,
    `Pulsa ${b(l('Play'))} y gira la vista con ${k('Alt + LMB')}. Una animación sin marcar sigue limpia.`],
    notes: [['Un barrido más largo', `${b(l('Lasts'))} fija cuánto permanecen los segmentos del rastro.`], ['Cada animación por separado', `Repite el ajuste en cada animación que muestre la cinta.`]] }),
  ru: l => ({ steps: [
    `С отмеченными гранями оружия откройте ${b('EMTR')} и нажмите ${b(l('Add ribbon'))}. В ${b(l('Sweep'))} выберите ${b(l('Fire'))}. В ${b(l('Visibility'))} отметьте только атаку и нажмите ${b(l('Create'))}.`,
    `Нажмите ${b('+')} рядом с ${b(l('Lasts'))}, чтобы удлинить след. Перетащите первый синий ромб на ${b('20%')}, второй — на ${b('100%')}.`,
    `Нажмите ${b(l('Play'))} и поверните вид с ${k('Alt + LMB')}. В неотмеченной анимации следа нет.`],
    notes: [['Длинный след', `${b(l('Lasts'))} задаёт, как долго сохраняются части следа.`], ['Каждая анимация отдельно', `Повторите настройку для каждой анимации с лентой.`]] }),
  zh: l => ({ steps: [
    `选中武器面后，打开 ${b('EMTR')} 并点击${b(l('Add ribbon'))}。在${b(l('Sweep'))}中选择${b(l('Fire'))}。在${b(l('Visibility'))}中只勾选攻击动画，然后点击${b(l('Create'))}。`,
    `点击${b(l('Lasts'))}旁的 ${b('+')} 延长拖尾。把第一个蓝色菱形拖到 ${b('20%')}，第二个拖到 ${b('100%')}。`,
    `点击${b(l('Play'))}，用 ${k('Alt + LMB')} 转动视图。未勾选的动画保持干净。`],
    notes: [['更长的拖尾', `${b(l('Lasts'))}决定拖尾片段保留多久。`], ['逐个动画设置', `为每个显示飘带的动画重复设置时机。`]] }),
  fr: l => ({ steps: [
    `Les faces de l’arme étant sélectionnées, ouvrez ${b('EMTR')} et cliquez sur ${b(l('Add ribbon'))}. Choisissez ${b(l('Fire'))} sous ${b(l('Sweep'))}. Sous ${b(l('Visibility'))}, cochez uniquement l’attaque, puis cliquez sur ${b(l('Create'))}.`,
    `Cliquez sur ${b('+')} à côté de ${b(l('Lasts'))} pour une traînée plus longue. Faites glisser le premier losange bleu à ${b('20%')} et le second à ${b('100%')}.`,
    `Cliquez sur ${b(l('Play'))} et tournez la vue avec ${k('Alt + LMB')}. Une animation décochée reste propre.`],
    notes: [['Traînée plus longue', `${b(l('Lasts'))} règle la durée des segments de la traînée.`], ['Chaque animation séparément', `Répétez le réglage pour chaque animation qui montre le ruban.`]] }),
  de: l => ({ steps: [
    `Mit markierten Waffenflächen ${b('EMTR')} öffnen und ${b(l('Add ribbon'))} anklicken. Unter ${b(l('Sweep'))} ${b(l('Fire'))} wählen. Unter ${b(l('Visibility'))} nur den Angriff aktivieren, dann ${b(l('Create'))} anklicken.`,
    `${b('+')} neben ${b(l('Lasts'))} anklicken für eine längere Spur. Die erste blaue Raute auf ${b('20%')} ziehen, die zweite auf ${b('100%')}.`,
    `${b(l('Play'))} anklicken und die Ansicht mit ${k('Alt + LMB')} drehen. Eine deaktivierte Animation bleibt sauber.`],
    notes: [['Längere Spur', `${b(l('Lasts'))} bestimmt, wie lange Spursegmente erhalten bleiben.`], ['Jede Animation einzeln', `Das Timing für jede Animation mit Band wiederholen.`]] }),
};
// The Mordor page keeps its own words (headings stay); bold names are the Mordor words already used on that page.
const MORDOR = {
  steps: [`gimb nazg agh snaga, agh ${b('lugbúrz')} nazg krimp ${b('nazgûl lugbúrz')}. durb ${b('burzum')} agh ${b('snaga')}. agh ${b('gimb')}, durb agh nazg snaga, nazg krimp ${b('durb')}.`,
    `krimp ${b('+')} nazg ${b('nazgûl')} agh snaga ishi. durb ghâsh agh ishi nazg ${b('20%')}, nazg ghâsh ${b('100%')}.`,
    `krimp ${k('Alt + LMB')} nazg ghâsh. nazg uruk agh ishi burzum ash.`],
  notes: [['nazgûl burzum', `${b('nazgûl')} burzum durb agh atulûk agh uruk ash.`], ['uruk uruk gimb snaga', `nazg nazg agh ishi uruk gimb ghâsh krimp nazgûl.`]],
};
const section = (title, clip, text, url) => `<section class="demo-step"><h4>${title}</h4><figure class="gif-player" data-animation="${clip}"><video class="player-frame" width="${W}" height="${H}" aria-label="${attr(title + '. ' + plain(text))}" data-tutorial-video="${url}" muted loop playsinline controls preload="metadata"></video></figure><p>${text}</p></section>`;
// The Mordor page plays the English clips and card from its own folder.
{
  const en = JSON.parse(fs.readFileSync(SITE + '/animation-index.json', 'utf8')), file = SITE + '/mordor/animation-index.json', mordor = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const clip of CLIPS) {
    fs.copyFileSync(SITE + '/' + clip + '.mp4', SITE + '/mordor/' + clip + '.mp4');
    mordor[clip] = { ...en[clip], url: en[clip].url.replace('/mdlxl/tutorials/', '/mdlxl/tutorials/mordor/') };
  }
  fs.copyFileSync(SITE + '/ribbon-card.png', SITE + '/mordor/ribbon-card.png');
  fs.writeFileSync(file, JSON.stringify(mordor) + '\n');
}
const OLD_FILES = ['ribbon-emtr-tool.png', 'ribbon-add-tool.png'];
for (const page of [...LANGS, 'mordor']) {
  const t = page === 'mordor' ? MORDOR : (() => { const d = dict(page); return TEXT[page](key => d[key] ?? key); })();
  const index = JSON.parse(fs.readFileSync(folder(page) + 'animation-index.json', 'utf8'));
  const file = folder(page) + 'content.html';
  let html = fs.readFileSync(file, 'utf8');
  const src = '/mdlxl/tutorials/' + (page === 'en' ? '' : page + '/') + 'ribbon-card.png?v=' + hash(folder(page) + 'ribbon-card.png');
  const card = /(<a class="tutorial-card" id="tab-emtr"[^>]*><span class="tutorial-card-media" aria-hidden="true">)<img [^>]*>/;
  if (!card.test(html)) throw Error('No EMTR card in ' + page);
  html = html.replace(card, `$1<img src="${src}" width="${W}" height="${H}" alt="">`);
  const article = /(<article class="tutorial-panel" role="region" id="tutorial-emtr"[^>]*><h3>[^<]*<\/h3><p>[^<]*<\/p>)([\s\S]*?)(<\/article>)/;
  const m = html.match(article);
  if (!m) throw Error('No EMTR article in ' + page);
  const titles = [...m[2].matchAll(/<h4>([^<]*)<\/h4>/g)].map(x => x[1]);
  if (titles.length !== 3) throw Error('Expected three step titles in ' + page + ', found ' + titles.length);
  const steps = titles.map((title, i) => { const url = index[CLIPS[i]]?.url; if (!url) throw Error('No encoded clip ' + page + '/' + CLIPS[i]); return section(title, CLIPS[i], t.steps[i], url); }).join('');
  const notes = `<div class="notes">${t.notes.map(([h, p]) => `<p><strong>${h}</strong><br>${p}</p>`).join('')}</div>`;
  html = html.replace(article, (_, head, __, tail) => head + steps + notes + tail);
  fs.writeFileSync(file, html);
  for (const old of OLD_FILES) fs.rmSync(folder(page) + old, { force: true });
  console.log('EMTR ribbon tutorial written in ' + page);
}
