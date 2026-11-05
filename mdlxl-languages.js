export const mdlxlLanguages=Object.freeze({en:'English',ru:'Русский',es:'Español',zh:'简体中文',fr:'Français',de:'Deutsch'});
const text={
  "fr": {
    "Patch updates": "Mises à jour",
    "About MDLxL": "À propos de MDLxL",
    "Preview": "Aperçu",
    "Tutorials": "Tutoriels",
    "Credits": "Crédits",
    "Language": "Langue",
    "THE WARCRAFT III MODEL WORKSHOP": "L’ATELIER DE MODÈLES WARCRAFT III",
    "You wanted more CTRL Z?": "Vous vouliez plus de CTRL Z ?",
    "Built for Warcraft III SD models.": "Conçu pour les modèles SD de Warcraft III.",
    "Loading download…": "Chargement du téléchargement…",
    "Windows · Portable ZIP": "Windows · ZIP portable",
    "FFmpeg corresponding source ↗": "Code source correspondant de FFmpeg ↗",
    "THE WORKSHOP": "L’ATELIER",
    "MDLxL sections": "Rubriques MDLxL",
    "MDLxL source code ↗": "Code source de MDLxL ↗",
    "Loading…": "Chargement…",
    "Download": "Télécharger",
    "Download unavailable": "Téléchargement indisponible",
    "Please try again later.": "Réessayez plus tard.",
    "Tutorials could not load. Please reload the page.": "Impossible de charger les tutoriels. Rechargez la page.",
    "This section could not load. Please reload the page.": "Impossible de charger cette rubrique. Rechargez la page.",
    "Screenshots are coming soon.": "Les captures d’écran arrivent bientôt.",
    "Credits &amp; acknowledgements": "Crédits et remerciements",
    "Credits & acknowledgements": "Crédits et remerciements",
    "A dream for more CTRL+Z.": "Le rêve de plus de CTRL+Z.",
    "A dog in a space station with the caption: I have no idea what I'm doing.": "Un chien dans une station spatiale avec la légende : Je n’ai aucune idée de ce que je fais.",
    "Inside the workshop": "Dans l’atelier",
    "Find us on Discord at HerrDave&#39;s Workshop": "Retrouvez-nous sur Discord chez HerrDave&#39;s Workshop",
    "Loading patch notes…": "Chargement des notes de version…",
    "LATEST RELEASE": "DERNIÈRE VERSION",
    "Update post language": "Langue des notes de version",
    "Patch notes could not load. Please try again.": "Impossible de charger les notes de version. Réessayez.",
    "Updates could not load right now. Please try again later.": "Impossible de charger les mises à jour pour le moment. Réessayez plus tard.",
    "MDLxL helmet: half wireframe, half textured": "Casque MDLxL : moitié filaire, moitié texturé"
  },
  "de": {
    "Patch updates": "Updates",
    "About MDLxL": "Über MDLxL",
    "Preview": "Vorschau",
    "Tutorials": "Tutorials",
    "Credits": "Mitwirkende",
    "Language": "Sprache",
    "THE WARCRAFT III MODEL WORKSHOP": "DIE WARCRAFT-III-MODELLWERKSTATT",
    "You wanted more CTRL Z?": "Ihr wolltet mehr CTRL Z?",
    "Built for Warcraft III SD models.": "Für Warcraft-III-SD-Modelle entwickelt.",
    "Loading download…": "Download wird geladen…",
    "Windows · Portable ZIP": "Windows · Portable ZIP",
    "FFmpeg corresponding source ↗": "Zugehöriger FFmpeg-Quellcode ↗",
    "THE WORKSHOP": "DIE WERKSTATT",
    "MDLxL sections": "MDLxL-Bereiche",
    "MDLxL source code ↗": "MDLxL-Quellcode ↗",
    "Loading…": "Wird geladen…",
    "Download": "Herunterladen",
    "Download unavailable": "Download nicht verfügbar",
    "Please try again later.": "Bitte später erneut versuchen.",
    "Tutorials could not load. Please reload the page.": "Tutorials konnten nicht geladen werden. Bitte laden Sie die Seite neu.",
    "This section could not load. Please reload the page.": "Dieser Bereich konnte nicht geladen werden. Bitte laden Sie die Seite neu.",
    "Screenshots are coming soon.": "Screenshots folgen in Kürze.",
    "Credits &amp; acknowledgements": "Mitwirkende und Danksagungen",
    "Credits & acknowledgements": "Mitwirkende und Danksagungen",
    "A dream for more CTRL+Z.": "Ein Traum von mehr CTRL+Z.",
    "A dog in a space station with the caption: I have no idea what I'm doing.": "Ein Hund in einer Raumstation mit der Bildunterschrift: Ich habe keine Ahnung, was ich tue.",
    "Inside the workshop": "In der Werkstatt",
    "Find us on Discord at HerrDave&#39;s Workshop": "Besucht uns auf Discord bei HerrDave&#39;s Workshop",
    "Loading patch notes…": "Versionshinweise werden geladen…",
    "LATEST RELEASE": "NEUESTE VERSION",
    "Update post language": "Sprache der Versionshinweise",
    "Patch notes could not load. Please try again.": "Versionshinweise konnten nicht geladen werden. Bitte erneut versuchen.",
    "Updates could not load right now. Please try again later.": "Updates konnten gerade nicht geladen werden. Bitte später erneut versuchen.",
    "MDLxL helmet: half wireframe, half textured": "MDLxL-Helm: halb Drahtgitter, halb texturiert"
  }
};
export const mdlxlLanguage=search=>{const value=new URLSearchParams(search).get('lang');return Object.hasOwn(mdlxlLanguages,value)?value:'en';};
export const mdlxlText=(value,language)=>text[language]?.[value]??value;
export function localizedMdlxlMarkup(markup,language){
 const t=value=>mdlxlText(value,language);
 return markup.replace(/>([^<>]*)</g,(_,value)=>'>'+value.replace(value.trim(),t(value.trim()))+'<').replace(/(aria-label|alt|title)="([^"]+)"/g,(_,attr,value)=>attr+'="'+t(value).replace(/&(?!(?:amp|lt|gt|quot|#39);)/g,'&amp;').replace(/"/g,'&quot;')+'"');
}

