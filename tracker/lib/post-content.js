import {fail,AUTHOR_ORIGIN} from './publishing.js';
export const imageTypes=['image/png','image/jpeg','image/webp','image/gif'];
export const uploadLimit=20*1024*1024;
export const uuidPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function videoOf(value){
 let url;try{url=new URL(value);}catch{fail(400,'Enter a full HTTPS video link.');}
 if(url.protocol!=='https:'||url.username||url.password||url.href.length>2000)fail(400,'Enter a full HTTPS video link.');
 const host=url.hostname.toLowerCase().replace(/^www\./,'');
 let id;if(host==='youtu.be')id=url.pathname.slice(1);else if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host))id=url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
 if(id&&/^[\w-]{11}$/.test(id))return {url:url.href,type:'embed',embedUrl:'https://www.youtube-nocookie.com/embed/'+id};
 const vimeo=host==='vimeo.com'&&url.pathname.match(/^\/(\d+)(?:\/([a-f0-9]+))?\/?$/)||host==='player.vimeo.com'&&url.pathname.match(/^\/video\/(\d+)\/?$/);
 if(vimeo)return {url:url.href,type:'embed',embedUrl:'https://player.vimeo.com/video/'+vimeo[1]+(vimeo[2]?'?h='+vimeo[2]:'')};
 return {url:url.href,type:/\.(mp4|webm|ogv|ogg)$/i.test(url.pathname)?'video':'link'};
}
export function contentOf(input,state,authorId){
 const ids=input.media||[];if(!Array.isArray(ids)||ids.length>10||new Set(ids).size!==ids.length)fail(400,'Attach up to 10 images or GIFs.');
 const media=ids.map(id=>{const upload=(state.uploads||[]).find(u=>u.id===id&&u.authorId===authorId&&u.ready);if(!upload)fail(400,'Finish uploading your image before publishing.');return {id:upload.id,url:AUTHOR_ORIGIN+'/api/media?id='+upload.id,name:upload.name,type:upload.type};});
 const links=input.videos||[];if(!Array.isArray(links)||links.length>5)fail(400,'Add up to 5 video links.');const videos=links.map(videoOf);
 let poll=null;
 if(input.poll){const question=String(input.poll.question||'').trim(),options=input.poll.options;if(!question||question.length>200||!Array.isArray(options)||options.length<2||options.length>10||options.some(o=>typeof o!=='string'||!o.trim()||o.trim().length>100)||new Set(options.map(o=>o.trim().toLowerCase())).size!==options.length)fail(400,'A poll needs a question and 2–10 different choices.');poll={question,options:options.map(o=>o.trim()),votes:{}};}
 return {media,videos,poll};
}
export function pollView(poll,voterKey){
 if(!poll)return null;const votes=Object.values(poll.votes||{}),counts=poll.options.map(()=>0);for(const choice of votes)if(Number.isInteger(choice)&&choice>=0&&choice<counts.length)counts[choice]++;
 return {question:poll.question,options:poll.options.map((label,index)=>({label,votes:counts[index]})),total:counts.reduce((a,b)=>a+b,0),votedOption:voterKey&&Object.hasOwn(poll.votes||{},voterKey)?poll.votes[voterKey]:null};
}
