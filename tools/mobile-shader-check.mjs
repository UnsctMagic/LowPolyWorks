// Compile and render the real catalogue through both native skinning paths.
// SHADER_PATCH_DIR optionally tests the two unpublished website-owned modules.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const root=process.env.SHADER_QA_DIR;
if(!root)throw Error('Set SHADER_QA_DIR to a D: test output directory.');
await fs.mkdir(path.join(root,'tmp'),{recursive:true});process.env.TEMP=process.env.TMP=path.join(root,'tmp');
const origin=process.env.SHADER_QA_URL||'https://www.lowpolyworks.com';
const results=[];
for(const uniformLimit of [1024,256,null]){ const limited=uniformLimit!==null;
 const profile=await fs.mkdtemp(path.join(root,'shader-check-'));
 const context=await chromium.launchPersistentContext(profile,{executablePath:process.env.CHROME_EXECUTABLE,headless:true,viewport:limited?{width:390,height:844}:{width:1440,height:900},hasTouch:limited,isMobile:limited});
 try{
  if(process.env.SHADER_PATCH_DIR)await context.route(/\/(viewer|website-preview-adapter)\.js(?:\?|$)/,async route=>route.fulfill({contentType:'text/javascript',body:await fs.readFile(path.join(process.env.SHADER_PATCH_DIR,new URL(route.request().url()).pathname.split('/').pop()),'utf8')}));
  await context.addInitScript(({limited,uniformLimit})=>{
   const prototype=WebGL2RenderingContext.prototype,getParameter=prototype.getParameter,link=prototype.linkProgram;
   if(limited)prototype.getParameter=function(name){return name===this.MAX_VERTEX_UNIFORM_VECTORS?uniformLimit:name===this.MAX_VERTEX_UNIFORM_COMPONENTS?uniformLimit*4:getParameter.call(this,name);};
   window.shaderChecks=[];
   prototype.linkProgram=function(program){link.call(this,program);const shaders=this.getAttachedShaders(program).map(s=>this.getShaderSource(s));window.shaderChecks.push({linked:this.getProgramParameter(program,this.LINK_STATUS),log:this.getProgramInfoLog(program),software:shaders.some(s=>s.includes('vNormal = aNormal;')&&!s.includes('uNodesMatrices')),vertexVectors:shaders.filter(s=>s.includes('gl_Position')).map(s=>[...s.matchAll(/uniform\s+(float|vec[234]|mat[234])\s+\w+(?:\[(\d+)\])?;/g)].reduce((sum,m)=>sum+(m[1].startsWith('mat')?Number(m[1].slice(3)):1)*Number(m[2]||1),0)),portraitOutput:shaders.some(s=>s.includes('out float vMdlxlPortraitLight;')),geosetTint:this.getUniformLocation(program,'uMdlvisGeosetTint')!==null});};
  },{limited,uniformLimit});
  const page=context.pages()[0],errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',async d=>{errors.push(d.message());await d.dismiss();});
  const catalogue=await (await context.request.get(origin+'/catalogue.json')).json();
  const rows=uniformLimit===1024?catalogue:catalogue.filter(r=>['nurgle-champion','graveguard','empire-captain'].includes(r.id));
  for(const row of rows){
   await page.goto(origin+'/model/'+(row.slug||row.id)+'/',{waitUntil:'domcontentloaded'});
   await page.locator('#play:not([disabled])').waitFor({timeout:45000});await page.locator('#play').click();
   const programs=await page.evaluate(()=>window.shaderChecks);assert(programs.length>0);assert(programs.every(p=>p.linked),JSON.stringify({id:row.id,programs}));assert(programs[0].geosetTint);assert.equal(programs[0].software,limited);assert(programs[0].portraitOutput);if(uniformLimit)assert(programs.every(p=>p.vertexVectors.every(v=>v<=uniformLimit)),row.id+' exceeds reported vertex uniform budget');
   const rendered=await page.locator('#model-canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2'),pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let changed=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-16)+Math.abs(pixels[i+1]-24)+Math.abs(pixels[i+2]-39)>15)changed++;return{drawn:changed,total:pixels.length/4,error:gl.getError()};});
   assert(rendered.drawn>100,row.id+' must draw visible geometry');assert.equal(rendered.error,0,row.id+' WebGL error');
   results.push({id:row.id,limited,uniformLimit,programs,rendered});if(results.length%10===0)console.log('Rendered '+results.length+' model/path checks');
  }
  await page.goto(origin+'/model/nurgle-champion/');await page.locator('#play:not([disabled])').waitFor();await page.locator('#play').click();
  const pixels=()=>page.locator('#model-canvas').evaluate(c=>c.toDataURL());
  if(limited)await page.locator('.viewer-settings>summary').click();
  const before=await pixels();await page.locator('#team').selectOption('#0042ff');await page.waitForTimeout(150);assert.notEqual(await pixels(),before);
  for(const mode of ['game','portrait','none']){await page.locator('#lighting').selectOption(mode);await page.waitForTimeout(80);assert(await page.locator('#model-canvas').evaluate(c=>c.getContext('webgl2').getError()===0));}
  await page.locator('#sequence').selectOption({label:'Portrait - 1'});await page.waitForTimeout(100);assert(await page.locator('.viewport').evaluate(e=>e.classList.contains('portrait-mode')));
  await page.locator('#sequence').selectOption({label:'Stand - 1'});await page.locator('#reset').click();
  if(limited)await page.locator('.viewer-settings>summary').click();await page.locator('#model-canvas').scrollIntoViewIfNeeded();
  const box=await page.locator('#model-canvas').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  const previous=await pixels();
  if(limited){const cdp=await context.newCDPSession(page);async function gesture(start,end){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:start.map((p,id)=>({x:p[0],y:p[1],id}))});for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:end.map((p,id)=>({x:start[id][0]+(p[0]-start[id][0])*i/10,y:start[id][1]+(p[1]-start[id][1])*i/10,id}))});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(80);}
   await gesture([[x-30,y]],[[x+30,y+15]]);assert.notEqual(await pixels(),previous);const rotated=await pixels();await gesture([[x-25,y],[x+25,y]],[[x-45,y],[x+45,y]]);assert.notEqual(await pixels(),rotated);
  }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+70,y+20,{steps:10});await page.mouse.up();await page.waitForTimeout(80);assert.notEqual(await pixels(),previous);}
  await page.locator('.viewer').screenshot({path:path.join(root,limited?'mobile-'+uniformLimit+'-shader.png':'desktop-shader.png')});
  assert.deepEqual(errors,[]);console.log((limited?'Mobile '+uniformLimit:'Desktop')+' shaders and controls passed');
 }finally{await context.close();await fs.rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:500});}
}
await fs.writeFile(path.join(root,'shader-results.json'),JSON.stringify({origin,patched:!!process.env.SHADER_PATCH_DIR,results},null,2));console.log('PASS '+results.length+' rendered model/path checks');