const shellSources=new WeakMap(),shellAttributes=new WeakMap();
const plainText=value=>value.replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&quot;/g,'"');
const sourceLabels=new Map(Object.values(text).flatMap(pack=>Object.entries(pack).flatMap(([source,value])=>[[plainText(source),source],[plainText(value),source]])));
const originalLabel=value=>sourceLabels.get(value)||value;
// Update the existing shell so tutorial controls, focus and playback keep their nodes.
export function applyMdlxlShellLanguage(root,language){
 if(!root)return;
 root._mdlxlLanguage=language;root.lang=language;
 if(!root.querySelectorAll)return;
 const t=value=>plainText(mdlxlText(originalLabel(value),language));
 for(const region of root.querySelectorAll('.mdlxl-hero,.mdlxl-menu,.mdlxl-section-heading,.mdlxl-release summary,.mdlxl-note-languages')){
  const walk=document.createTreeWalker(region,NodeFilter.SHOW_TEXT);
  while(walk.nextNode()){
   const node=walk.currentNode;if(node.parentElement.closest('#mdlxl-download'))continue;
   if(!shellSources.has(node))shellSources.set(node,node.textContent.replace(node.textContent.trim(),originalLabel(node.textContent.trim())));
   const source=shellSources.get(node);node.textContent=source.replace(source.trim(),t(source.trim()));
  }
  for(const element of region.querySelectorAll('[aria-label],[title],[alt]')){
   if(!shellAttributes.has(element))shellAttributes.set(element,Object.fromEntries(['aria-label','title','alt'].filter(name=>element.hasAttribute(name)).map(name=>[name,element.getAttribute(name)])));
   for(const [name,source]of Object.entries(shellAttributes.get(element)))element.setAttribute(name,t(source));
  }
 }
 for(const link of root.querySelectorAll('.mdlxl-menu nav a')){const url=new URL(link.href);url.searchParams.set('lang',language);link.href=url.href;}
 const picker=root.querySelector('.mdlxl-language select');if(picker)picker.value=Object.hasOwn(mdlxlLanguages,language)?language:'en';
 const button=root.querySelector('#mdlxl-download');
 if(button&&!root._mdlxlDownloadVersion&&!root._mdlxlDownloadError)button.textContent=t('Download')+' ↗';
 for(const time of root.querySelectorAll('.mdlxl-release time'))time.textContent=new Date(time.dateTime).toLocaleDateString(Object.hasOwn(mdlxlLanguages,language)?language:'en',{year:'numeric',month:'short',day:'numeric'});
 if(button&&root._mdlxlDownloadVersion)button.textContent=t('Download')+' '+root._mdlxlDownloadVersion+' ↗';
 if(root._mdlxlDownloadError){if(button)button.textContent=t('Download unavailable');const status=root.querySelector('#mdlxl-version');if(status)status.textContent=t('Please try again later.');}
}
