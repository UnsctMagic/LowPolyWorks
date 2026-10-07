import {TEAM_COLORS} from './vendor/mdlxl/src/team-colors.js';
import {improveNativeTexture,nativeTeamColor} from './vendor/mdlxl/app/viewport-quality.js';

const pixels=new Map();
async function texturePixels(path){
 if(!pixels.has(path))pixels.set(path,(async()=>{
  const response=await fetch(path);if(!response.ok)throw Error('Team texture unavailable: '+path);
  const bitmap=await createImageBitmap(await response.blob(),{colorSpaceConversion:'none',premultiplyAlpha:'none'});
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();
  return context.getImageData(0,0,canvas.width,canvas.height);
 })());
 return pixels.get(path);
}

/** Bind Warcraft's native replacement textures on this private parsed model. */
export function installWarcraftTeamTextures(gl,model,{transparent,graphics}){
 const replacements=new Map(model.Textures.flatMap(texture=>[1,2].includes(texture.ReplaceableId)?[[texture,texture.ReplaceableId]]:[]));
 // Resolve these as real images, bypassing the renderer's procedural replacements.
 for(const texture of replacements.keys())texture.ReplaceableId=0;
 const shaderSource=gl.shaderSource;
 if(transparent)gl.shaderSource=function(shader,source){
  if(source.includes('uniform mat3 uTVertexAnim;')&&source.includes('uniform float uWireframe;')){
   const output=source.includes('out vec4 FragColor;')?'FragColor':'gl_FragColor';
   source=source.replace('uniform float uWireframe;','uniform float uWireframe;\nuniform float uWarcraftAdditive;')
    .replace(/}\s*$/,`if(uWarcraftAdditive>2.5){\n if(uWarcraftAdditive>3.5)${output}.rgb*=${output}.a;\n ${output}.a=clamp(max(${output}.r,max(${output}.g,${output}.b)),0.,1.);\n}\n}\n`);
  }
  return shaderSource.call(this,shader,source);
 };
 let colourRevision=0;
 return {
  textures:new Set(replacements.keys()),
  ready(native){
   gl.shaderSource=shaderSource;
   if(!transparent)return;
   const location=gl.getUniformLocation(native.shaderProgram,'uWarcraftAdditive'),setLayerProps=native.setLayerProps;
   native.setLayerProps=function(layer,textureID){
    const result=setLayerProps.call(this,layer,textureID),additive=layer.FilterMode===3||layer.FilterMode===4;
    gl.uniform1f(location,additive?layer.FilterMode:0);
    // Native glow RGB is additive; its brightness supplies transparent PNG coverage.
    if(additive)gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    return result;
   };
  },
  async colour(native,hex){
   const colour=TEAM_COLORS.find(colour=>colour.rgbHex.toLowerCase()===hex.toLowerCase());
   if(!colour)throw Error('Unknown Warcraft player colour: '+hex);
   const revision=++colourRevision,index=String(colour.index??24).padStart(2,'0');
   const loaded=await Promise.all([...new Set(replacements.values())].map(async kind=>{
    const path=`textures/team/team${kind===1?'color':'glow'}${index}.png`;
    return {kind,path,pixels:await texturePixels(path)};
   }));
   if(revision!==colourRevision)return;
   for(const {kind,path,pixels} of loaded){
    for(const [texture,replacement] of replacements)if(replacement===kind)texture.Image=path;
    if(!native.rendererData.textures[path]){native.setTextureImageData(path,[pixels]);improveNativeTexture(gl,native,path,graphics);}
   }
   native.setTeamColor(nativeTeamColor(hex));
  }
 };
}
