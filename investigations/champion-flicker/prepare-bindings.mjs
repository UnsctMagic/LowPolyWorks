import fs from 'node:fs';
const path=new URL('published-viewer.js',import.meta.url);
let source=fs.readFileSync(path,'utf8');
const boundary='\n teamTextures.ready(native);';
if(!source.includes(boundary))throw Error('Renderer boundary changed');
source=source.replace(boundary,`
 // Particle and ribbon attributes belong to their own vertex bindings.
 const effectBindings=[];
 if(row.id==='aspiring')for(const controller of [native.particlesController,native.ribbonsController]){
  const binding=gl.createVertexArray(),drawEffect=controller.render;effectBindings.push(binding);
  controller.render=function(...args){
   const previousBinding=gl.getParameter(gl.VERTEX_ARRAY_BINDING);gl.bindVertexArray(binding);
   try{return drawEffect.apply(this,args);}finally{gl.bindVertexArray(previousBinding);}
  };
 }
${boundary}`);
source=source.replace('adapter.dispose();gl.getExtension', 'adapter.dispose();for(const binding of effectBindings)gl.deleteVertexArray(binding);gl.getExtension');
fs.writeFileSync(new URL('candidate-viewer.js',import.meta.url),source);
