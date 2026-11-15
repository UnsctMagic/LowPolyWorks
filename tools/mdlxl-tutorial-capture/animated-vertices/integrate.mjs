// Adds the Animated, Each Piece and Call Upon Forge tutorial cards and articles to every tutorial language page
// (EN/ES/RU/ZH/FR/DE, plus the Mordor page, which shows the English guides and clips like Spread pieces).
// Media URLs and hashes come from the animation-index records written by encode.mjs. Running it again replaces
// the earlier cards and articles, and removes the old combined "animated" guide's Forge clip (animated-forge).
import fs from 'node:fs'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
const SITE = process.env.LPW_SITE || 'D:/Claude/LowPolyWorks-animated-tutorial/dist/mdlxl/tutorials';
const WORK = process.env.LPW_WORK || 'D:/Claude/animtut-work';
const FFMPEG = 'D:/Claude/MDLxL/electron/ffmpeg/ffmpeg.exe';
const LANGS = ['en', 'es', 'ru', 'zh', 'fr', 'de'], PAGES = [...LANGS, 'mordor'];
const folder = page => SITE + '/' + (page === 'en' ? '' : page + '/');
const k = key => key.split(' + ').map(part => `<kbd>${part}</kbd>`).join(' + ');
const s = label => `<strong>${label}</strong>`;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const TUTORIALS = [
  { key: 'animated', slug: 'animated', card: 'animated-card.png', clips: ['animated-pose', 'animated-edit'] },
  { key: 'eachpiece', slug: 'each-piece', card: 'each-piece-card.png', clips: ['animated-each-piece'] },
  { key: 'forge', slug: 'call-upon-forge', card: 'forge-card.png', clips: ['forge-open', 'forge-isolate', 'forge-bevel', 'forge-bend', 'forge-check'] },
];
// Control names are the app's own labels from src/locales/<language>.json.
const TEXT = {
  en: {
    open: 'Open tutorial',
    animated: { category: 'Vertex editor', title: 'Animated', steps: '2 steps', description: 'Edit vertices on an animation frame.',
      intro: `${s('Animated')} shows the model in a frame of one of its animations while you edit. Your edits change the base pose, so every animation uses them.`,
      list: [['1. Choose an animation and a frame', `Click the arrow beside ${s('Animated')} and choose an animation. ${s('Animated')} turns on at its first frame. Right-click ${s('Animated')}, type a ${s('Frame')} number and press ${k('Enter')}. ${k('Shift + Space')} switches between the frame and the base pose.`],
        ['2. Edit on the posed model', `Select and move vertices where you see them in the frame: ${k('A')} and drag a box, then ${k('M')} and drag. Press ${k('Shift + Space')} to see the same edit in the base pose.`]] },
    eachpiece: { category: 'Workplane Constraints', title: 'Each Piece', steps: '1 step', description: 'Rotate every separate piece on its own spot.',
      intro: `${s('Each Piece')} is beside ${s('Workplane Constraints')} in the Vertex editor. Forge has the same checkbox.`,
      list: [['Rotate with and without Each Piece', `Off: ${s('Rotate')} (${k('R')}) turns the whole selection as one group. On: each separate piece turns on its own spot. The clip rotates the whole Footman (${k('Ctrl + A')}), undoes it with ${k('Ctrl + Z')}, then rotates again with ${s('Each Piece')} on.`]] },
    forge: { category: 'Forge', title: 'Call Upon Forge', steps: '5 steps', description: 'Forge tools in the Vertex editor: bevel and bend the Footman’s shield.',
      intro: `${s('Call Upon Forge')} adds the Forge tools to the Vertex editor. Here they bevel the Footman’s shield and bend it into a curved shield.`,
      list: [['1. Call Upon Forge', `Right-click the ${s('Forge')} icon and choose ${s('Call Upon Forge')}. The Forge tools open on the left of the Vertex editor. Selection, camera, Undo and the other Vertex tools keep working.`],
        ['2. Isolate the shield', `The red team-colour layer is its own geoset: tick ${s('2')} under ${s('Geosets')}. Press ${k('A')}, click one shield vertex, then ${k('Shift + LMB')} the others. Click ${s('Detach as new geoset')}, then ${s('Clear')}, tick the two new geosets and turn off ${s('Show all')}: only the shield is shown.`],
        ['3. Bevel', `Choose ${s('Left')} and ${s('Wireframe')} in the view menus. Untick the red layer and press ${k('Ctrl + A')} to select the shield. Click ${s('Bevel')} and drag its gold handle: the new rim edges appear along the outline. Click ${s('✓')} to keep it.`],
        ['4. Bend', `Choose ${s('Perspective')} and ${s('Textured View')}, tick the red layer again and press ${k('Ctrl + A')}. Click ${s('Bend')}, choose ${s('Across')} and ${s('Turn bend')} so it bends in depth, then drag the handle: the sides curve toward the body. Click ${s('✓')}. Turn ${s('Show all')} back on and click ${s('Fit')} to see the whole Footman.`],
        ['5. Check', `Turn the view with ${k('Alt + LMB')}. ${k('Ctrl + Z')} and ${k('Ctrl + Y')} undo and redo the bend.`]] },
  },
  es: {
    open: 'Abrir tutorial',
    animated: { category: 'Editor de vértices', title: 'Animado', steps: '2 pasos', description: 'Edita vértices sobre un fotograma de animación.',
      intro: `${s('Animado')} muestra el modelo en un fotograma de una de sus animaciones mientras editas. Tus cambios modifican la pose base, así que todas las animaciones los usan.`,
      list: [['1. Elige una animación y un fotograma', `Haz clic en la flecha junto a ${s('Animado')} y elige una animación. ${s('Animado')} se activa en su primer fotograma. Haz clic derecho en ${s('Animado')}, escribe un número de ${s('Fotograma')} y pulsa ${k('Enter')}. ${k('Shift + Space')} alterna entre el fotograma y la pose base.`],
        ['2. Edita sobre el modelo en pose', `Selecciona y mueve vértices donde los ves en el fotograma: ${k('A')} y arrastra un recuadro; luego ${k('M')} y arrastra. Pulsa ${k('Shift + Space')} para ver el mismo cambio en la pose base.`]] },
    eachpiece: { category: 'Restricciones del plano', title: 'Cada pieza', steps: '1 paso', description: 'Gira cada pieza separada en su sitio.',
      intro: `${s('Cada pieza')} está junto a ${s('Restricciones del plano')} en el editor de vértices. Forge tiene la misma casilla.`,
      list: [['Rotar con y sin Cada pieza', `Desactivado: ${s('Rotar')} (${k('R')}) gira toda la selección como un grupo. Activado: cada pieza separada gira en su sitio. El vídeo gira todo el Footman (${k('Ctrl + A')}), lo deshace con ${k('Ctrl + Z')} y vuelve a girar con ${s('Cada pieza')} activado.`]] },
    forge: { category: 'Forja', title: 'Invocar herramientas de Forge', steps: '5 pasos', description: 'Herramientas de Forge en el editor de vértices: bisela y dobla el escudo del Footman.',
      intro: `${s('Invocar herramientas de Forge')} añade las herramientas de Forge al editor de vértices. Aquí biselan el escudo del Footman y lo doblan en un escudo curvo.`,
      list: [['1. Invocar herramientas de Forge', `Haz clic derecho en el icono ${s('Forja')} y elige ${s('Invocar herramientas de Forge')}. Las herramientas de Forge se abren a la izquierda del editor de vértices. La selección, la cámara, Deshacer y las demás herramientas de vértices siguen funcionando.`],
        ['2. Aísla el escudo', `La capa roja del color del equipo es un geoset aparte: marca ${s('2')} en ${s('Geosets')}. Pulsa ${k('A')}, haz clic en un vértice del escudo y ${k('Shift + LMB')} en los demás. Pulsa ${s('Separar como un nuevo geoset')}, luego ${s('Limpiar')}, marca los dos geosets nuevos y desactiva ${s('Mostrar todo')}: solo se ve el escudo.`],
        ['3. Biselar', `Elige ${s('Izquierda')} y ${s('Malla alámbrica')} en los menús de vista. Desmarca la capa roja y pulsa ${k('Ctrl + A')} para seleccionar el escudo. Pulsa ${s('Biselar')} y arrastra su tirador dorado: las nuevas aristas del canto aparecen a lo largo del contorno. Pulsa ${s('✓')} para conservarlo.`],
        ['4. Doblar', `Elige ${s('Perspectiva')} y ${s('Vista texturizada')}, vuelve a marcar la capa roja y pulsa ${k('Ctrl + A')}. Pulsa ${s('Doblar')}, elige ${s('A lo ancho')} y ${s('Girar doblado')} para que se doble en profundidad, y arrastra el tirador: los lados se curvan hacia el cuerpo. Pulsa ${s('✓')}. Vuelve a activar ${s('Mostrar todo')} y pulsa ${s('Ajustar')} para ver el Footman entero.`],
        ['5. Comprobar', `Gira la vista con ${k('Alt + LMB')}. ${k('Ctrl + Z')} y ${k('Ctrl + Y')} deshacen y rehacen el doblado.`]] },
  },
  ru: {
    open: 'Открыть урок',
    animated: { category: 'Редактор вершин', title: 'Анимация', steps: '2 шага', description: 'Редактируйте вершины на кадре анимации.',
      intro: `${s('Анимация')} показывает модель в кадре одной из её анимаций, пока вы редактируете. Правки меняют исходную позу, поэтому их используют все анимации.`,
      list: [['1. Выберите анимацию и кадр', `Нажмите стрелку рядом с ${s('Анимация')} и выберите анимацию. ${s('Анимация')} включается на её первом кадре. Щёлкните ${s('Анимация')} правой кнопкой, введите номер в поле ${s('Кадр')} и нажмите ${k('Enter')}. ${k('Shift + Space')} переключает между кадром и исходной позой.`],
        ['2. Редактируйте модель в позе', `Выделяйте и перемещайте вершины там, где они видны в кадре: ${k('A')} и рамка мышью, затем ${k('M')} и перетаскивание. Нажмите ${k('Shift + Space')}, чтобы увидеть ту же правку в исходной позе.`]] },
    eachpiece: { category: 'Ограничения плоскости', title: 'Каждый кусок', steps: '1 шаг', description: 'Поворачивайте каждый отдельный кусок на его месте.',
      intro: `${s('Каждый кусок')} находится рядом с ${s('Ограничения плоскости')} в редакторе вершин. В Forge есть такой же флажок.`,
      list: [['Поворот с «Каждый кусок» и без него', `Выкл.: ${s('Поворот')} (${k('R')}) вращает всё выделение как одну группу. Вкл.: каждый отдельный кусок вращается на своём месте. В ролике весь Footman (${k('Ctrl + A')}) поворачивается, поворот отменяется ${k('Ctrl + Z')}, затем поворот повторяется с включённым ${s('Каждый кусок')}.`]] },
    forge: { category: 'Кузница', title: 'Вызвать инструменты Forge', steps: '5 шагов', description: 'Инструменты Forge в редакторе вершин: фаска и изгиб щита Footman.',
      intro: `${s('Вызвать инструменты Forge')} добавляет инструменты Forge в редактор вершин. Здесь они снимают фаску со щита Footman и изгибают его в выгнутый щит.`,
      list: [['1. Вызвать инструменты Forge', `Щёлкните правой кнопкой значок ${s('Кузница')} и выберите ${s('Вызвать инструменты Forge')}. Инструменты Forge открываются слева от редактора вершин. Выделение, камера, отмена и другие инструменты вершин продолжают работать.`],
        ['2. Отделите щит', `Красный слой цвета команды — отдельный геосет: отметьте ${s('2')} в ${s('Геосеты')}. Нажмите ${k('A')}, щёлкните одну вершину щита, затем ${k('Shift + LMB')} остальные. Нажмите ${s('Отделить в новый геосет')}, затем ${s('Очистить')}, отметьте два новых геосета и выключите ${s('Показать все')}: виден только щит.`],
        ['3. Фаска', `Выберите ${s('Слева')} и ${s('Каркас')} в меню вида. Снимите отметку с красного слоя и нажмите ${k('Ctrl + A')}, чтобы выделить щит. Нажмите ${s('Фаска')} и потяните золотую ручку: новые рёбра обода появляются вдоль контура. Нажмите ${s('✓')}, чтобы сохранить.`],
        ['4. Изгиб', `Выберите ${s('Перспектива')} и ${s('Вид с текстурами')}, снова отметьте красный слой и нажмите ${k('Ctrl + A')}. Нажмите ${s('Изгиб')}, выберите ${s('Поперёк')} и ${s('Повернуть изгиб')}, чтобы щит гнулся в глубину, и потяните ручку: края загибаются к телу. Нажмите ${s('✓')}. Снова включите ${s('Показать все')} и нажмите ${s('Вписать')}, чтобы увидеть весь Footman.`],
        ['5. Проверка', `Поверните вид с ${k('Alt + LMB')}. ${k('Ctrl + Z')} и ${k('Ctrl + Y')} отменяют и повторяют изгиб.`]] },
  },
  zh: {
    open: '打开教程',
    animated: { category: '顶点编辑器', title: '动画预览', steps: '2 个步骤', description: '在动画帧上编辑顶点。',
      intro: `${s('动画预览')}在编辑时以模型某个动画的一帧显示模型。编辑会改变基础姿势，所有动画都会使用这些修改。`,
      list: [['1. 选择动画和帧', `点击${s('动画预览')}旁的箭头并选择动画。${s('动画预览')}会在该动画的第一帧开启。右键单击${s('动画预览')}，输入${s('帧')}编号并按 ${k('Enter')}。${k('Shift + Space')} 在该帧和基础姿势之间切换。`],
        ['2. 在摆好姿势的模型上编辑', `在帧中看到顶点的位置直接选择并移动：按 ${k('A')} 拖出选框，再按 ${k('M')} 拖动。按 ${k('Shift + Space')} 可在基础姿势中看到同样的修改。`]] },
    eachpiece: { category: '工作平面约束', title: '每一块', steps: '1 个步骤', description: '让每个单独的块在原位旋转。',
      intro: `${s('每一块')}位于顶点编辑器中${s('工作平面约束')}旁边。Forge 中也有同样的复选框。`,
      list: [['开启和关闭“每一块”时旋转', `关闭：${s('旋转')}（${k('R')}）把整个选区作为一组旋转。开启：每个单独的块在原位旋转。视频中先旋转整个 Footman（${k('Ctrl + A')}），用 ${k('Ctrl + Z')} 撤销，再在开启${s('每一块')}后旋转。`]] },
    forge: { category: '锻造', title: '调用 Forge 工具', steps: '5 个步骤', description: '在顶点编辑器中使用 Forge 工具：为 Footman 的盾牌倒角并弯曲。',
      intro: `${s('调用 Forge 工具')}会把 Forge 工具加入顶点编辑器。这里为 Footman 的盾牌倒角，并把它弯成弧形盾。`,
      list: [['1. 调用 Forge 工具', `右键单击${s('锻造')}图标并选择${s('调用 Forge 工具')}。Forge 工具会在顶点编辑器左侧打开。选择、镜头、撤销和其他顶点工具照常可用。`],
        ['2. 单独显示盾牌', `红色队伍颜色层是单独的几何集：在${s('几何集')}下勾选 ${s('2')}。按 ${k('A')}，点击一个盾牌顶点，再用 ${k('Shift + LMB')} 点击其余顶点。点击${s('分离为新多边形组')}，再点击${s('清除')}，勾选这两个新几何集并关闭${s('显示全部')}：只显示盾牌。`],
        ['3. 倒角', `在视图菜单中选择${s('左视图')}和${s('线框')}。取消勾选红色层，按 ${k('Ctrl + A')} 选中盾牌。点击${s('倒角')}并拖动金色手柄：轮廓上出现新的边。点击 ${s('✓')} 保留。`],
        ['4. 弯曲', `选择${s('透视图')}和${s('纹理视图')}，重新勾选红色层并按 ${k('Ctrl + A')}。点击${s('弯曲')}，选择${s('横向')}和${s('转动弯曲')}，使盾牌沿深度方向弯曲，然后拖动手柄：两侧向身体弯去。点击 ${s('✓')}。重新打开${s('显示全部')}并点击${s('适应')}，查看整个 Footman。`],
        ['5. 检查', `用 ${k('Alt + LMB')} 转动视图。${k('Ctrl + Z')} 和 ${k('Ctrl + Y')} 撤销和重做弯曲。`]] },
  },
  fr: {
    open: 'Ouvrir le tutoriel',
    animated: { category: 'Éditeur de sommets', title: 'Animé', steps: '2 étapes', description: 'Modifiez les sommets sur une image d’animation.',
      intro: `${s('Animé')} affiche le modèle dans une image de l’une de ses animations pendant que vous modifiez. Vos modifications changent la pose de base : toutes les animations les utilisent.`,
      list: [['1. Choisir une animation et une image', `Cliquez sur la flèche à côté de ${s('Animé')} et choisissez une animation. ${s('Animé')} s’active sur sa première image. Faites un clic droit sur ${s('Animé')}, saisissez un numéro d’${s('Image')} et appuyez sur ${k('Enter')}. ${k('Shift + Space')} bascule entre l’image et la pose de base.`],
        ['2. Modifier le modèle posé', `Sélectionnez et déplacez les sommets là où vous les voyez dans l’image : ${k('A')} et tracez un cadre, puis ${k('M')} et faites glisser. Appuyez sur ${k('Shift + Space')} pour voir la même modification dans la pose de base.`]] },
    eachpiece: { category: 'Contraintes du plan', title: 'Chaque pièce', steps: '1 étape', description: 'Faites tourner chaque pièce séparée à sa place.',
      intro: `${s('Chaque pièce')} se trouve à côté de ${s('Contraintes du plan')} dans l’éditeur de sommets. Forge a la même case.`,
      list: [['Tourner avec et sans Chaque pièce', `Désactivé : ${s('Tourner')} (${k('R')}) fait tourner toute la sélection en bloc. Activé : chaque pièce séparée tourne à sa place. La vidéo fait tourner tout le Footman (${k('Ctrl + A')}), annule avec ${k('Ctrl + Z')}, puis tourne à nouveau avec ${s('Chaque pièce')} activé.`]] },
    forge: { category: 'Forge', title: 'Appeler les outils Forge', steps: '5 étapes', description: 'Les outils Forge dans l’éditeur de sommets : biseauter et courber le bouclier du Footman.',
      intro: `${s('Appeler les outils Forge')} ajoute les outils Forge à l’éditeur de sommets. Ici, ils biseautent le bouclier du Footman et le courbent en bouclier bombé.`,
      list: [['1. Appeler les outils Forge', `Faites un clic droit sur l’icône ${s('Forge')} et choisissez ${s('Appeler les outils Forge')}. Les outils Forge s’ouvrent à gauche de l’éditeur de sommets. La sélection, la caméra, Annuler et les autres outils de sommets restent disponibles.`],
        ['2. Isoler le bouclier', `La couche rouge de la couleur d’équipe est un géoset à part : cochez ${s('2')} sous ${s('Géosets')}. Appuyez sur ${k('A')}, cliquez sur un sommet du bouclier, puis ${k('Shift + LMB')} sur les autres. Cliquez sur ${s('Détacher en nouveau géoset')}, puis sur ${s('Rien')}, cochez les deux nouveaux géosets et décochez ${s('Tout afficher')} : seul le bouclier reste visible.`],
        ['3. Biseauter', `Choisissez ${s('Gauche')} et ${s('Fil de fer')} dans les menus de vue. Décochez la couche rouge et appuyez sur ${k('Ctrl + A')} pour sélectionner le bouclier. Cliquez sur ${s('Biseauter')} et faites glisser sa poignée dorée : les nouvelles arêtes du chanfrein apparaissent le long du contour. Cliquez sur ${s('✓')} pour le garder.`],
        ['4. Courber', `Choisissez ${s('Perspective')} et ${s('Vue texturée')}, cochez de nouveau la couche rouge et appuyez sur ${k('Ctrl + A')}. Cliquez sur ${s('Courber')}, choisissez ${s('En travers')} puis ${s('Tourner la courbure')} pour courber en profondeur, et faites glisser la poignée : les côtés se recourbent vers le corps. Cliquez sur ${s('✓')}. Réactivez ${s('Tout afficher')} et cliquez sur ${s('Cadrer')} pour voir tout le Footman.`],
        ['5. Vérifier', `Tournez la vue avec ${k('Alt + LMB')}. ${k('Ctrl + Z')} et ${k('Ctrl + Y')} annulent et rétablissent la courbure.`]] },
  },
  de: {
    open: 'Tutorial öffnen',
    animated: { category: 'Vertex-Editor', title: 'Animiert', steps: '2 Schritte', description: 'Scheitelpunkte in einem Animationsbild bearbeiten.',
      intro: `${s('Animiert')} zeigt das Modell beim Bearbeiten in einem Bild einer seiner Animationen. Die Änderungen gelten für die Grundpose und damit für alle Animationen.`,
      list: [['1. Animation und Bild wählen', `Auf den Pfeil neben ${s('Animiert')} klicken und eine Animation wählen. ${s('Animiert')} schaltet sich bei ihrem ersten Bild ein. Rechtsklick auf ${s('Animiert')}, eine Nummer bei ${s('Bild')} eingeben und ${k('Enter')} drücken. ${k('Shift + Space')} wechselt zwischen dem Bild und der Grundpose.`],
        ['2. Am posierten Modell bearbeiten', `Scheitelpunkte dort auswählen und verschieben, wo sie im Bild zu sehen sind: ${k('A')} und einen Rahmen ziehen, dann ${k('M')} und ziehen. Mit ${k('Shift + Space')} dieselbe Änderung in der Grundpose ansehen.`]] },
    eachpiece: { category: 'Arbeitsebenenbindung', title: 'Jedes Teil', steps: '1 Schritt', description: 'Jedes einzelne Teil an seiner Stelle drehen.',
      intro: `${s('Jedes Teil')} steht im Vertex-Editor neben ${s('Arbeitsebenenbindung')}. Forge hat dasselbe Kontrollkästchen.`,
      list: [['Drehen mit und ohne Jedes Teil', `Aus: ${s('Drehen')} (${k('R')}) dreht die gesamte Auswahl als Gruppe. Ein: Jedes einzelne Teil dreht sich an seiner Stelle. Das Video dreht den ganzen Footman (${k('Ctrl + A')}), macht es mit ${k('Ctrl + Z')} rückgängig und dreht dann mit eingeschaltetem ${s('Jedes Teil')}.`]] },
    forge: { category: 'Forge', title: 'Forge-Werkzeuge aufrufen', steps: '5 Schritte', description: 'Forge-Werkzeuge im Vertex-Editor: den Schild des Footman abschrägen und biegen.',
      intro: `${s('Forge-Werkzeuge aufrufen')} fügt die Forge-Werkzeuge in den Vertex-Editor ein. Hier schrägen sie den Schild des Footman ab und biegen ihn zu einem gewölbten Schild.`,
      list: [['1. Forge-Werkzeuge aufrufen', `Rechtsklick auf das Symbol ${s('Forge')} und ${s('Forge-Werkzeuge aufrufen')} wählen. Die Forge-Werkzeuge öffnen sich links vom Vertex-Editor. Auswahl, Kamera, Rückgängig und die anderen Vertex-Werkzeuge funktionieren weiter.`],
        ['2. Den Schild freistellen', `Die rote Teamfarben-Schicht ist ein eigenes Geoset: unter ${s('Geosets')} ${s('2')} ankreuzen. ${k('A')} drücken, einen Scheitelpunkt des Schilds anklicken, dann die übrigen mit ${k('Shift + LMB')}. ${s('Als neues Geoset ablösen')} klicken, dann ${s('Keine')}, die zwei neuen Geosets ankreuzen und ${s('Alle anzeigen')} ausschalten: Nur der Schild ist zu sehen.`],
        ['3. Abschrägen', `In den Ansichtsmenüs ${s('Links')} und ${s('Drahtgitter')} wählen. Die rote Schicht abwählen und ${k('Ctrl + A')} drücken, um den Schild auszuwählen. ${s('Abschrägen')} klicken und den goldenen Griff ziehen: Die neuen Kanten der Schräge erscheinen entlang des Umrisses. ${s('✓')} klicken, um sie zu behalten.`],
        ['4. Biegen', `${s('Perspektive')} und ${s('Texturansicht')} wählen, die rote Schicht wieder ankreuzen und ${k('Ctrl + A')} drücken. ${s('Biegen')} klicken, ${s('Quer')} und ${s('Biegung drehen')} wählen, damit er sich in der Tiefe biegt, und den Griff ziehen: Die Seiten biegen sich zum Körper. ${s('✓')} klicken. ${s('Alle anzeigen')} wieder einschalten und ${s('Einpassen')} klicken, um den ganzen Footman zu sehen.`],
        ['5. Prüfen', `Die Ansicht mit ${k('Alt + LMB')} drehen. ${k('Ctrl + Z')} und ${k('Ctrl + Y')} machen das Biegen rückgängig und wiederholen es.`]] },
  },
};
const strip = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const escapeAttr = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

