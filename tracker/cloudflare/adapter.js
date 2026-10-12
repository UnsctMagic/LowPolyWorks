// Runs a Vercel-style (req, res) handler inside a Cloudflare Worker and returns a Response.
export async function runVercelHandler(handler,request,{maxBody=1048576}={}){
 const url=new URL(request.url),headers=Object.fromEntries(request.headers);
 // Only Cloudflare's own client address and country are trusted; incoming copies are replaced.
 headers['x-forwarded-for']=request.headers.get('cf-connecting-ip')||'unknown';
 headers['x-vercel-ip-country']=request.headers.get('cf-ipcountry')||'';
 let body;
 if(!['GET','HEAD'].includes(request.method)){
  if(Number(headers['content-length'])>maxBody)return new Response(null,{status:413});
  body=await request.text();if(body.length>maxBody)return new Response(null,{status:413});
  if(/^application\/json/i.test(headers['content-type']||'')&&body)try{body=JSON.parse(body);}catch{}
 }
 const response={status:200,headers:new Headers(),body:null};
 const res={headersSent:false,
  setHeader(name,value){response.headers.set(name,String(value));return res;},
  getHeader:name=>response.headers.get(name),
  status(code){response.status=code;return res;},
  json(value){if(!response.headers.has('Content-Type'))response.headers.set('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(value));},
  end(chunk){if(!res.headersSent){response.body=chunk??null;res.headersSent=true;}return res;},
  destroy(){res.headersSent=true;}};
 await handler({method:request.method,url:url.pathname+url.search,headers,body,socket:{remoteAddress:headers['x-forwarded-for']}},res);
 if(!res.headersSent)return new Response(null,{status:500});
 response.headers.set('X-Robots-Tag','noindex, nofollow');
 return new Response(request.method==='HEAD'||[204,304].includes(response.status)?null:response.body,{status:response.status,headers:response.headers});
}
