import fs from 'node:fs';
import {parseMDX,ModelRenderer} from '../../dist/vendor/war3-model.mjs';
import {sampleNodeMatrices,skinGeoset,allNodes} from '../../dist/vendor/mdlxl/src/animation.js';
import {advanceShowcaseModel} from '../../dist/vendor/mdlxl/app/showcase-playback.js';
import {viewerPlaybackSample} from '../../dist/viewer-effects.js';
import {Matrix4} from 'three';
const b=fs.readFileSync('dist/models/WH_WOC_Aspiring12.mdx');
const m=parseMDX(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
m.ParticleEmitters2=[];m.RibbonEmitters=[];
const r=new ModelRenderer(m);let prev=null,max=0,worst=[],previousVertices=null,jumps=[];
const nodes=allNodes(m),used=new Set(m.Geosets.flatMap(g=>g.Groups.flat()));
const start=m.Sequences[0].Interval[0],duration=m.Sequences[0].Interval[1]-start;
for(let time=0;time<duration*2;time+=1000/60){
 const sample=viewerPlaybackSample(m,0,time,0,true);prev=advanceShowcaseModel(r,m,sample,prev);
 const expected=sampleNodeMatrices(m,sample.frame,0,time),actual=new Map(r.rendererData.nodes.flatMap((n,i)=>n?[[i,new Matrix4().fromArray(n.matrix)]]:[]));
 let error=0,nodeId=null;
 for(const id of used){const a=actual.get(id)?.elements,e=expected.get(id)?.elements;if(!a||!e)continue;for(let c=0;c<16;c++){let d=Math.abs(a[c]-e[c]);if(d>error){error=d;nodeId=id;}}}
 if(error>max){max=error;worst.push({time,frame:sample.frame,error,nodeId,name:nodes.find(n=>n.ObjectId===nodeId)?.Name});}
 const vertices=m.Geosets.map(g=>skinGeoset(g,actual));let jump=0;
 if(previousVertices)for(let g=0;g<vertices.length;g++)for(let v=0;v<vertices[g].length;v+=3)jump=Math.max(jump,Math.hypot(...[0,1,2].map(c=>vertices[g][v+c]-previousVertices[g][v+c])));
 if(jump>.5)jumps.push({time,frame:sample.frame,jump});
 previousVertices=vertices;
}
const report={sequence:m.Sequences[0],usedNodes:used.size,maxMatrixError:max,worst:worst.slice(-8),jumps:jumps.sort((a,b)=>b.jump-a.jump).slice(0,15)};
fs.writeFileSync(new URL('pose-audit.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