// The Each Piece card: a frame of the Each Piece clip near its end, after the rotation with Each Piece on.
function eachPieceCard(lang) {
  const mp4 = folder(lang) + 'animated-each-piece.mp4', index = JSON.parse(fs.readFileSync(folder(lang) + 'animation-index.json', 'utf8'));
  const frame = index['animated-each-piece'].durations.length - 5, tmp = WORK + '/card-' + lang + '.bmp';
  const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', mp4, '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', tmp], { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) throw Error(r.stderr);
  const p = spawnSync('python', ['-I', '-c', `from PIL import Image;Image.open(r'${tmp}').convert('RGB').save(r'${folder(lang)}each-piece-card.png',optimize=True)`], { encoding: 'utf8', windowsHide: true });
  if (p.status !== 0) throw Error(p.stderr);
  fs.unlinkSync(tmp);
}

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

for (const lang of LANGS) eachPieceCard(lang);
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
  // Clips of earlier versions (the combined guide's animated-forge, older Forge steps) are removed.
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8')), current = new Set(TUTORIALS.flatMap(t => t.clips));
  for (const clip of Object.keys(index)) if ((clip === 'animated-forge' || clip.startsWith('forge-')) && !current.has(clip)) {
    delete index[clip];
    fs.rmSync(folder(page) + clip + '.mp4', { force: true });
  }
  fs.writeFileSync(indexFile, JSON.stringify(index) + '\n');
  let html = fs.readFileSync(file, 'utf8');
  for (const key of ['animated', 'eachpiece', 'forge'])
    html = html.replace(new RegExp(`<a class="tutorial-card" id="tab-${key}"[\\s\\S]*?<\\/a>\\n`), '').replace(new RegExp(`<article class="tutorial-panel" role="region" id="tutorial-${key}"[\\s\\S]*?<\\/article>\\n`), '');
  let cards = '', articles = '';
  for (const tutorial of TUTORIALS) { const m = markup(lang, page, tutorial, index); cards += m.cardHtml; articles += m.article; }
  if (!html.includes('</nav>')) throw Error('No card list in ' + file);
  html = html.replace('</nav>', cards + '</nav>');
  html = (html.endsWith('\n') ? html : html + '\n') + articles;
  fs.writeFileSync(file, html);
  console.log('Added Animated, Each Piece and Call Upon Forge to ' + page);
}
