import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/website-preview-adapter.js',import.meta.url),'utf8').replace(/^(?:import|export \{).*?;\r?\n/gm,'').replaceAll('export function','function');
const initializeWarcraftRenderer=vm.runInNewContext(source+'\ninitializeWarcraftRenderer');
function rendererAt(limit,{isHD=false,fail=false}={}){
 const gl={MAX_VERTEX_UNIFORM_VECTORS:0x8DFB,getParameter:()=>limit};
 const renderer={isHD,softwareSkinning:false,initShaders(){if(fail)throw Error('compile failed');this.selectedSoftware=this.softwareSkinning;},initGL(){this.softwareSkinning=limit<1024;this.initShaders();this.buffersSoftware=this.softwareSkinning;}};
 return{gl,renderer};
}
test('the 1024-vector Samsung boundary selects the working CPU shader and buffers',()=>{
 const {gl,renderer}=rendererAt(1024);const original=renderer.initShaders;initializeWarcraftRenderer(renderer,gl);assert.equal(renderer.selectedSoftware,true);assert.equal(renderer.buffersSoftware,true);assert.equal(renderer.initShaders,original);
});
test('desktop GPUs with room for the lighting uniform keep hardware skinning',()=>{
 for(const limit of [1025,4096]){const {gl,renderer}=rendererAt(limit);initializeWarcraftRenderer(renderer,gl);assert.equal(renderer.selectedSoftware,false);assert.equal(renderer.buffersSoftware,false);}
});
test('existing low-limit CPU selection and HD selection remain native',()=>{
 const low=rendererAt(256);initializeWarcraftRenderer(low.renderer,low.gl);assert.equal(low.renderer.selectedSoftware,true);
 const hd=rendererAt(1024,{isHD:true});initializeWarcraftRenderer(hd.renderer,hd.gl);assert.equal(hd.renderer.selectedSoftware,false);
});
test('initialization errors propagate and the native shader method is restored',()=>{
 const {gl,renderer}=rendererAt(1024,{fail:true}),original=renderer.initShaders;assert.throws(()=>initializeWarcraftRenderer(renderer,gl),/compile failed/);assert.equal(renderer.initShaders,original);
});
