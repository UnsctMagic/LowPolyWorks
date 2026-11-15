// Writes the FX tutorial (six steps on the Great Unclean One) into every tutorial page: EN/ES/RU/ZH/FR/DE, and the Mordor page,
// which plays the English clips with its own words. The card, the article's title, intro and steps are replaced; the
// "Advanced functions" reference stays. Old fx-* clips and their index records are removed. Running it again is harmless.
// Media URLs and hashes come from the animation-index records written by encode.mjs. Control names are the app's own labels.
import fs from 'node:fs'; import crypto from 'node:crypto';
const SITE = process.env.LPW_SITE || 'D:/Claude/LowPolyWorks-fx-tutorial/dist/mdlxl/tutorials';
const LANGS = ['en', 'es', 'ru', 'zh', 'fr', 'de'], CLIPS = ['fx-skin', 'fx-pus', 'fx-horns', 'fx-weapon', 'fx-sweep', 'fx-result'], W = 1264, H = 760;
const OLD = ['fx-choose', 'fx-layers', 'fx-emitters', 'fx-apply', 'fx-adjust', 'fx-animations'];
const folder = page => SITE + '/' + (page === 'en' ? '' : page + '/');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const b = text => `<strong>${text}</strong>`, k = text => `<kbd>${text}</kbd>`;
const plain = html => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
const attr = text => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const TEXT = {
  en: {
    title: 'FX: build an effect', steps: '6 steps',
    description: 'Give each part of a model its own effect, add a weapon sweep and check the result.',
    intro: 'FX gives one part of the model a permanent effect that runs in every animation. This guide puts ice on the Great Unclean One one part at a time; each step continues from the last.',
    list: [
      ['1. Ice on the skin', `Open ${b('FX')}. Turn the preview with the left mouse button and double-click the skin. Open ${b('Ice')} and click ${b('Frost')}. Turn the mouse wheel over ${b('Variation')} to pick a version, here ${b('Frosted steel')}. ${b('Apply effect')} adds it to the model.`],
      ['2. Crystals on the pus', `Open ${b('FX')} again; the skin keeps its effect. Turn to the back and double-click the pus. Click ${b('Ice')} &gt; ${b('Crystal')} and choose ${b('Crystal growth')} under ${b('Variation')}. With the ${b('Crystals')} layer selected, drag ${b('Size')}, ${b('Length')}, ${b('Count')} and ${b('Glow')}. ${b('Apply effect')}.`],
      ['3. Ice on the horns', `Double-click a horn and choose ${b('Ice')} &gt; ${b('Frost')}, ${b('Variation')} ${b('Dark ice')}. Clear the checkbox of ${b('Falling mist')} to turn that layer off. Click ${b('Add layer')}, type ${b('Ice facets')} and click it. ${b('Apply effect')}.`],
      ['4. Spikes on the weapon', `Double-click the blade and click ${b('Fit selection')} to frame it. Choose ${b('Ice')} &gt; ${b('Frost')}, ${b('Variation')} ${b('Ice spikes')}. Click the ${b('Ice spikes')} layer and drag ${b('Size')}, ${b('Count')} and ${b('Length')}. ${b('Apply effect')}.`],
      ['5. Frost sweep on the swing', `In ${b('Vertices')}, click ${b('Clear')} under ${b('Geosets')}, tick the blade's geoset and press ${k('Ctrl')} + ${k('A')}. Open the ${b('Emitter Editor')} and click ${b('Add ribbon')}. Choose ${b('Frost')} under ${b('Sweep')}, tick the attack animations under ${b('Visibility')} and click ${b('Create')}.`],
      ['6. Check the result', `Open ${b('Showcase')}. Click the animation in the list, choose ${b('Attack - 1')}, click ${b('OK')}, then ${b('Preview animation')}. Zoom with the mouse wheel and turn the camera with the left mouse button.`],
    ],
  },
  es: {
    title: 'FX: crea un efecto', steps: '6 pasos',
    description: 'Da a cada parte de un modelo su propio efecto, añade un barrido al arma y comprueba el resultado.',
    intro: 'FX da a una parte del modelo un efecto permanente que se reproduce en todas las animaciones. Esta guía cubre de hielo al Gran Inmundo parte por parte; cada paso continúa el anterior.',
    list: [
      ['1. Hielo en la piel', `Abre ${b('FX')}. Gira la vista previa con el botón izquierdo del ratón y haz doble clic en la piel. Abre ${b('Hielo')} y pulsa ${b('Escarcha')}. Gira la rueda del ratón sobre ${b('Variación')} para elegir una versión, aquí ${b('Acero escarchado')}. ${b('Aplicar efecto')} lo añade al modelo.`],
      ['2. Cristales en el pus', `Vuelve a abrir ${b('FX')}; la piel conserva su efecto. Gira hacia la espalda y haz doble clic en el pus. Pulsa ${b('Hielo')} &gt; ${b('Cristal')} y elige ${b('Crecimiento de cristales')} en ${b('Variación')}. Con la capa ${b('Cristales')} seleccionada, arrastra ${b('Tamaño')}, ${b('Longitud')}, ${b('Cantidad')} y ${b('Brillo')}. ${b('Aplicar efecto')}.`],
      ['3. Hielo en los cuernos', `Haz doble clic en un cuerno y elige ${b('Hielo')} &gt; ${b('Escarcha')}, ${b('Variación')} ${b('Hielo oscuro')}. Desmarca la casilla de ${b('Niebla descendente')} para desactivar esa capa. Pulsa ${b('Añadir capa')}, escribe ${b('Facetas de hielo')} y pulsa la fila. ${b('Aplicar efecto')}.`],
      ['4. Púas en el arma', `Haz doble clic en la hoja y pulsa ${b('Encuadrar selección')} para encuadrarla. Elige ${b('Hielo')} &gt; ${b('Escarcha')}, ${b('Variación')} ${b('Púas de hielo')}. Pulsa la capa ${b('Púas de hielo')} y arrastra ${b('Tamaño')}, ${b('Cantidad')} y ${b('Longitud')}. ${b('Aplicar efecto')}.`],
      ['5. Barrido de escarcha en el golpe', `En ${b('Vértices')}, pulsa ${b('Limpiar')} en ${b('Geosets')}, marca el geoset de la hoja y pulsa ${k('Ctrl')} + ${k('A')}. Abre el ${b('Editor de emisores')} y pulsa ${b('Añadir cinta')}. Elige ${b('Escarcha')} en ${b('Barrido')}, marca las animaciones de ataque en ${b('Visibilidad')} y pulsa ${b('Crear')}.`],
      ['6. Comprueba el resultado', `Abre ${b('Exhibición')}. Pulsa la animación de la lista, elige ${b('Attack - 1')}, pulsa ${b('Aceptar')} y luego ${b('Ver animación')}. Acerca la vista con la rueda del ratón y gira la cámara con el botón izquierdo.`],
    ],
  },
  ru: {
    title: 'FX: создание эффекта', steps: '6 шагов',
    description: 'Задайте каждой части модели свой эффект, добавьте проводку оружия и проверьте результат.',
    intro: 'FX даёт части модели постоянный эффект, который идёт во всех анимациях. В этом уроке Великий Нечистый покрывается льдом по одной части; каждый шаг продолжает предыдущий.',
    list: [
      ['1. Лёд на коже', `Откройте ${b('FX')}. Поверните просмотр левой кнопкой мыши и дважды щёлкните по коже. Откройте ${b('Лёд')} и щёлкните ${b('Иней')}. Покрутите колесо мыши над ${b('Разброс')}, чтобы выбрать версию, здесь ${b('Покрытая инеем сталь')}. ${b('Применить эффект')} добавляет его в модель.`],
      ['2. Кристаллы на гное', `Снова откройте ${b('FX')}; кожа сохраняет свой эффект. Поверните модель спиной и дважды щёлкните по гною. Щёлкните ${b('Лёд')} &gt; ${b('Кристаллы')} и выберите ${b('Рост кристаллов')} в ${b('Разброс')}. Со слоем ${b('Кристаллы')} перетащите ${b('Размер')}, ${b('Длина')}, ${b('Количество')} и ${b('Свечение')}. ${b('Применить эффект')}.`],
      ['3. Лёд на рогах', `Дважды щёлкните по рогу и выберите ${b('Лёд')} &gt; ${b('Иней')}, ${b('Разброс')} ${b('Тёмный лёд')}. Снимите флажок ${b('Опускающийся туман')}, чтобы выключить этот слой. Нажмите ${b('Добавить слой')}, введите ${b('Ледяные грани')} и щёлкните строку. ${b('Применить эффект')}.`],
      ['4. Шипы на оружии', `Дважды щёлкните по клинку и нажмите ${b('Вписать выделение')}, чтобы приблизить его. Выберите ${b('Лёд')} &gt; ${b('Иней')}, ${b('Разброс')} ${b('Ледяные шипы')}. Щёлкните слой ${b('Ледяные шипы')} и перетащите ${b('Размер')}, ${b('Количество')} и ${b('Длина')}. ${b('Применить эффект')}.`],
      ['5. Проводка инея на ударе', `В ${b('Вершины')} нажмите ${b('Очистить')} в ${b('Геосеты')}, отметьте геосет клинка и нажмите ${k('Ctrl')} + ${k('A')}. Откройте ${b('Редактор эмиттеров')} и нажмите ${b('Добавить ленту')}. Выберите ${b('Иней')} в ${b('Проводка')}, отметьте анимации атаки в ${b('Видимость')} и нажмите ${b('Создать')}.`],
      ['6. Проверка результата', `Откройте ${b('Витрина')}. Щёлкните анимацию в списке, выберите ${b('Attack - 1')}, нажмите ${b('ОК')}, затем ${b('Просмотр анимации')}. Приблизьте колесом мыши и поворачивайте камеру левой кнопкой мыши.`],
    ],
  },
  zh: {
    title: 'FX：制作特效', steps: '6 个步骤',
    description: '为模型的每个部分设置各自的特效，为武器添加扫掠，并查看结果。',
    intro: 'FX 为模型的一个部分添加在所有动画中运行的永久特效。本教程逐个部分为大不净者覆盖冰效果；每一步都接着上一步继续。',
    list: [
      ['1. 皮肤上的冰', `打开 ${b('FX')}。用鼠标左键旋转预览，然后双击皮肤。打开 ${b('冰')} 并点击 ${b('冰霜')}。在 ${b('变化')} 上滚动鼠标滚轮选择一个版本，这里是 ${b('霜覆钢铁')}。${b('应用特效')} 会将其添加到模型。`],
      ['2. 脓疱上的水晶', `再次打开 ${b('FX')}；皮肤保留其特效。转到背面并双击脓疱。点击 ${b('冰')} &gt; ${b('水晶')}，在 ${b('变化')} 中选择 ${b('水晶生长')}。选中 ${b('水晶')} 图层后，拖动 ${b('大小')}、${b('长度')}、${b('数量')} 和 ${b('辉光')}。${b('应用特效')}。`],
      ['3. 角上的冰', `双击一只角，选择 ${b('冰')} &gt; ${b('冰霜')}，${b('变化')} 选 ${b('深色冰面')}。取消勾选 ${b('下落薄雾')} 以关闭该图层。点击 ${b('添加图层')}，输入 ${b('冰晶切面')} 并点击该行。${b('应用特效')}。`],
      ['4. 武器上的冰刺', `双击刀刃，点击 ${b('适应选择')} 将其放大。选择 ${b('冰')} &gt; ${b('冰霜')}，${b('变化')} 选 ${b('冰刺')}。点击 ${b('冰刺')} 图层并拖动 ${b('大小')}、${b('数量')} 和 ${b('长度')}。${b('应用特效')}。`],
      ['5. 挥击上的冰霜扫掠', `在 ${b('顶点')} 中，点击 ${b('几何集')} 下的 ${b('清除')}，勾选刀刃的几何组，然后按 ${k('Ctrl')} + ${k('A')}。打开 ${b('发射器编辑器')} 并点击 ${b('添加丝带')}。在 ${b('扫掠')} 中选择 ${b('冰霜')}，在 ${b('可见性')} 中勾选攻击动画，然后点击 ${b('创建')}。`],
      ['6. 查看结果', `打开 ${b('展示')}。点击列表中的动画，选择 ${b('Attack - 1')}，点击 ${b('确定')}，然后点击 ${b('预览动画')}。用鼠标滚轮缩放，用鼠标左键旋转镜头。`],
    ],
  },
  fr: {
    title: 'FX : créer un effet', steps: '6 étapes',
    description: 'Donnez à chaque partie d’un modèle son propre effet, ajoutez un balayage à l’arme et vérifiez le résultat.',
    intro: 'FX donne à une partie du modèle un effet permanent qui joue dans toutes les animations. Ce guide recouvre de glace le Grand Immonde partie par partie ; chaque étape reprend la précédente.',
    list: [
      ['1. Glace sur la peau', `Ouvrez ${b('FX')}. Tournez l’aperçu avec le bouton gauche de la souris et double-cliquez sur la peau. Ouvrez ${b('Glace')} et cliquez sur ${b('Givre')}. Tournez la molette au-dessus de ${b('Variation')} pour choisir une version, ici ${b('Acier givré')}. ${b('Appliquer l’effet')} l’ajoute au modèle.`],
      ['2. Cristaux sur le pus', `Rouvrez ${b('FX')} ; la peau garde son effet. Tournez vers le dos et double-cliquez sur le pus. Cliquez sur ${b('Glace')} &gt; ${b('Cristal')} et choisissez ${b('Croissance de cristaux')} dans ${b('Variation')}. La couche ${b('Cristaux')} sélectionnée, faites glisser ${b('Taille')}, ${b('Longueur')}, ${b('Nombre')} et ${b('Lueur')}. ${b('Appliquer l’effet')}.`],
      ['3. Glace sur les cornes', `Double-cliquez sur une corne et choisissez ${b('Glace')} &gt; ${b('Givre')}, ${b('Variation')} ${b('Glace sombre')}. Décochez ${b('Brume tombante')} pour désactiver cette couche. Cliquez sur ${b('Ajouter une couche')}, tapez ${b('Facettes de glace')} et cliquez sur la ligne. ${b('Appliquer l’effet')}.`],
      ['4. Pointes sur l’arme', `Double-cliquez sur la lame et cliquez sur ${b('Cadrer la sélection')} pour la cadrer. Choisissez ${b('Glace')} &gt; ${b('Givre')}, ${b('Variation')} ${b('Pointes de glace')}. Cliquez sur la couche ${b('Pointes de glace')} et faites glisser ${b('Taille')}, ${b('Nombre')} et ${b('Longueur')}. ${b('Appliquer l’effet')}.`],
      ['5. Balayage de givre sur le coup', `Dans ${b('Sommets')}, cliquez sur ${b('Rien')} sous ${b('Géosets')}, cochez le géoset de la lame et appuyez sur ${k('Ctrl')} + ${k('A')}. Ouvrez l’${b('Éditeur d’émetteur')} et cliquez sur ${b('Ajouter un ruban')}. Choisissez ${b('Givre')} dans ${b('Balayage')}, cochez les animations d’attaque sous ${b('Visibilité')} et cliquez sur ${b('Créer')}.`],
      ['6. Vérifier le résultat', `Ouvrez ${b('Showcase')}. Cliquez sur l’animation de la liste, choisissez ${b('Attack - 1')}, cliquez sur ${b('OK')}, puis sur ${b('Aperçu de l’animation')}. Zoomez avec la molette et tournez la caméra avec le bouton gauche.`],
    ],
  },
  de: {
    title: 'FX: einen Effekt erstellen', steps: '6 Schritte',
    description: 'Jedem Teil eines Modells einen eigenen Effekt geben, der Waffe einen Schwung hinzufügen und das Ergebnis prüfen.',
    intro: 'FX gibt einem Teil des Modells einen dauerhaften Effekt, der in jeder Animation läuft. Diese Anleitung überzieht den Großen Verpesteten Teil für Teil mit Eis; jeder Schritt setzt den vorigen fort.',
    list: [
      ['1. Eis auf der Haut', `${b('FX')} öffnen. Die Vorschau mit der linken Maustaste drehen und die Haut doppelt anklicken. ${b('Eis')} öffnen und ${b('Frost')} anklicken. Das Mausrad über ${b('Variation')} drehen, um eine Version zu wählen, hier ${b('Bereifter Stahl')}. ${b('Effekt anwenden')} fügt ihn dem Modell hinzu.`],
      ['2. Kristalle auf dem Eiter', `${b('FX')} erneut öffnen; die Haut behält ihren Effekt. Zum Rücken drehen und den Eiter doppelt anklicken. ${b('Eis')} &gt; ${b('Kristall')} anklicken und unter ${b('Variation')} ${b('Kristallwuchs')} wählen. Mit der Ebene ${b('Kristalle')} ${b('Größe')}, ${b('Länge')}, ${b('Anzahl')} und ${b('Leuchten')} ziehen. ${b('Effekt anwenden')}.`],
      ['3. Eis auf den Hörnern', `Ein Horn doppelt anklicken und ${b('Eis')} &gt; ${b('Frost')}, ${b('Variation')} ${b('Dunkles Eis')} wählen. Das Kästchen von ${b('Fallender Nebel')} leeren, um diese Ebene auszuschalten. ${b('Ebene hinzufügen')} anklicken, ${b('Eisfacetten')} eingeben und die Zeile anklicken. ${b('Effekt anwenden')}.`],
      ['4. Stacheln auf der Waffe', `Die Klinge doppelt anklicken und ${b('Auswahl einpassen')} anklicken, um sie heranzuholen. ${b('Eis')} &gt; ${b('Frost')}, ${b('Variation')} ${b('Eisstacheln')} wählen. Die Ebene ${b('Eisstacheln')} anklicken und ${b('Größe')}, ${b('Anzahl')} und ${b('Länge')} ziehen. ${b('Effekt anwenden')}.`],
      ['5. Frostschwung beim Schlag', `In ${b('Scheitelpunkte')} unter ${b('Geosets')} ${b('Keine')} anklicken, das Geoset der Klinge ankreuzen und ${k('Strg')} + ${k('A')} drücken. Den ${b('Emittereditor')} öffnen und ${b('Band hinzufügen')} anklicken. Unter ${b('Schwung')} ${b('Frost')} wählen, unter ${b('Sichtbarkeit')} die Angriffsanimationen ankreuzen und ${b('Erstellen')} anklicken.`],
      ['6. Ergebnis prüfen', `${b('Showcase')} öffnen. Die Animation in der Liste anklicken, ${b('Attack - 1')} wählen, ${b('OK')} und dann ${b('Animationsvorschau')} anklicken. Mit dem Mausrad zoomen und die Kamera mit der linken Maustaste drehen.`],
    ],
  },
};
// The Mordor page keeps its own words; it gets six steps in the same style.
const MORDOR = {
  title: 'FX: ash', steps: '6 atulûk', description: 'ash a atulûk uruk durb atulûk, nazgûl ghâsh snaga, uruk nazg nazg, nazg durb uruk krimp ash.',
  intro: 'ash a atulûk uruk durb atulûk, nazgûl ghâsh snaga, uruk nazg nazg, nazg durb uruk krimp ash.',
  list: [
    ['1. krimp a atulûk krimp', `agh ${b('burzum')}. krimp nazg ghâsh nazg, nazg krimp ghâsh krimp agh nazg nazgûl. ${b('gimb nazg')} snaga uruk.`],
    ['2. nazgûl nazg uruk', `nazg ${b('nazgûl snaga')} uruk nazgûl atulûk. durb a ishi nazg uruk agh ${b('nazgûl')} krimp nazg gimb snaga.`],
    ['3. gimb nazg ash', `nazg nazg snaga uruk ${b('gimb')} nazg ishi. burzum ash krimp uruk ghâsh uruk uruk nazg krimp.`],
    ['4. durb uruk', `krimp uruk, ${b('lugbúrz')} snaga nazg nazg ghâsh uruk durb nazg krimp ash nazg atulûk burzum.`],
    ['5. ghâsh snaga krimp', `${b('uruk')} ghâsh nazg atulûk, krimp ${b('ishi')} snaga durb. ${k('Ctrl')} + ${k('A')} agh nazgûl gimb.`],
    ['6. burzum ash', `agh ${b('lugbúrz')}. nazgûl krimp uruk durb ash, snaga ghâsh nazg burzum atulûk.`],
  ],
};
const steps = (t, page, index, langAttr = '') => t.list.map(([title, text], i) => {
  const clip = CLIPS[i], url = index[clip]?.url;
  if (!url) throw Error('No encoded clip ' + page + '/' + clip);
  return `<section class="demo-step"><h4>${title}</h4><figure class="gif-player" data-animation="${clip}"><video class="player-frame" width="${W}" height="${H}" aria-label="${attr(title + '. ' + plain(text))}" data-tutorial-video="${url}" muted loop playsinline controls preload="metadata"></video></figure><p>${text}</p></section>`;
}).join('');

