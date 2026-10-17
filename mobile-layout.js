// Phone disclosures share the existing navigation and viewer controls.
const phoneLayout=matchMedia('(max-width:900px)');
export function prepareMobileLayout(root=document){
 for(const disclosure of root.querySelectorAll('.mobile-disclosure'))disclosure.open=!phoneLayout.matches;
}
phoneLayout.addEventListener('change',()=>prepareMobileLayout());
// A phone menu closes after selection, including a link to the current page.
document.querySelector('.masthead nav').addEventListener('click',event=>{
 if(phoneLayout.matches&&event.target.closest('a'))document.querySelector('.project-menu').open=false;
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&phoneLayout.matches){
  const menu=document.querySelector('.project-menu');
  if(menu.open){menu.open=false;menu.querySelector('summary').focus();}
 }
});
prepareMobileLayout();
