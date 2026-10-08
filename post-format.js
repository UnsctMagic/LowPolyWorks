const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function contentUrl(value){
 let url;try{url=new URL(String(value).trim());}catch{throw Error('Enter a full HTTPS link.');}
 if(url.protocol!=='https:'||url.username||url.password||url.href.length>2000)throw Error('Enter a full HTTPS link.');
 return url.href;
}
function linked(value,label,image=false){
 let url;try{url=escape(contentUrl(value));}catch{return escape(image?'[img]'+value+'[/img]':label);}
 return image?`<a class="post-inline-image" href="${url}" target="_blank" rel="noopener noreferrer"><img src="${url}" alt="${escape(label||'Post image')}" loading="lazy" referrerpolicy="no-referrer"></a>`:`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}
function inline(text,depth=0){
 if(depth>8)return escape(text);
 let html='';
 while(text){
  let match;
  if((match=text.match(/^\\([\\`*_{}\[\]()#+.!>~-])/))){html+=escape(match[1]);text=text.slice(match[0].length);continue;}
  if((match=text.match(/^`([^`\n]+)`/))){html+='<code>'+escape(match[1])+'</code>';text=text.slice(match[0].length);continue;}
  if((match=text.match(/^\[code\]([\s\S]*?)\[\/code\]/i))){html+='<code>'+escape(match[1])+'</code>';text=text.slice(match[0].length);continue;}
  if((match=text.match(/^\[img\]([^\n]+?)\[\/img\]/i))){html+=linked(match[1],'Post image',true);text=text.slice(match[0].length);continue;}
  if((match=text.match(/^(!?)\[([^\]\n]*)\]\((https:\/\/[^\s)]+)\)/i))){html+=linked(match[3],match[1]?match[2]:inline(match[2],depth+1),Boolean(match[1]));text=text.slice(match[0].length);continue;}
  if((match=text.match(/^\[url(?:=([^\]\n]+))?\]([\s\S]*?)\[\/url\]/i))){html+=linked(match[1]||match[2],inline(match[2],depth+1));text=text.slice(match[0].length);continue;}
  if((match=text.match(/^\[(b|i|u|s)\]([\s\S]*?)\[\/\1\]/i))){const tag={b:'strong',i:'em',u:'u',s:'del'}[match[1].toLowerCase()];html+=`<${tag}>${inline(match[2],depth+1)}</${tag}>`;text=text.slice(match[0].length);continue;}
  if((match=text.match(/^(\*\*\*|___|\*\*|__|~~|\*|_)(?=\S)([^\n]+?\S|\S)\1/))){const mark=match[1],inside=inline(match[2],depth+1);html+=mark.length===3?'<strong><em>'+inside+'</em></strong>':mark==='~~'?'<del>'+inside+'</del>':mark.length===2?'<strong>'+inside+'</strong>':'<em>'+inside+'</em>';text=text.slice(match[0].length);continue;}
  if((match=text.match(/^https:\/\/[^\s<>\[\]]+/i))){const url=match[0].replace(/[.,!?;:]+$/,'');html+=linked(url,escape(url));text=text.slice(url.length);continue;}
  html+=text[0]==='\n'?'<br>':escape(text[0]);text=text.slice(1);
 }
 return html;
}
// Raw HTML always stays text. Only the explicit formatting above emits HTML.
export function postBody(value,depth=0){
 if(depth>8)return '<p>'+escape(value)+'</p>';
 const lines=String(value??'').replace(/\r\n?/g,'\n').split('\n');let html='',paragraph=[];
 const flush=()=>{if(paragraph.length){html+='<p>'+inline(paragraph.join('\n'))+'</p>';paragraph=[];}};
 for(let index=0;index<lines.length;index++){
  const line=lines[index];let match;
  if((match=line.match(/^\s*```[\w-]*\s*$/))){flush();const code=[];while(++index<lines.length&&!/^\s*```\s*$/.test(lines[index]))code.push(lines[index]);html+='<pre><code>'+escape(code.join('\n'))+'</code></pre>';continue;}
  if(!line.trim()){flush();continue;}
  if((match=line.match(/^(#{1,3})\s+(.+)$/))){flush();const level=match[1].length+2;html+=`<h${level}>${inline(match[2])}</h${level}>`;continue;}
  if(/^>\s?/.test(line)){flush();const quote=[];do{quote.push(lines[index].replace(/^>\s?/,''));index++;}while(index<lines.length&&/^>\s?/.test(lines[index]));index--;html+='<blockquote>'+postBody(quote.join('\n'),depth+1)+'</blockquote>';continue;}
  const list=line.match(/^\s*(?:([-*+])|\d+[.)])\s+(.+)$/);
  if(list){flush();const ordered=!list[1],tag=ordered?'ol':'ul',pattern=ordered?/^\s*\d+[.)]\s+(.+)$/:/^\s*[-*+]\s+(.+)$/;html+='<'+tag+'>';while(index<lines.length&&(match=lines[index].match(pattern))){html+='<li>'+inline(match[1])+'</li>';index++;}index--;html+='</'+tag+'>';continue;}
  paragraph.push(line);
 }
 flush();return html;
}
