export const mdlxlSections=['updates','about','preview','tutorials','credits'];
export const tutorialSlugs={anchor:'anchor',align:'align',live:'live-select',corpse:'auto-corpse',glow:'glow-up'};
export function readMdlxlRoute(address=globalThis.location){
 const hash=address?.hash||'',legacy=hash.match(/^#project\/mdlxl(?:\/([^/]+))?(?:\/([^/]+))?\/?$/);
 if(legacy){const section=mdlxlSections.includes(legacy[1])?legacy[1]:'updates';return{section,tutorial:section==='tutorials'&&Object.hasOwn(tutorialSlugs,legacy[2])?legacy[2]:undefined};}
 if(hash)return null;
 const path=(address?.pathname||'/').match(/^\/mdlxl(?:\/([^/]+))?(?:\/([^/]+))?\/?$/);if(!path)return null;
 const section=path[1]||'updates';if(!mdlxlSections.includes(section))return null;
 const tutorial=path[2]?Object.keys(tutorialSlugs).find(id=>tutorialSlugs[id]===path[2]):undefined;
 if(path[2]&&(section!=='tutorials'||!tutorial))return null;
 return{section,tutorial};
}
export function mdlxlHref(section='updates',tutorial,search=''){
 const path='/mdlxl/'+(section==='updates'?'':section+'/')+(section==='tutorials'&&tutorialSlugs[tutorial]?tutorialSlugs[tutorial]+'/':'');
 const query=new URLSearchParams(search).toString();return path+(query?'?'+query:'');
}