// The Mordor page plays the English clips and card from its own folder.
{
  const en = JSON.parse(fs.readFileSync(SITE + '/animation-index.json', 'utf8')), file = SITE + '/mordor/animation-index.json', mordor = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const clip of CLIPS) {
    fs.copyFileSync(SITE + '/' + clip + '.mp4', SITE + '/mordor/' + clip + '.mp4');
    mordor[clip] = { ...en[clip], url: en[clip].url.replace('/mdlxl/tutorials/', '/mdlxl/tutorials/mordor/') };
  }
  fs.copyFileSync(SITE + '/fx-card.png', SITE + '/mordor/fx-card.png');
  fs.writeFileSync(file, JSON.stringify(mordor) + '\n');
}
for (const page of [...LANGS, 'mordor']) {
  const t = page === 'mordor' ? MORDOR : TEXT[page];
  const indexFile = folder(page) + 'animation-index.json', index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  for (const old of OLD) { delete index[old]; fs.rmSync(folder(page) + old + '.mp4', { force: true }); }
  fs.writeFileSync(indexFile, JSON.stringify(index) + '\n');
  const file = folder(page) + 'content.html';
  let html = fs.readFileSync(file, 'utf8');
  // Card: picture, title, description and step count.
  const cardFile = folder(page) + 'fx-card.png', src = '/mdlxl/tutorials/' + (page === 'en' ? '' : page + '/') + 'fx-card.png?v=' + hash(cardFile);
  const card = /(<a class="tutorial-card" id="tab-fx"[^>]*><span class="tutorial-card-media" aria-hidden="true">)<img [^>]*>(<\/span><span class="tutorial-card-copy"><span class="tutorial-card-category">FX<\/span>)<span class="tutorial-card-title">[^<]*<\/span><span class="tutorial-card-description">[^<]*<\/span><span class="tutorial-card-footer"><span>[^<]*<\/span>/;
  if (!card.test(html)) throw Error('No FX card in ' + page);
  html = html.replace(card, `$1<img src="${src}" width="${W}" height="${H}" alt="">$2<span class="tutorial-card-title">${t.title}</span><span class="tutorial-card-description">${t.description}</span><span class="tutorial-card-footer"><span>${t.steps}</span>`);
  // Article: title, intro and the steps up to the reference section.
  const article = /(<article class="tutorial-panel" role="region" id="tutorial-fx"[^>]*><p class="sample-note">[^<]*<\/p>)<h3>[\s\S]*?(<section class="demo-step reference fx-advanced">)/;
  if (!article.test(html)) throw Error('No FX article in ' + page);
  html = html.replace(article, (_, head, reference) => `${head}<h3>${t.title}</h3><p>${t.intro}</p>${steps(t, page, index)}${reference}`);
  for (const old of OLD) if (html.includes('data-animation="' + old + '"')) throw Error('Old clip left in ' + page + ': ' + old);
  fs.writeFileSync(file, html);
  console.log('FX tutorial written in ' + page);
}
