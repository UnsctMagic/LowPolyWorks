import {installWarcraftPreviewAdapter as installBasePreviewAdapter} from './vendor/mdlxl/app/warcraft-preview-adapter.js';
export {previewGeosetTint} from './vendor/mdlxl/app/warcraft-preview-adapter.js';

// The native renderer selects CPU skinning on GPUs with fewer vertex uniforms.
// Its SD vertex shader must supply the same portrait-lighting varying that the
// shared preview adapter adds to the fragment shader on both rendering paths.
export function patchSoftwareSkinningPortraitLight(source) {
 if (!source.includes('vNormal = aNormal;') || source.includes('aGroup') || source.includes('aSkin') || source.includes('vMdlxlPortraitLight')) return source;
 return source.replace(/void main\s*\(/, 'uniform vec3 uMdlxlLightDirection;\nvarying float vMdlxlPortraitLight;\nvoid main(')
  .replace('vNormal = aNormal;', 'vNormal = aNormal;\n    vMdlxlPortraitLight = clamp(.3 + max(0., dot(normalize(vNormal), normalize(uMdlxlLightDirection))), 0., 1.);');
}

export function installWarcraftPreviewAdapter(gl, model, getClock) {
 const adapter = installBasePreviewAdapter(gl, model, getClock);
 const shaderSource = gl.shaderSource;
 gl.shaderSource = function(shader, source) {
  return shaderSource.call(this, shader, patchSoftwareSkinningPortraitLight(source));
 };
 // The shared adapter restores the original shaderSource after native initGL.
 return adapter;
}

// Native SD hardware skinning reserves 254 bone matrices and two view matrices.
// Portrait lighting adds one more vertex uniform vector to that shader.
const hardwareSkinningVectors = 4 * (254 + 2) + 1;
export function initializeWarcraftRenderer(renderer, gl) {
 const initShaders = renderer.initShaders;
 renderer.initShaders = function(...args) {
  if (!this.isHD && gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) < hardwareSkinningVectors) this.softwareSkinning = true;
  return initShaders.apply(this, args);
 };
 try { renderer.initGL(gl); }
 finally { renderer.initShaders = initShaders; }
}
