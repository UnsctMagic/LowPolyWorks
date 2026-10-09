var Kt={},Dr=function(e,t,n,r,i){var a=new Worker(Kt[t]||(Kt[t]=URL.createObjectURL(new Blob([e+';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'],{type:"text/javascript"}))));return a.onmessage=function(o){var s=o.data,f=s.$e$;if(f){var l=new Error(f[0]);l.code=f[1],l.stack=f[2],i(l,null)}else i(null,s)},a.postMessage(n,r),a},H=Uint8Array,me=Uint16Array,tt=Int32Array,qe=new H([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),Ke=new H([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),Je=new H([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),Qt=function(e,t){for(var n=new me(31),r=0;r<31;++r)n[r]=t+=1<<e[r-1];for(var i=new tt(n[30]),r=1;r<30;++r)for(var a=n[r];a<n[r+1];++a)i[a]=a-n[r]<<5|r;return{b:n,r:i}},Jt=Qt(qe,2),Rt=Jt.b,vt=Jt.r;Rt[28]=258,vt[258]=28;var er=Qt(Ke,0),tr=er.b,Ut=er.r,et=new me(32768);for(W=0;W<32768;++W)Ve=(W&43690)>>1|(W&21845)<<1,Ve=(Ve&52428)>>2|(Ve&13107)<<2,Ve=(Ve&61680)>>4|(Ve&3855)<<4,et[W]=((Ve&65280)>>8|(Ve&255)<<8)>>1;var Ve,W,Ee=function(e,t,n){for(var r=e.length,i=0,a=new me(t);i<r;++i)e[i]&&++a[e[i]-1];var o=new me(t);for(i=1;i<t;++i)o[i]=o[i-1]+a[i-1]<<1;var s;if(n){s=new me(1<<t);var f=15-t;for(i=0;i<r;++i)if(e[i])for(var l=i<<4|e[i],c=t-e[i],T=o[e[i]-1]++<<c,P=T|(1<<c)-1;T<=P;++T)s[et[T]>>f]=l}else for(s=new me(r),i=0;i<r;++i)e[i]&&(s[i]=et[o[e[i]-1]++]>>15-e[i]);return s},De=new H(288);for(W=0;W<144;++W)De[W]=8;var W;for(W=144;W<256;++W)De[W]=9;var W;for(W=256;W<280;++W)De[W]=7;var W;for(W=280;W<288;++W)De[W]=8;var W,We=new H(32);for(W=0;W<32;++W)We[W]=5;var W,rr=Ee(De,9,0),nr=Ee(De,9,1),ir=Ee(We,5,0),or=Ee(We,5,1),dt=function(e){for(var t=e[0],n=1;n<e.length;++n)e[n]>t&&(t=e[n]);return t},Se=function(e,t,n){var r=t/8|0;return(e[r]|e[r+1]<<8)>>(t&7)&n},gt=function(e,t){var n=t/8|0;return(e[n]|e[n+1]<<8|e[n+2]<<16)>>(t&7)},$e=function(e){return(e+7)/8|0},Fe=function(e,t,n){return(t==null||t<0)&&(t=0),(n==null||n>e.length)&&(n=e.length),new H(e.subarray(t,n))};var ar=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],O=function(e,t,n){var r=new Error(t||ar[e]);if(r.code=e,Error.captureStackTrace&&Error.captureStackTrace(r,O),!n)throw r;return r},It=function(e,t,n,r){var i=e.length,a=r?r.length:0;if(!i||t.f&&!t.l)return n||new H(0);var o=!n,s=o||t.i!=2,f=t.i;o&&(n=new H(i*3));var l=function(ue){var ye=n.length;if(ue>ye){var ce=new H(Math.max(ye*2,ue));ce.set(n),n=ce}},c=t.f||0,T=t.p||0,P=t.b||0,V=t.l,I=t.d,w=t.m,_=t.n,m=i*8;do{if(!V){c=Se(e,T,1);var x=Se(e,T+1,3);if(T+=3,x)if(x==1)V=nr,I=or,w=9,_=5;else if(x==2){var u=Se(e,T,31)+257,M=Se(e,T+10,15)+4,F=u+Se(e,T+5,31)+1;T+=14;for(var d=new H(F),y=new H(19),g=0;g<M;++g)y[Je[g]]=Se(e,T+g*3,7);T+=M*3;for(var h=dt(y),C=(1<<h)-1,G=Ee(y,h,1),g=0;g<F;){var L=G[Se(e,T,C)];T+=L&15;var p=L>>4;if(p<16)d[g++]=p;else{var E=0,A=0;for(p==16?(A=3+Se(e,T,3),T+=2,E=d[g-1]):p==17?(A=3+Se(e,T,7),T+=3):p==18&&(A=11+Se(e,T,127),T+=7);A--;)d[g++]=E}}var b=d.subarray(0,u),B=d.subarray(u);w=dt(b),_=dt(B),V=Ee(b,w,1),I=Ee(B,_,1)}else O(1);else{var p=$e(T)+4,S=e[p-4]|e[p-3]<<8,re=p+S;if(re>i){f&&O(0);break}s&&l(P+S),n.set(e.subarray(p,re),P),t.b=P+=S,t.p=T=re*8,t.f=c;continue}if(T>m){f&&O(0);break}}s&&l(P+131072);for(var oe=(1<<w)-1,Q=(1<<_)-1,Y=T;;Y=T){var E=V[gt(e,T)&oe],te=E>>4;if(T+=E&15,T>m){f&&O(0);break}if(E||O(2),te<256)n[P++]=te;else if(te==256){Y=T,V=null;break}else{var q=te-254;if(te>264){var g=te-257,X=qe[g];q=Se(e,T,(1<<X)-1)+Rt[g],T+=X}var se=I[gt(e,T)&Q],be=se>>4;se||O(3),T+=se&15;var B=tr[be];if(be>3){var X=Ke[be];B+=gt(e,T)&(1<<X)-1,T+=X}if(T>m){f&&O(0);break}s&&l(P+131072);var pe=P+q;if(P<B){var Te=a-B,he=Math.min(B,pe);for(Te+P<0&&O(3);P<he;++P)n[P]=r[Te+P]}for(;P<pe;++P)n[P]=n[P-B]}}t.l=V,t.p=Y,t.b=P,t.f=c,V&&(c=1,t.m=w,t.d=I,t.n=_)}while(!c);return P!=n.length&&o?Fe(n,0,P):n.subarray(0,P)},Ce=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8},He=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8,e[r+2]|=n>>16},pt=function(e,t){for(var n=[],r=0;r<e.length;++r)e[r]&&n.push({s:r,f:e[r]});var i=n.length,a=n.slice();if(!i)return{t:Me,l:0};if(i==1){var o=new H(n[0].s+1);return o[n[0].s]=1,{t:o,l:1}}n.sort(function(F,d){return F.f-d.f}),n.push({s:-1,f:25001});var s=n[0],f=n[1],l=0,c=1,T=2;for(n[0]={s:-1,f:s.f+f.f,l:s,r:f};c!=i-1;)s=n[n[l].f<n[T].f?l++:T++],f=n[l!=c&&n[l].f<n[T].f?l++:T++],n[c++]={s:-1,f:s.f+f.f,l:s,r:f};for(var P=a[0].s,r=1;r<i;++r)a[r].s>P&&(P=a[r].s);var V=new me(P+1),I=bt(n[c-1],V,0);if(I>t){var r=0,w=0,_=I-t,m=1<<_;for(a.sort(function(d,y){return V[y.s]-V[d.s]||d.f-y.f});r<i;++r){var x=a[r].s;if(V[x]>t)w+=m-(1<<I-V[x]),V[x]=t;else break}for(w>>=_;w>0;){var u=a[r].s;V[u]<t?w-=1<<t-V[u]++-1:++r}for(;r>=0&&w;--r){var M=a[r].s;V[M]==t&&(--V[M],++w)}I=t}return{t:new H(V),l:I}},bt=function(e,t,n){return e.s==-1?Math.max(bt(e.l,t,n+1),bt(e.r,t,n+1)):t[e.s]=n},Ct=function(e){for(var t=e.length;t&&!e[--t];);for(var n=new me(++t),r=0,i=e[0],a=1,o=function(f){n[r++]=f},s=1;s<=t;++s)if(e[s]==i&&s!=t)++a;else{if(!i&&a>2){for(;a>138;a-=138)o(32754);a>2&&(o(a>10?a-11<<5|28690:a-3<<5|12305),a=0)}else if(a>3){for(o(i),--a;a>6;a-=6)o(8304);a>2&&(o(a-3<<5|8208),a=0)}for(;a--;)o(i);a=1,i=e[s]}return{c:n.subarray(0,r),n:t}},Xe=function(e,t){for(var n=0,r=0;r<t.length;++r)n+=e[r]*t[r];return n},xt=function(e,t,n){var r=n.length,i=$e(t+2);e[i]=r&255,e[i+1]=r>>8,e[i+2]=e[i]^255,e[i+3]=e[i+1]^255;for(var a=0;a<r;++a)e[i+a+4]=n[a];return(i+4+r)*8},Mt=function(e,t,n,r,i,a,o,s,f,l,c){Ce(t,c++,n),++i[256];for(var T=pt(i,15),P=T.t,V=T.l,I=pt(a,15),w=I.t,_=I.l,m=Ct(P),x=m.c,u=m.n,M=Ct(w),F=M.c,d=M.n,y=new me(19),g=0;g<x.length;++g)++y[x[g]&31];for(var g=0;g<F.length;++g)++y[F[g]&31];for(var h=pt(y,7),C=h.t,G=h.l,L=19;L>4&&!C[Je[L-1]];--L);var p=l+5<<3,E=Xe(i,De)+Xe(a,We)+o,A=Xe(i,P)+Xe(a,w)+o+14+3*L+Xe(y,C)+2*y[16]+3*y[17]+7*y[18];if(f>=0&&p<=E&&p<=A)return xt(t,c,e.subarray(f,f+l));var b,B,S,re;if(Ce(t,c,1+(A<E)),c+=2,A<E){b=Ee(P,V,0),B=P,S=Ee(w,_,0),re=w;var oe=Ee(C,G,0);Ce(t,c,u-257),Ce(t,c+5,d-1),Ce(t,c+10,L-4),c+=14;for(var g=0;g<L;++g)Ce(t,c+3*g,C[Je[g]]);c+=3*L;for(var Q=[x,F],Y=0;Y<2;++Y)for(var te=Q[Y],g=0;g<te.length;++g){var q=te[g]&31;Ce(t,c,oe[q]),c+=C[q],q>15&&(Ce(t,c,te[g]>>5&127),c+=te[g]>>12)}}else b=rr,B=De,S=ir,re=We;for(var g=0;g<s;++g){var X=r[g];if(X>255){var q=X>>18&31;He(t,c,b[q+257]),c+=B[q+257],q>7&&(Ce(t,c,X>>23&31),c+=qe[q]);var se=X&31;He(t,c,S[se]),c+=re[se],se>3&&(He(t,c,X>>5&8191),c+=Ke[se])}else He(t,c,b[X]),c+=B[X]}return He(t,c,b[256]),c+B[256]},sr=new tt([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),Me=new H(0),lr=function(e,t,n,r,i,a){var o=a.z||e.length,s=new H(r+o+5*(1+Math.ceil(o/7e3))+i),f=s.subarray(r,s.length-i),l=a.l,c=(a.r||0)&7;if(t){c&&(f[0]=a.r>>3);for(var T=sr[t-1],P=T>>13,V=T&8191,I=(1<<n)-1,w=a.p||new me(32768),_=a.h||new me(I+1),m=Math.ceil(n/3),x=2*m,u=function(Pe){return(e[Pe]^e[Pe+1]<<m^e[Pe+2]<<x)&I},M=new tt(25e3),F=new me(288),d=new me(32),y=0,g=0,h=a.i||0,C=0,G=a.w||0,L=0;h+2<o;++h){var p=u(h),E=h&32767,A=_[p];if(w[E]=A,_[p]=E,G<=h){var b=o-h;if((y>7e3||C>24576)&&(b>423||!l)){c=Mt(e,f,0,M,F,d,g,C,L,h-L,c),C=y=g=0,L=h;for(var B=0;B<286;++B)F[B]=0;for(var B=0;B<30;++B)d[B]=0}var S=2,re=0,oe=V,Q=E-A&32767;if(b>2&&p==u(h-Q))for(var Y=Math.min(P,b)-1,te=Math.min(32767,h),q=Math.min(258,b);Q<=te&&--oe&&E!=A;){if(e[h+S]==e[h+S-Q]){for(var X=0;X<q&&e[h+X]==e[h+X-Q];++X);if(X>S){if(S=X,re=Q,X>Y)break;for(var se=Math.min(Q,X-2),be=0,B=0;B<se;++B){var pe=h-Q+B&32767,Te=w[pe],he=pe-Te&32767;he>be&&(be=he,A=pe)}}}E=A,A=w[E],Q+=E-A&32767}if(re){M[C++]=268435456|vt[S]<<18|Ut[re];var ue=vt[S]&31,ye=Ut[re]&31;g+=qe[ue]+Ke[ye],++F[257+ue],++d[ye],G=h+S,++y}else M[C++]=e[h],++F[e[h]]}}for(h=Math.max(h,G);h<o;++h)M[C++]=e[h],++F[e[h]];c=Mt(e,f,l,M,F,d,g,C,L,h-L,c),l||(a.r=c&7|f[c/8|0]<<3,c-=7,a.h=_,a.p=w,a.i=h,a.w=G)}else{for(var h=a.w||0;h<o+l;h+=65535){var ce=h+65535;ce>=o&&(f[c/8|0]=l,ce=o),c=xt(f,c+1,e.subarray(h,ce))}a.i=o}return Fe(s,0,r+$e(c)+i)},Rr=function(){for(var e=new Int32Array(256),t=0;t<256;++t){for(var n=t,r=9;--r;)n=(n&1&&-306674912)^n>>>1;e[t]=n}return e}(),fr=function(){var e=-1;return{p:function(t){for(var n=e,r=0;r<t.length;++r)n=Rr[n&255^t[r]]^n>>>8;e=n},d:function(){return~e}}},ur=function(){var e=1,t=0;return{p:function(n){for(var r=e,i=t,a=n.length|0,o=0;o!=a;){for(var s=Math.min(o+2655,a);o<s;++o)i+=r+=n[o];r=(r&65535)+15*(r>>16),i=(i&65535)+15*(i>>16)}e=r,t=i},d:function(){return e%=65521,t%=65521,(e&255)<<24|(e&65280)<<8|(t&255)<<8|t>>8}}},rt=function(e,t,n,r,i){if(!i&&(i={l:1},t.dictionary)){var a=t.dictionary.subarray(-32768),o=new H(a.length+e.length);o.set(a),o.set(e,a.length),e=o,i.w=a.length}return lr(e,t.level==null?6:t.level,t.mem==null?i.l?Math.ceil(Math.max(8,Math.min(13,Math.log(e.length)))*1.5):20:12+t.mem,n,r,i)},hr=function(e,t){var n={};for(var r in e)n[r]=e[r];for(var r in t)n[r]=t[r];return n},$t=function(e,t,n){for(var r=e(),i=e.toString(),a=i.slice(i.indexOf("[")+1,i.lastIndexOf("]")).replace(/\s+/g,"").split(","),o=0;o<r.length;++o){var s=r[o],f=a[o];if(typeof s=="function"){t+=";"+f+"=";var l=s.toString();if(s.prototype)if(l.indexOf("[native code]")!=-1){var c=l.indexOf(" ",8)+1;t+=l.slice(c,l.indexOf("(",c))}else{t+=l;for(var T in s.prototype)t+=";"+f+".prototype."+T+"="+s.prototype[T].toString()}else t+=l}else n[f]=s}return t},ct=[],Ir=function(e){var t=[];for(var n in e)e[n].buffer&&t.push((e[n]=new e[n].constructor(e[n])).buffer);return t},Gr=function(e,t,n,r){if(!ct[n]){for(var i="",a={},o=e.length-1,s=0;s<o;++s)i=$t(e[s],i,a);ct[n]={c:$t(e[o],i,a),e:a}}var f=hr({},ct[n].e);return Dr(ct[n].c+";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage="+t.toString()+"}",n,f,Ir(f),r)},Gt=function(){return[H,me,tt,qe,Ke,Je,Rt,tr,nr,or,et,ar,Ee,dt,Se,gt,$e,Fe,O,It,mr,cr,kr]},_r=function(){return[H,me,tt,qe,Ke,Je,vt,Ut,rr,De,ir,We,et,sr,Me,Ee,Ce,He,pt,bt,Ct,Xe,xt,Mt,$e,Fe,lr,rt,Kr,cr]};var Or=function(){return[dr,Hr]};var Nr=function(){return[gr]},cr=function(e){return postMessage(e,[e.buffer])},kr=function(e){return e&&{out:e.size&&new H(e.size),dictionary:e.dictionary}};var Ie=function(e){return e.ondata=function(t,n){return postMessage([t,n],[t.buffer])},function(t){t.data[0]?(e.push(t.data[0],t.data[1]),postMessage([t.data[0].length])):e.flush(t.data[1])}},At=function(e,t,n,r,i,a,o){var s,f=Gr(e,r,i,function(l,c){l?(f.terminate(),t.ondata.call(t,l)):Array.isArray(c)?c.length==1?(t.queuedSize-=c[0],t.ondrain&&t.ondrain(c[0])):(c[1]&&f.terminate(),t.ondata.call(t,l,c[0],c[1])):o(c)});f.postMessage(n),t.queuedSize=0,t.push=function(l,c){t.ondata||O(5),s&&t.ondata(O(4,0,1),null,!!c),t.queuedSize+=l.length,f.postMessage([l,s=c],l.buffer instanceof ArrayBuffer?[l.buffer]:[])},t.terminate=function(){f.terminate()},a&&(t.flush=function(l){f.postMessage([0,l])})},xe=function(e,t){return e[t]|e[t+1]<<8},ge=function(e,t){return(e[t]|e[t+1]<<8|e[t+2]<<16|e[t+3]<<24)>>>0},Ft=function(e,t){return ge(e,t)+ge(e,t+4)*4294967296},Z=function(e,t,n){for(;n;++t)e[t]=n,n>>>=8},zr=function(e,t){var n=t.filename;if(e[0]=31,e[1]=139,e[2]=8,e[8]=t.level<2?4:t.level==9?2:0,e[9]=3,t.mtime!=0&&Z(e,4,Math.floor(new Date(t.mtime||Date.now())/1e3)),n){e[3]=8;for(var r=0;r<=n.length;++r)e[r+10]=n.charCodeAt(r)}},dr=function(e){(e[0]!=31||e[1]!=139||e[2]!=8)&&O(6,"invalid gzip data");var t=e[3],n=10;t&4&&(n+=(e[10]|e[11]<<8)+2);for(var r=(t>>3&1)+(t>>4&1);r>0;r-=!e[n++]);return n+(t&2)},Hr=function(e){var t=e.length;return(e[t-4]|e[t-3]<<8|e[t-2]<<16|e[t-1]<<24)>>>0},Xr=function(e){return 10+(e.filename?e.filename.length+1:0)},Wr=function(e,t){var n=t.level,r=n==0?0:n<6?1:n==9?3:2;if(e[0]=120,e[1]=r<<6|(t.dictionary&&32),e[1]|=31-(e[0]<<8|e[1])%31,t.dictionary){var i=ur();i.p(t.dictionary),Z(e,2,i.d())}},gr=function(e,t){return((e[0]&15)!=8||e[0]>>4>7||(e[0]<<8|e[1])%31)&&O(6,"invalid zlib data"),(e[1]>>5&1)==+!t&&O(6,"invalid zlib data: "+(e[1]&32?"need":"unexpected")+" dictionary"),(e[1]>>3&4)+2};function nt(e,t){return typeof e=="function"&&(t=e,e={}),this.ondata=t,e}var we=function(){function e(t,n){if(typeof t=="function"&&(n=t,t={}),this.ondata=n,this.o=t||{},this.s={l:0,i:32768,w:32768,z:32768},this.b=new H(98304),this.o.dictionary){var r=this.o.dictionary.subarray(-32768);this.b.set(r,32768-r.length),this.s.i=32768-r.length}}return e.prototype.p=function(t,n){this.ondata(rt(t,this.o,0,0,this.s),n)},e.prototype.push=function(t,n){this.ondata||O(5),this.s.l&&O(4);var r=t.length+this.s.z;if(r>this.b.length){if(r>2*this.b.length-32768){var i=new H(r&-32768);i.set(this.b.subarray(0,this.s.z)),this.b=i}var a=this.b.length-this.s.z;this.b.set(t.subarray(0,a),this.s.z),this.s.z=this.b.length,this.p(this.b,!1),this.b.set(this.b.subarray(-32768)),this.b.set(t.subarray(a),32768),this.s.z=t.length-a+32768,this.s.i=32766,this.s.w=32768}else this.b.set(t,this.s.z),this.s.z+=t.length;this.s.l=n&1,(this.s.z>this.s.w+8191||n)&&(this.p(this.b,n||!1),this.s.w=this.s.i,this.s.i-=2),n&&(this.s=this.o={},this.b=Me)},e.prototype.flush=function(t){if(this.ondata||O(5),this.s.l&&O(4),this.p(this.b,!1),this.s.w=this.s.i,this.s.i-=2,t){var n=new H(6);n[0]=this.s.r>>3;var r=xt(n,this.s.r,Me);this.s.r=0,this.ondata(n.subarray(0,r>>3),!1)}},e}(),qr=function(){function e(t,n){At([_r,function(){return[Ie,we]}],this,nt.call(this,t,n),function(r){var i=new we(r.data);onmessage=Ie(i)},6,1)}return e}();function Kr(e,t){return rt(e,t||{},0,0)}var Ae=function(){function e(t,n){typeof t=="function"&&(n=t,t={}),this.ondata=n;var r=t&&t.dictionary&&t.dictionary.subarray(-32768);this.s={i:0,b:r?r.length:0},this.o=new H(32768),this.p=new H(0),r&&this.o.set(r)}return e.prototype.e=function(t){if(this.ondata||O(5),this.d&&O(4),!this.p.length)this.p=t;else if(t.length){var n=new H(this.p.length+t.length);n.set(this.p),n.set(t,this.p.length),this.p=n}},e.prototype.c=function(t){this.s.i=+(this.d=t||!1);var n=this.s.b,r=It(this.p,this.s,this.o);this.ondata(Fe(r,n,this.s.b),this.d),this.o=Fe(r,this.s.b-32768),this.s.b=this.o.length,this.p=Fe(this.p,this.s.p/8|0),this.s.p&=7},e.prototype.push=function(t,n){this.e(t),this.c(n)},e}(),pr=function(){function e(t,n){At([Gt,function(){return[Ie,Ae]}],this,nt.call(this,t,n),function(r){var i=new Ae(r.data);onmessage=Ie(i)},7,0)}return e}();function mr(e,t){return It(e,{i:2},t&&t.out,t&&t.dictionary)}var Ni=function(){function e(t,n){this.c=fr(),this.l=0,this.v=1,we.call(this,t,n)}return e.prototype.push=function(t,n){this.c.p(t),this.l+=t.length,we.prototype.push.call(this,t,n)},e.prototype.p=function(t,n){var r=rt(t,this.o,this.v&&Xr(this.o),n&&8,this.s);this.v&&(zr(r,this.o),this.v=0),n&&(Z(r,r.length-8,this.c.d()),Z(r,r.length-4,this.l)),this.ondata(r,n)},e.prototype.flush=function(t){we.prototype.flush.call(this,t)},e}();var Bt=function(){function e(t,n){this.v=1,this.r=0,Ae.call(this,t,n)}return e.prototype.push=function(t,n){if(Ae.prototype.e.call(this,t),this.r+=t.length,this.v){var r=this.p.subarray(this.v-1),i=r.length>3?dr(r):4;if(i>r.length){if(!n)return}else this.v>1&&this.onmember&&this.onmember(this.r-r.length);this.p=r.subarray(i),this.v=0}Ae.prototype.c.call(this,0),this.s.f&&!this.s.l?(this.v=$e(this.s.p)+9,this.s={i:0},this.o=new H(0),this.push(new H(0),n)):n&&Ae.prototype.c.call(this,n)},e}(),$r=function(){function e(t,n){var r=this;At([Gt,Or,function(){return[Ie,Ae,Bt]}],this,nt.call(this,t,n),function(i){var a=new Bt(i.data);a.onmember=function(o){return postMessage(o)},onmessage=Ie(a)},9,0,function(i){return r.onmember&&r.onmember(i)})}return e}();var ki=function(){function e(t,n){this.c=ur(),this.v=1,we.call(this,t,n)}return e.prototype.push=function(t,n){this.c.p(t),we.prototype.push.call(this,t,n)},e.prototype.p=function(t,n){var r=rt(t,this.o,this.v&&(this.o.dictionary?6:2),n&&4,this.s);this.v&&(Wr(r,this.o),this.v=0),n&&Z(r,r.length-4,this.c.d()),this.ondata(r,n)},e.prototype.flush=function(t){we.prototype.flush.call(this,t)},e}();var Vt=function(){function e(t,n){Ae.call(this,t,n),this.v=t&&t.dictionary?2:1}return e.prototype.push=function(t,n){if(Ae.prototype.e.call(this,t),this.v){if(this.p.length<6&&!n)return;this.p=this.p.subarray(gr(this.p,this.v-1)),this.v=0}n&&(this.p.length<4&&O(6,"invalid zlib data"),this.p=this.p.subarray(0,-4)),Ae.prototype.c.call(this,n)},e}(),Yr=function(){function e(t,n){At([Gt,Nr,function(){return[Ie,Ae,Vt]}],this,nt.call(this,t,n),function(r){var i=new Vt(r.data);onmessage=Ie(i)},11,0)}return e}();var Yt=function(){function e(t,n){this.o=nt.call(this,t,n)||{},this.G=Bt,this.I=Ae,this.Z=Vt}return e.prototype.i=function(){var t=this;this.s.ondata=function(n,r){t.ondata(n,r)}},e.prototype.push=function(t,n){if(this.ondata||O(5),this.s)this.s.push(t,n);else{if(this.p&&this.p.length){var r=new H(this.p.length+t.length);r.set(this.p),r.set(t,this.p.length)}else this.p=t;this.p.length>2&&(this.s=this.p[0]==31&&this.p[1]==139&&this.p[2]==8?new this.G(this.o):(this.p[0]&15)!=8||this.p[0]>>4>7||(this.p[0]<<8|this.p[1])%31?new this.I(this.o):new this.Z(this.o),this.i(),this.s.push(this.p,n),this.p=null)}},e}(),zi=function(){function e(t,n){Yt.call(this,t,n),this.queuedSize=0,this.G=$r,this.I=pr,this.Z=Yr}return e.prototype.i=function(){var t=this;this.s.ondata=function(n,r,i){t.ondata(n,r,i)},this.s.ondrain=function(n){t.queuedSize-=n,t.ondrain&&t.ondrain(n)}},e.prototype.push=function(t,n){this.queuedSize+=t.length,Yt.prototype.push.call(this,t,n)},e}();var jt=typeof TextEncoder<"u"&&new TextEncoder,wt=typeof TextDecoder<"u"&&new TextDecoder,vr=0;try{wt.decode(Me,{stream:!0}),vr=1}catch{}var br=function(e){for(var t="",n=0;;){var r=e[n++],i=(r>127)+(r>223)+(r>239);if(n+i>e.length)return{s:t,r:Fe(e,n-1)};i?i==3?(r=((r&15)<<18|(e[n++]&63)<<12|(e[n++]&63)<<6|e[n++]&63)-65536,t+=String.fromCharCode(55296|r>>10,56320|r&1023)):i&1?t+=String.fromCharCode((r&31)<<6|e[n++]&63):t+=String.fromCharCode((r&15)<<12|(e[n++]&63)<<6|e[n++]&63):t+=String.fromCharCode(r)}},Hi=function(){function e(t){this.ondata=t,vr?this.t=new TextDecoder:this.p=Me}return e.prototype.push=function(t,n){if(this.ondata||O(5),n=!!n,this.t){this.ondata(this.t.decode(t,{stream:!0}),n),n&&(this.t.decode().length&&O(8),this.t=null);return}this.p||O(4);var r=new H(this.p.length+t.length);r.set(this.p),r.set(t,this.p.length);var i=br(r),a=i.s,o=i.r;n?(o.length&&O(8),this.p=null):this.p=o,this.ondata(a,n)},e}(),Xi=function(){function e(t){this.ondata=t}return e.prototype.push=function(t,n){this.ondata||O(5),this.d&&O(4),this.ondata(Dt(t),this.d=n||!1)},e}();function Dt(e,t){if(t){for(var n=new H(e.length),r=0;r<e.length;++r)n[r]=e.charCodeAt(r);return n}if(jt)return jt.encode(e);for(var i=e.length,a=new H(e.length+(e.length>>1)),o=0,s=function(T){a[o++]=T},r=0;r<i;++r){if(o+5>a.length){var f=new H(o+8+(i-r<<1));f.set(a),a=f}var l=e.charCodeAt(r);l<128||t?s(l):l<2048?(s(192|l>>6),s(128|l&63)):l>55295&&l<57344?(l=65536+(l&1047552)|e.charCodeAt(++r)&1023,s(240|l>>18),s(128|l>>12&63),s(128|l>>6&63),s(128|l&63)):(s(224|l>>12),s(128|l>>6&63),s(128|l&63))}return Fe(a,0,o)}function Tr(e,t){if(t){for(var n="",r=0;r<e.length;r+=16384)n+=String.fromCharCode.apply(null,e.subarray(r,r+16384));return n}else{if(wt)return wt.decode(e);var i=br(e),a=i.s,n=i.r;return n.length&&O(8),a}}var xr=function(e){return e==1?3:e<6?2:e==9?1:0},jr=function(e,t){return t+30+xe(e,t+26)+xe(e,t+28)},Zr=function(e,t,n){var r=xe(e,t+28),i=xe(e,t+30),a=Tr(e.subarray(t+46,t+46+r),!(xe(e,t+8)&2048)),o=t+46+r,s=Ar(e,o,i,n,ge(e,t+20),ge(e,t+24),ge(e,t+42)),f=s[0],l=s[1],c=s[2];return[xe(e,t+10),f,l,a,o+i+xe(e,t+32),c]},Ar=function(e,t,n,r,i,a,o){var s=i==4294967295,f=a==4294967295,l=o==4294967295,c=t+n,T=s+f+l;if(r&&T){for(;t+4<c;t+=4+xe(e,t+2))if(xe(e,t)==1)return[s?Ft(e,t+4+8*f):i,f?Ft(e,t+4):a,l?Ft(e,t+4+8*(f+s)):o,1];r<2&&O(13)}return[i,a,o,0]},mt=function(e){var t=0;if(e)for(var n in e){var r=e[n].length;r>65535&&O(9),t+=r+4}return t},Zt=function(e,t,n,r,i,a,o,s){var f=r.length,l=n.extra,c=s&&s.length,T=mt(l);Z(e,t,o!=null?33639248:67324752),t+=4,o!=null&&(e[t++]=20,e[t++]=n.os),e[t]=20,t+=2,e[t++]=n.flag<<1|(a<0&&8),e[t++]=i&&8,e[t++]=n.compression&255,e[t++]=n.compression>>8;var P=new Date(n.mtime==null?Date.now():n.mtime),V=P.getFullYear()-1980;if((V<0||V>119)&&O(10),Z(e,t,V<<25|P.getMonth()+1<<21|P.getDate()<<16|P.getHours()<<11|P.getMinutes()<<5|P.getSeconds()>>1),t+=4,a!=-1&&(Z(e,t,n.crc),Z(e,t+4,a<0?-a-2:a),Z(e,t+8,n.size)),Z(e,t+12,f),Z(e,t+14,T),t+=16,o!=null&&(Z(e,t,c),Z(e,t+6,n.attrs),Z(e,t+10,o),t+=14),e.set(r,t),t+=f,T)for(var I in l){var w=l[I],_=w.length;Z(e,t,+I),Z(e,t+2,_),e.set(w,t+4),t+=4+_}return c&&(e.set(s,t),t+=c),t},Qr=function(e,t,n,r,i){Z(e,t,101010256),Z(e,t+8,n),Z(e,t+10,n),Z(e,t+12,r),Z(e,t+16,i)},Tt=function(){function e(t){this.filename=t,this.c=fr(),this.size=0,this.compression=0}return e.prototype.process=function(t,n){this.ondata(null,t,n)},e.prototype.push=function(t,n){this.ondata||O(5),this.c.p(t),this.size+=t.length,n&&(this.crc=this.c.d()),this.process(t,n||!1)},e}(),Wi=function(){function e(t,n){var r=this;n||(n={}),Tt.call(this,t),this.d=new we(n,function(i,a){r.ondata(null,i,a)}),this.compression=8,this.flag=xr(n.level)}return e.prototype.process=function(t,n){try{this.d.push(t,n)}catch(r){this.ondata(r,null,n)}},e.prototype.push=function(t,n){Tt.prototype.push.call(this,t,n)},e}(),qi=function(){function e(t,n){var r=this;n||(n={}),Tt.call(this,t),this.d=new qr(n,function(i,a,o){r.ondata(i,a,o)}),this.compression=8,this.flag=xr(n.level),this.terminate=this.d.terminate}return e.prototype.process=function(t,n){this.d.push(t,n)},e.prototype.push=function(t,n){Tt.prototype.push.call(this,t,n)},e}(),Ki=function(){function e(t){this.ondata=t,this.u=[],this.d=1}return e.prototype.add=function(t){var n=this;if(this.ondata||O(5),this.d&2)this.ondata(O(4+(this.d&1)*8,0,1),null,!1);else{var r=Dt(t.filename),i=r.length,a=t.comment,o=a&&Dt(a),s=i!=t.filename.length||o&&a.length!=o.length,f=i+mt(t.extra)+30;i>65535&&this.ondata(O(11,0,1),null,!1);var l=new H(f);Zt(l,0,t,r,s,-1);var c=[l],T=function(){for(var _=0,m=c;_<m.length;_++){var x=m[_];n.ondata(null,x,!1)}c=[]},P=this.d;this.d=0;var V=this.u.length,I=hr(t,{f:r,u:s,o,t:function(){t.terminate&&t.terminate()},r:function(){if(T(),P){var _=n.u[V+1];_?_.r():n.d=1}P=1}}),w=0;t.ondata=function(_,m,x){if(_)n.ondata(_,m,x),n.terminate();else if(w+=m.length,c.push(m),x){var u=new H(16);Z(u,0,134695760),Z(u,4,t.crc),Z(u,8,w),Z(u,12,t.size),c.push(u),I.c=w,I.b=f+w+16,I.crc=t.crc,I.size=t.size,P&&I.r(),P=1}else P&&T()},this.u.push(I)}},e.prototype.end=function(){var t=this;if(this.d&2){this.ondata(O(4+(this.d&1)*8,0,1),null,!0);return}this.d?this.e():this.u.push({r:function(){t.d&1&&(t.u.splice(-1,1),t.e())},t:function(){}}),this.d=3},e.prototype.e=function(){for(var t=0,n=0,r=0,i=0,a=this.u;i<a.length;i++){var o=a[i];r+=46+o.f.length+mt(o.extra)+(o.o?o.o.length:0)}for(var s=new H(r+22),f=0,l=this.u;f<l.length;f++){var o=l[f];Zt(s,t,o,o.f,o.u,-o.c-2,n,o.o),t+=46+o.f.length+mt(o.extra)+(o.o?o.o.length:0),n+=o.b}Qr(s,t,this.u.length,r,n),this.ondata(null,s,!0),this.d=2},e.prototype.terminate=function(){for(var t=0,n=this.u;t<n.length;t++){var r=n[t];r.t()}this.d=2},e}();var Jr=function(){function e(){}return e.prototype.push=function(t,n){this.ondata(null,t,n)},e.compression=0,e}(),$i=function(){function e(){var t=this;this.i=new Ae(function(n,r){t.ondata(null,n,r)})}return e.prototype.push=function(t,n){try{this.i.push(t,n)}catch(r){this.ondata(r,null,n)}},e.compression=8,e}(),Yi=function(){function e(t,n){var r=this;n<32e4?this.i=new Ae(function(i,a){r.ondata(null,i,a)}):(this.i=new pr(function(i,a,o){r.ondata(i,a,o)}),this.terminate=this.i.terminate)}return e.prototype.push=function(t,n){this.i.terminate&&(t=Fe(t,0)),this.i.push(t,n)},e.compression=8,e}(),ji=function(){function e(t){this.onfile=t,this.k=[],this.o={0:Jr},this.p=Me}return e.prototype.push=function(t,n){var r=this;if(this.onfile||O(5),this.p||O(4),this.c>0){var i=Math.min(this.c,t.length),a=t.subarray(0,i);if(this.c-=i,this.d?this.d.push(a,!this.c):this.k[0].push(a),t=t.subarray(i),t.length)return this.push(t,n)}else{var o=0,s=0,f=void 0,l=void 0;this.p.length?t.length?(l=new H(this.p.length+t.length),l.set(this.p),l.set(t,this.p.length)):l=this.p:l=t;for(var c=l.length,T=this.c,P=T&&this.d,V=function(){var m=ge(l,s);if(m==67324752){o=1,f=s,I.d=null,I.c=0;var x=xe(l,s+6),u=xe(l,s+8),M=x&2048,F=x&8,d=xe(l,s+26),y=xe(l,s+28);if(c>s+30+d+y){var g=[];I.k.unshift(g),o=2;var h=ge(l,s+18),C=ge(l,s+22),G=Tr(l.subarray(s+30,s+=30+d),!M),L=Ar(l,s,y,2,h,C,0),p=L[0],E=L[1],A=L[3];F&&(p=-1-A),s+=y,I.c=p;var b,B={name:G,compression:u,start:function(){if(B.ondata||O(5),!p)B.ondata(null,Me,!0);else{var S=r.o[u];S||B.ondata(O(14,"unknown compression type "+u,1),null,!1),b=p<0?new S(G):new S(G,p,E),b.ondata=function(Y,te,q){B.ondata(Y,te,q)};for(var re=0,oe=g;re<oe.length;re++){var Q=oe[re];b.push(Q,!1)}r.k[0]==g&&r.c?r.d=b:b.push(Me,!0)}},terminate:function(){b&&b.terminate&&b.terminate()}};p>=0&&(B.size=p,B.originalSize=E),I.onfile(B)}return"break"}else if(T){if(m==134695760)return f=s+=12+(T==-2&&8),o=3,I.c=0,"break";if(m==33639248)return f=s-=4,o=3,I.c=0,"break"}},I=this;s<c-4;++s){var w=V();if(w==="break")break}if(this.p=Me,T<0){var _=o?l.subarray(0,f-12-(T==-2&&8)-(ge(l,f-16)==134695760&&4)):l.subarray(0,s);P?P.push(_,!!o):this.k[+(o==2)].push(_)}if(o&2)return this.push(l.subarray(s),n);this.p=l.subarray(s)}n&&(this.c&&O(13),this.p=null)},e.prototype.register=function(t){this.o[t.compression]=t},e}();function yr(e,t){for(var n={},r=e.length-22;ge(e,r)!=101010256;--r)(!r||e.length-r>65558)&&O(13);var i=xe(e,r+8);if(!i)return{};var a=ge(e,r+16),o=ge(e,r-20)==117853008;if(o){var s=ge(e,r-12);o=ge(e,s)==101075792,o&&(i=ge(e,s+32),a=ge(e,s+48))}for(var f=t&&t.filter,l=0;l<i;++l){var c=Zr(e,a,o),T=c[0],P=c[1],V=c[2],I=c[3],w=c[4],_=c[5],m=jr(e,_);a=w,(!f||f({name:I,size:P,originalSize:V,compression:T}))&&(T?T==8?n[I]=mr(e.subarray(m,m+P),{out:new H(V)}):O(14,"unknown compression type "+T):n[I]=Fe(e,m,m+P))}return n}var Pr=function(e){return e[e.WrapWidth=1]="WrapWidth",e[e.WrapHeight=2]="WrapHeight",e}({}),en=function(e){return e[e.None=0]="None",e[e.Transparent=1]="Transparent",e[e.Blend=2]="Blend",e[e.Additive=3]="Additive",e[e.AddAlpha=4]="AddAlpha",e[e.Modulate=5]="Modulate",e[e.Modulate2x=6]="Modulate2x",e}({}),Ye=function(e){return e[e.DontInterp=0]="DontInterp",e[e.Linear=1]="Linear",e[e.Hermite=2]="Hermite",e[e.Bezier=3]="Bezier",e}({}),tn=function(e){return e[e.Unshaded=1]="Unshaded",e[e.SphereEnvMap=2]="SphereEnvMap",e[e.TwoSided=16]="TwoSided",e[e.Unfogged=32]="Unfogged",e[e.NoDepthTest=64]="NoDepthTest",e[e.NoDepthSet=128]="NoDepthSet",e}({}),rn=function(e){return e[e.ConstantColor=1]="ConstantColor",e[e.SortPrimsFarZ=16]="SortPrimsFarZ",e[e.FullResolution=32]="FullResolution",e}({}),nn=function(e){return e[e.DropShadow=1]="DropShadow",e[e.Color=2]="Color",e}({}),Ne=function(e){return e[e.DontInheritTranslation=1]="DontInheritTranslation",e[e.DontInheritRotation=2]="DontInheritRotation",e[e.DontInheritScaling=4]="DontInheritScaling",e[e.Billboarded=8]="Billboarded",e[e.BillboardedLockX=16]="BillboardedLockX",e[e.BillboardedLockY=32]="BillboardedLockY",e[e.BillboardedLockZ=64]="BillboardedLockZ",e[e.CameraAnchored=128]="CameraAnchored",e}({}),ke=function(e){return e[e.Helper=0]="Helper",e[e.Bone=256]="Bone",e[e.Light=512]="Light",e[e.EventObject=1024]="EventObject",e[e.Attachment=2048]="Attachment",e[e.ParticleEmitter=4096]="ParticleEmitter",e[e.CollisionShape=8192]="CollisionShape",e[e.RibbonEmitter=16384]="RibbonEmitter",e}({}),ot=function(e){return e[e.Box=0]="Box",e[e.Sphere=2]="Sphere",e}({}),on=function(e){return e[e.EmitterUsesMDL=32768]="EmitterUsesMDL",e[e.EmitterUsesTGA=65536]="EmitterUsesTGA",e}({}),an=function(e){return e[e.Unshaded=32768]="Unshaded",e[e.SortPrimsFarZ=65536]="SortPrimsFarZ",e[e.LineEmitter=131072]="LineEmitter",e[e.Unfogged=262144]="Unfogged",e[e.ModelSpace=524288]="ModelSpace",e[e.XYQuad=1048576]="XYQuad",e}({}),sn=function(e){return e[e.Blend=0]="Blend",e[e.Additive=1]="Additive",e[e.Modulate=2]="Modulate",e[e.Modulate2x=3]="Modulate2x",e[e.AlphaKey=4]="AlphaKey",e}({}),at=function(e){return e[e.Head=1]="Head",e[e.Tail=2]="Tail",e}({}),ln=function(e){return e[e.Omnidirectional=0]="Omnidirectional",e[e.Directional=1]="Directional",e[e.Ambient=2]="Ambient",e}({}),_t=function(e){return e[e.Unshaded=32768]="Unshaded",e[e.SortPrimsFarZ=65536]="SortPrimsFarZ",e[e.Unfogged=262144]="Unfogged",e}({});var fn={TextureID:0,NormalTextureID:1,ORMTextureID:2,EmissiveTextureID:3,TeamColorTextureID:4,ReflectionsTextureID:5},Sr=["TextureID","NormalTextureID","ORMTextureID","EmissiveTextureID","TeamColorTextureID","ReflectionsTextureID"],un=class{constructor(e){this.str=e,this.pos=0}char(){return this.pos>=this.str.length&&$(this,"incorrect model data"),this.str[this.pos]}};function $(e,t=""){throw new Error(`SyntaxError, near ${e.pos}`+(t?", "+t:""))}function Xt(e){if(e.char()==="/"&&e.str[e.pos+1]==="/"){for(e.pos+=2;e.pos<e.str.length&&e.str[++e.pos]!==`
`;);return++e.pos,!0}return!1}var hn=/\s/i;function _e(e){for(;e.pos<e.str.length&&hn.test(e.char());)++e.pos}var cn=/[a-z]/i,dn=/[a-z0-9]/i;function N(e){if(!cn.test(e.char()))return null;let t=e.char();for(++e.pos;dn.test(e.char());)t+=e.str[e.pos++];return _e(e),t}function ee(e,t){e.char()===t&&(++e.pos,_e(e))}function v(e,t){e.char()!==t&&$(e,`extected ${t}`),++e.pos,_e(e)}function fe(e){if(e.char()==='"'){let t=++e.pos;for(;e.char()!=='"';)++e.pos;++e.pos;let n=e.str.substring(t,e.pos-1);return _e(e),n}return null}var gn=/[-0-9]/,pn=/[-+.0-9e]/i;function R(e){if(gn.test(e.char())){let t=e.pos;for(++e.pos;pn.test(e.char());)++e.pos;let n=parseFloat(e.str.substring(t,e.pos));return _e(e),n}return null}function ie(e,t,n){if(e.char()!=="{")return null;for(t||(t=[],n=0),v(e,"{");e.char()!=="}";){let r=R(e);r===null&&$(e,"expected number"),t[n++]=r,ee(e,",")}return v(e,"}"),t}function mn(e,t,n){if(e.char()!=="{")return 0;let r=n;for(v(e,"{");e.char()!=="}";){let i=R(e);i===null&&$(e,"expected number"),t[n++]=i,ee(e,",")}return v(e,"}"),n-r}function Ot(e,t){if(e.char()!=="{")return t[0]=R(e),t;let n=0;for(v(e,"{");e.char()!=="}";){let r=R(e);r===null&&$(e,"expected number"),t[n++]=r,ee(e,",")}return v(e,"}"),t}function ut(e){let t=null,n={};for(e.char()!=="{"&&(t=fe(e),t===null&&(t=R(e)),t===null&&$(e,"expected string or number")),v(e,"{");e.char()!=="}";){let r=N(e);r||$(e),r==="Interval"?n[r]=ie(e,new Uint32Array(2),0):r==="MinimumExtent"||r==="MaximumExtent"?n[r]=ie(e,new Float32Array(3),0):(n[r]=ie(e)||fe(e),n[r]===null&&(n[r]=R(e))),ee(e,",")}return v(e,"}"),[t,n]}function vn(e,t){let[n,r]=ut(e);r.FormatVersion&&(t.Version=r.FormatVersion)}function bn(e,t){let[n,r]=ut(e);t.Info=r,t.Info.Name=n}function Tn(e,t){R(e),v(e,"{");let n=[];for(;e.char()!=="}";){N(e);let[r,i]=ut(e);i.Name=r,i.NonLooping="NonLooping"in i,i.MoveSpeed=i.MoveSpeed||0,i.Rarity=i.Rarity||0,n.push(i)}v(e,"}"),t.Sequences=n}function xn(e,t){let n=[];for(R(e),v(e,"{");e.char()!=="}";){N(e);let[r,i]=ut(e);i.Flags=0,"WrapWidth"in i&&(i.Flags+=Pr.WrapWidth,delete i.WrapWidth),"WrapHeight"in i&&(i.Flags+=Pr.WrapHeight,delete i.WrapHeight),n.push(i)}v(e,"}"),t.Textures=n}var k=function(e){return e[e.INT1=0]="INT1",e[e.FLOAT1=1]="FLOAT1",e[e.FLOAT3=2]="FLOAT3",e[e.FLOAT4=3]="FLOAT4",e}(k||{}),An={[k.INT1]:1,[k.FLOAT1]:1,[k.FLOAT3]:3,[k.FLOAT4]:4};function yn(e,t,n,r){let i={Frame:t,Vector:null},a=n===k.INT1?Int32Array:Float32Array,o=An[n];return i.Vector=Ot(e,new a(o)),v(e,","),(r===Ye.Hermite||r===Ye.Bezier)&&(N(e),i.InTan=Ot(e,new a(o)),v(e,","),N(e),i.OutTan=Ot(e,new a(o)),v(e,",")),i}function ae(e,t){let n={LineType:Ye.DontInterp,GlobalSeqId:null,Keys:[]};R(e),v(e,"{");let r=N(e);for((r==="DontInterp"||r==="Linear"||r==="Hermite"||r==="Bezier")&&(n.LineType=Ye[r]),v(e,",");e.char()!=="}";){let i=N(e);if(i==="GlobalSeqId")n[i]=R(e),v(e,",");else{let a=R(e);a===null&&$(e,"expected frame number or GlobalSeqId"),v(e,":"),n.Keys.push(yn(e,a,t,n.LineType))}}return v(e,"}"),n}function Pn(e,t){let n={Alpha:null,TVertexAnimId:null,Shading:0,CoordId:0};for(v(e,"{");e.char()!=="}";){let r=N(e),i=!1;if(r||$(e),r==="static"&&(i=!0,r=N(e)),!i&&(r==="TextureID"||t.Version>=1100&&r in fn))n[r]=ae(e,k.INT1);else if(!i&&r==="Alpha")n[r]=ae(e,k.FLOAT1);else if(r==="Unshaded"||r==="SphereEnvMap"||r==="TwoSided"||r==="Unfogged"||r==="NoDepthTest"||r==="NoDepthSet")n.Shading|=tn[r];else if(r==="FilterMode"){let a=N(e);(a==="None"||a==="Transparent"||a==="Blend"||a==="Additive"||a==="AddAlpha"||a==="Modulate"||a==="Modulate2x")&&(n.FilterMode=en[a])}else if(r==="TVertexAnimId")n.TVertexAnimId=R(e);else if(t.Version>=900&&r==="EmissiveGain")i?n[r]=R(e):n[r]=ae(e,k.FLOAT1);else if(t.Version>=1e3&&r==="FresnelColor")i?n[r]=ie(e,new Float32Array(3),0):n[r]=ae(e,k.FLOAT3);else if(t.Version>=1e3&&(r==="FresnelOpacity"||r==="FresnelTeamColor"))i?n[r]=R(e):n[r]=ae(e,k.FLOAT1);else{let a=R(e);a===null&&(a=N(e)),n[r]=a}ee(e,","),Xt(e),_e(e)}return v(e,"}"),n}function Sn(e,t){let n=[];for(R(e),v(e,"{");e.char()!=="}";){let r={RenderMode:0,Layers:[]};for(N(e),v(e,"{");e.char()!=="}";){let i=N(e);if(i||$(e),i==="Layer")r.Layers.push(Pn(e,t));else if(i==="PriorityPlane"||i==="RenderMode")r[i]=R(e);else if(i==="ConstantColor"||i==="SortPrimsFarZ"||i==="FullResolution")r.RenderMode|=rn[i];else if(t.Version>=900&&t.Version<=1100&&i==="Shader")r[i]=fe(e);else throw new Error("Unknown material property "+i);ee(e,",")}v(e,"}"),n.push(r)}v(e,"}"),t.Materials=n}var st=function(e){return e[e.INT=0]="INT",e[e.FLOAT=1]="FLOAT",e}(st||{});function Nt(e,t,n){let r=R(e),i=new(n===st.FLOAT?Float32Array:Uint8Array)(r*t);v(e,"{");for(let a=0;a<r;++a)ie(e,i,a*t),v(e,",");return v(e,"}"),i}function En(e,t){let n={Vertices:null,Normals:null,TVertices:[],VertexGroup:new Uint8Array(0),Faces:null,Groups:null,TotalGroupsCount:null,MinimumExtent:null,MaximumExtent:null,BoundsRadius:0,Anims:[],MaterialID:null,SelectionGroup:null,Unselectable:!1};for(v(e,"{");e.char()!=="}";){let r=N(e);if(r||$(e),r==="Vertices"||r==="Normals"||r==="TVertices"){let i=3;r==="TVertices"&&(i=2);let a=Nt(e,i,st.FLOAT);r==="TVertices"?n.TVertices.push(a):n[r]=a}else if(r==="VertexGroup")n[r]=new Uint8Array(n.Vertices.length/3),ie(e,n[r],0);else if(r==="Faces"){let i=R(e),a=R(e),o=0;n.Faces=new Uint16Array(a),v(e,"{"),N(e)!=="Triangles"&&$(e,"unexpected faces type"),v(e,"{");for(let s=0;s<i;++s){let f=mn(e,n.Faces,o);f||$(e,"expected array"),o+=f,ee(e,",")}(o!==a||a%3!==0)&&$(e,"mismatched faces array"),v(e,"}"),v(e,"}")}else if(r==="Groups"){let i=[];for(R(e),n.TotalGroupsCount=R(e),v(e,"{");e.char()!=="}";)N(e),i.push(ie(e)),ee(e,",");v(e,"}"),n.Groups=i}else if(r==="MinimumExtent"||r==="MaximumExtent")n[r]=ie(e,new Float32Array(3),0),v(e,",");else if(r==="BoundsRadius"||r==="MaterialID"||r==="SelectionGroup")n[r]=R(e),v(e,",");else if(r==="Anim"){let[i,a]=ut(e);a.Alpha===void 0&&(a.Alpha=1),n.Anims.push(a)}else r==="Unselectable"?(n.Unselectable=!0,v(e,",")):t.Version>=900&&(r==="LevelOfDetail"?(n.LevelOfDetail=R(e),v(e,",")):r==="Name"?(n.Name=fe(e),v(e,",")):r==="Tangents"?n.Tangents=Nt(e,4,st.FLOAT):r==="SkinWeights"&&(n.SkinWeights=Nt(e,8,st.INT)))}v(e,"}"),t.Geosets.push(n)}function Ln(e,t){let n={GeosetId:-1,Alpha:1,Color:null,Flags:0};for(v(e,"{");e.char()!=="}";){let r=N(e),i=!1;if(r||$(e),r==="static"&&(i=!0,r=N(e)),r==="Alpha")i?n.Alpha=R(e):n.Alpha=ae(e,k.FLOAT1);else if(r==="Color")if(i)n.Color=ie(e,new Float32Array(3),0),n.Color.reverse();else{n.Color=ae(e,k.FLOAT3);for(let a of n.Color.Keys)a.Vector.reverse(),a.InTan&&(a.InTan.reverse(),a.OutTan.reverse())}else r==="DropShadow"?n.Flags|=nn[r]:n[r]=R(e);ee(e,",")}v(e,"}"),t.GeosetAnims.push(n)}function Wt(e,t,n){let r={Name:fe(e),ObjectId:null,Parent:null,PivotPoint:null,Flags:ke[t]};for(v(e,"{");e.char()!=="}";){let i=N(e);if(i||$(e),i==="Translation"||i==="Rotation"||i==="Scaling"||i==="Visibility"){let a=k.FLOAT3;i==="Rotation"?a=k.FLOAT4:i==="Visibility"&&(a=k.FLOAT1),r[i]=ae(e,a)}else if(i==="BillboardedLockZ"||i==="BillboardedLockY"||i==="BillboardedLockX"||i==="Billboarded"||i==="CameraAnchored")r.Flags|=Ne[i];else if(i==="DontInherit"){v(e,"{");let a=N(e);a==="Translation"?r.Flags|=Ne.DontInheritTranslation:a==="Rotation"?r.Flags|=Ne.DontInheritRotation:a==="Scaling"&&(r.Flags|=Ne.DontInheritScaling),v(e,"}")}else if(i==="Path")r[i]=fe(e);else{let a=N(e)||R(e);(i==="GeosetId"&&a==="Multiple"||i==="GeosetAnimId"&&a==="None")&&(a=null),r[i]=a}ee(e,","),Xt(e),_e(e)}return v(e,"}"),n.Nodes[r.ObjectId]=r,r}function Fn(e,t){let n=Wt(e,"Bone",t);t.Bones.push(n)}function Un(e,t){let n=Wt(e,"Helper",t);t.Helpers.push(n)}function Cn(e,t){let n=Wt(e,"Attachment",t);t.Attachments.push(n)}function Mn(e,t){let n=R(e),r=[];v(e,"{");for(let i=0;i<n;++i)r.push(ie(e,new Float32Array(3),0)),v(e,",");v(e,"}"),t.PivotPoints=r}function Bn(e,t){let n={Name:fe(e),ObjectId:null,Parent:null,PivotPoint:null,EventTrack:null,Flags:ke.EventObject};for(v(e,"{");e.char()!=="}";){let r=N(e);if(r||$(e),r==="EventTrack"){let i=R(e);n.EventTrack=ie(e,new Uint32Array(i),0)}else r==="Translation"||r==="Rotation"||r==="Scaling"?n[r]=ae(e,r==="Rotation"?k.FLOAT4:k.FLOAT3):n[r]=R(e);ee(e,",")}v(e,"}"),t.EventObjects.push(n),t.Nodes[n.ObjectId]=n}function Vn(e,t){let n={Name:fe(e),ObjectId:null,Parent:null,PivotPoint:null,Shape:ot.Box,Vertices:null,Flags:ke.CollisionShape};for(v(e,"{");e.char()!=="}";){let r=N(e);if(r||$(e),r==="Sphere")n.Shape=ot.Sphere;else if(r==="Box")n.Shape=ot.Box;else if(r==="Vertices"){let i=R(e),a=new Float32Array(i*3);v(e,"{");for(let o=0;o<i;++o)ie(e,a,o*3),v(e,",");v(e,"}"),n.Vertices=a}else r==="Translation"||r==="Rotation"||r==="Scaling"?n[r]=ae(e,r==="Rotation"?k.FLOAT4:k.FLOAT3):n[r]=R(e);ee(e,",")}v(e,"}"),t.CollisionShapes.push(n),t.Nodes[n.ObjectId]=n}function wn(e,t){let n=[],r=R(e);v(e,"{");for(let i=0;i<r;++i)N(e)==="Duration"&&n.push(R(e)),ee(e,",");v(e,"}"),t.GlobalSequences=n}function Dn(e){let t;for(;e.char()!==void 0&&e.char()!=="{";)++e.pos;for(t=1,++e.pos;e.char()!==void 0&&t>0;)e.char()==="{"?++t:e.char()==="}"&&--t,++e.pos;_e(e)}function Rn(e,t){let n={ObjectId:null,Parent:null,Name:null,Flags:0};for(n.Name=fe(e),v(e,"{");e.char()!=="}";){let r=N(e),i=!1;if(r||$(e),r==="static"&&(i=!0,r=N(e)),r==="ObjectId"||r==="Parent")n[r]=R(e);else if(r==="EmitterUsesMDL"||r==="EmitterUsesTGA")n.Flags|=on[r];else if(!i&&(r==="Visibility"||r==="Translation"||r==="Rotation"||r==="Scaling"||r==="EmissionRate"||r==="Gravity"||r==="Longitude"||r==="Latitude")){let a=k.FLOAT3;r==="Visibility"||r==="EmissionRate"||r==="Gravity"||r==="Longitude"||r==="Latitude"?a=k.FLOAT1:r==="Rotation"&&(a=k.FLOAT4),n[r]=ae(e,a)}else if(r==="Particle"){for(v(e,"{");e.char()!=="}";){let a=N(e),o=!1;a==="static"&&(o=!0,a=N(e)),!o&&(a==="LifeSpan"||a==="InitVelocity")?n[a]=ae(e,k.FLOAT1):a==="LifeSpan"||a==="InitVelocity"?n[a]=R(e):a==="Path"&&(n.Path=fe(e)),ee(e,",")}v(e,"}")}else n[r]=R(e);ee(e,",")}v(e,"}"),t.ParticleEmitters.push(n)}function In(e,t){let n={Name:fe(e),ObjectId:null,Parent:null,PivotPoint:null,Flags:ke.ParticleEmitter,FrameFlags:0};for(v(e,"{");e.char()!=="}";){let r=N(e),i=!1;if(r||$(e),r==="static"&&(i=!0,r=N(e)),!i&&(r==="Speed"||r==="Latitude"||r==="Visibility"||r==="EmissionRate"||r==="Width"||r==="Length"||r==="Translation"||r==="Rotation"||r==="Scaling"||r==="Gravity"||r==="Variation")){let a=k.FLOAT3;switch(r){case"Rotation":a=k.FLOAT4;break;case"Speed":case"Latitude":case"Visibility":case"EmissionRate":case"Width":case"Length":case"Gravity":case"Variation":a=k.FLOAT1;break}n[r]=ae(e,a)}else if(r==="Variation"||r==="Gravity"||r==="ReplaceableId"||r==="PriorityPlane")n[r]=R(e);else if(r==="SortPrimsFarZ"||r==="Unshaded"||r==="LineEmitter"||r==="Unfogged"||r==="ModelSpace"||r==="XYQuad")n.Flags|=an[r];else if(r==="Both")n.FrameFlags|=at.Head|at.Tail;else if(r==="Head"||r==="Tail")n.FrameFlags|=at[r];else if(r==="Squirt")n[r]=!0;else if(r==="DontInherit"){v(e,"{");let a=N(e);a==="Translation"?n.Flags|=Ne.DontInheritTranslation:a==="Rotation"?n.Flags|=Ne.DontInheritRotation:a==="Scaling"&&(n.Flags|=Ne.DontInheritScaling),v(e,"}")}else if(r==="SegmentColor"){let a=[];for(v(e,"{");e.char()!=="}";){N(e);let o=new Float32Array(3);ie(e,o,0);let s=o[0];o[0]=o[2],o[2]=s,a.push(o),ee(e,",")}v(e,"}"),n.SegmentColor=a}else r==="Alpha"?(n.Alpha=new Uint8Array(3),ie(e,n.Alpha,0)):r==="ParticleScaling"?(n[r]=new Float32Array(3),ie(e,n[r],0)):r==="LifeSpanUVAnim"||r==="DecayUVAnim"||r==="TailUVAnim"||r==="TailDecayUVAnim"?(n[r]=new Uint32Array(3),ie(e,n[r],0)):r==="Transparent"||r==="Blend"||r==="Additive"||r==="AlphaKey"||r==="Modulate"||r==="Modulate2x"?n.FilterMode=sn[r]:n[r]=R(e);ee(e,",")}v(e,"}"),t.ParticleEmitters2.push(n),t.Nodes[n.ObjectId]=n}function Gn(e,t){let n={Name:null,Position:null,FieldOfView:0,NearClip:0,FarClip:0,TargetPosition:null};for(n.Name=fe(e),v(e,"{");e.char()!=="}";){let r=N(e);if(r||$(e),r==="Position")n.Position=new Float32Array(3),ie(e,n.Position,0);else if(r==="FieldOfView"||r==="NearClip"||r==="FarClip")n[r]=R(e);else if(r==="Target"){for(v(e,"{");e.char()!=="}";){let i=N(e);i==="Position"?(n.TargetPosition=new Float32Array(3),ie(e,n.TargetPosition,0)):i==="Translation"&&(n.TargetTranslation=ae(e,k.FLOAT3)),ee(e,",")}v(e,"}")}else(r==="Translation"||r==="Rotation")&&(n[r]=ae(e,r==="Rotation"?k.FLOAT1:k.FLOAT3));ee(e,",")}v(e,"}"),t.Cameras.push(n)}function _n(e,t){let n={Name:fe(e),ObjectId:null,Parent:null,PivotPoint:null,Flags:ke.Light,LightType:0};for(v(e,"{");e.char()!=="}";){let r=N(e),i=!1;if(r||$(e),r==="static"&&(i=!0,r=N(e)),!i&&(r==="Visibility"||r==="Color"||r==="Intensity"||r==="AmbIntensity"||r==="AmbColor"||r==="Translation"||r==="Rotation"||r==="Scaling"||r==="AttenuationStart"||r==="AttenuationEnd")){let a=k.FLOAT3;switch(r){case"Rotation":a=k.FLOAT4;break;case"Visibility":case"Intensity":case"AmbIntensity":case"AttenuationStart":case"AttenuationEnd":a=k.FLOAT1;break}if(n[r]=ae(e,a),r==="Color"||r==="AmbColor")for(let o of n[r].Keys)o.Vector.reverse(),o.InTan&&(o.InTan.reverse(),o.OutTan.reverse())}else if(r==="Omnidirectional"||r==="Directional"||r==="Ambient")n.LightType=ln[r];else if(r==="Color"||r==="AmbColor"){let a=new Float32Array(3);ie(e,a,0);let o=a[0];a[0]=a[2],a[2]=o,n[r]=a}else n[r]=R(e);ee(e,",")}v(e,"}"),t.Lights.push(n),t.Nodes[n.ObjectId]=n}function On(e,t){let n=[];for(R(e),v(e,"{");e.char()!=="}";){let r={};for(N(e),v(e,"{");e.char()!=="}";){let i=N(e);if(i||$(e),i==="Translation"||i==="Rotation"||i==="Scaling")r[i]=ae(e,i==="Rotation"?k.FLOAT4:k.FLOAT3);else throw new Error("Unknown texture anim property "+i);ee(e,",")}v(e,"}"),n.push(r)}v(e,"}"),t.TextureAnims=n}function Nn(e,t){let n={Name:fe(e),ObjectId:null,Parent:null,PivotPoint:null,Flags:ke.RibbonEmitter,HeightAbove:null,HeightBelow:null,Alpha:null,Color:null,LifeSpan:null,TextureSlot:null,EmissionRate:null,Rows:null,Columns:null,MaterialID:0,Gravity:null,Visibility:null};for(v(e,"{");e.char()!=="}";){let r=N(e),i=!1;if(r||$(e),r==="static"&&(i=!0,r=N(e)),!i&&(r==="Visibility"||r==="HeightAbove"||r==="HeightBelow"||r==="Translation"||r==="Rotation"||r==="Scaling"||r==="Alpha"||r==="TextureSlot")){let a=k.FLOAT3;switch(r){case"Rotation":a=k.FLOAT4;break;case"Visibility":case"HeightAbove":case"HeightBelow":case"Alpha":a=k.FLOAT1;break;case"TextureSlot":a=k.INT1;break}n[r]=ae(e,a)}else if(r==="Color"){let a=new Float32Array(3);ie(e,a,0);let o=a[0];a[0]=a[2],a[2]=o,n[r]=a}else n[r]=R(e);ee(e,",")}v(e,"}"),t.RibbonEmitters.push(n),t.Nodes[n.ObjectId]=n}function kn(e,t){t.Version<900&&$(e,"Unexpected model chunk FaceFX");let n={Name:fe(e),Path:""};for(v(e,"{");e.char()!=="}";){let r=N(e);r||$(e),r==="Path"&&(n.Path=fe(e)),ee(e,",")}v(e,"}"),t.FaceFX=t.FaceFX||[],t.FaceFX.push(n)}function zn(e,t){t.Version<900&&$(e,"Unexpected model chunk BindPose");let n={Matrices:[]};v(e,"{"),N(e);let r=R(e);v(e,"{");for(let i=0;i<r;++i){let a=new Float32Array(12);ie(e,a,0),ee(e,","),n.Matrices.push(a)}v(e,"}"),v(e,"}"),t.BindPoses=t.BindPoses||[],t.BindPoses.push(n)}function Hn(e,t){t.Version<900&&$(e,"Unexpected model chunk ParticleEmitterPopcorn");let n={Name:fe(e),ObjectId:null,Parent:null,PivotPoint:null,Flags:ke.ParticleEmitter};for(v(e,"{");e.char()!=="}";){let r=N(e),i=!1;if(r||$(e),r==="static"&&(i=!0,r=N(e)),!i&&(r==="LifeSpan"||r==="EmissionRate"||r==="Speed"||r==="Color"||r==="Alpha"||r==="Visibility"||r==="Rotation"||r==="Scaling"||r==="Translation")){let a=k.FLOAT3;switch(r){case"LifeSpan":case"EmissionRate":case"Speed":case"Alpha":case"Visibility":a=k.FLOAT1;break}n[r]=ae(e,a)}else r==="LifeSpan"||r==="EmissionRate"||r==="Speed"||r==="Alpha"?n[r]=R(e):r==="Color"?n[r]=ie(e,new Float32Array(3),0):r==="ReplaceableId"?n[r]=R(e):r==="Path"||r==="AnimVisibilityGuide"?n[r]=fe(e):r==="Unshaded"||r==="SortPrimsFarZ"||r==="Unfogged"?r==="Unshaded"?n.Flags|=_t.Unshaded:r==="Unfogged"?n.Flags|=_t.Unfogged:r==="SortPrimsFarZ"&&(n.Flags|=_t.SortPrimsFarZ):n[r]=R(e);ee(e,",")}v(e,"}"),t.ParticleEmitterPopcorns=t.ParticleEmitterPopcorns||[],t.ParticleEmitterPopcorns.push(n),t.Nodes[n.ObjectId]=n}var Er={Version:vn,Model:bn,Sequences:Tn,Textures:xn,Materials:Sn,Geoset:En,GeosetAnim:Ln,Bone:Fn,Helper:Un,Attachment:Cn,PivotPoints:Mn,EventObject:Bn,CollisionShape:Vn,GlobalSequences:wn,ParticleEmitter:Rn,ParticleEmitter2:In,Camera:Gn,Light:_n,TextureAnims:On,RibbonEmitter:Nn,FaceFX:kn,BindPose:zn,ParticleEmitterPopcorn:Hn};function Fr(e){let t=new un(e),n={Version:800,Info:{Name:"",MinimumExtent:null,MaximumExtent:null,BoundsRadius:0,BlendTime:150},Sequences:[],GlobalSequences:[],Textures:[],Materials:[],TextureAnims:[],Geosets:[],GeosetAnims:[],Bones:[],Helpers:[],Attachments:[],EventObjects:[],ParticleEmitters:[],ParticleEmitters2:[],Cameras:[],Lights:[],RibbonEmitters:[],CollisionShapes:[],PivotPoints:[],Nodes:[]};for(;t.pos<t.str.length;){for(;Xt(t););let r=N(t);if(r)r in Er?Er[r](t,n):Dn(t);else break}for(let r=0;r<n.Nodes.length;++r)n.PivotPoints[r]&&(n.Nodes[r].PivotPoint=n.PivotPoints[r]);return n}var kt=!0,Ge=-1,U=function(e){return e[e.INT1=0]="INT1",e[e.FLOAT1=1]="FLOAT1",e[e.FLOAT3=2]="FLOAT3",e[e.FLOAT4=3]="FLOAT4",e}(U||{}),Xn={[U.INT1]:1,[U.FLOAT1]:1,[U.FLOAT3]:3,[U.FLOAT4]:4},Wn=class{constructor(e){this.ab=e,this.pos=0,this.length=e.byteLength,this.view=new DataView(this.ab),this.uint=new Uint8Array(this.ab)}keyword(){let e=String.fromCharCode(this.uint[this.pos],this.uint[this.pos+1],this.uint[this.pos+2],this.uint[this.pos+3]);return this.pos+=4,e}expectKeyword(e,t){if(this.keyword()!==e)throw new Error(t)}uint8(){return this.view.getUint8(this.pos++)}uint16(){let e=this.view.getUint16(this.pos,kt);return this.pos+=2,e}int32(){let e=this.view.getInt32(this.pos,kt);return this.pos+=4,e}float32(){let e=this.view.getFloat32(this.pos,kt);return this.pos+=4,e}float32Array(e){let t=new Float32Array(e);for(let n=0;n<e;++n)t[n]=this.float32();return t}uint8Array(e){let t=new Uint8Array(e);for(let n=0;n<e;++n)t[n]=this.uint8();return t}str(e){let t=e;for(;this.uint[this.pos+t-1]===0&&t>0;)--t;let n=String.fromCharCode.apply(String,this.uint.slice(this.pos,this.pos+t));return this.pos+=e,n}animVector(e){let t={Keys:[]},n=e===U.INT1,r=Xn[e],i=this.int32();t.LineType=this.int32(),t.GlobalSeqId=this.int32(),t.GlobalSeqId===Ge&&(t.GlobalSeqId=null);for(let a=0;a<i;++a){let o={};o.Frame=this.int32(),n?o.Vector=new Int32Array(r):o.Vector=new Float32Array(r);for(let s=0;s<r;++s)n?o.Vector[s]=this.int32():o.Vector[s]=this.float32();if(t.LineType===Ye.Hermite||t.LineType===Ye.Bezier)for(let s of["InTan","OutTan"]){o[s]=new Float32Array(r);for(let f=0;f<r;++f)n?o[s][f]=this.int32():o[s][f]=this.float32()}t.Keys.push(o)}return t}};function yt(e,t){e.BoundsRadius=t.float32();for(let n of["MinimumExtent","MaximumExtent"]){e[n]=new Float32Array(3);for(let r=0;r<3;++r)e[n][r]=t.float32()}}function qn(e,t){e.Version=t.int32()}var Kn=336;function $n(e,t){e.Info.Name=t.str(Kn),t.int32(),yt(e.Info,t),e.Info.BlendTime=t.int32()}var Yn=80;function jn(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i=t.str(Yn),a={};a.Name=i;let o=new Uint32Array(2);o[0]=t.int32(),o[1]=t.int32(),a.Interval=o,a.MoveSpeed=t.float32(),a.NonLooping=t.int32()>0,a.Rarity=t.float32(),t.int32(),yt(a,t),e.Sequences.push(a)}}function Zn(e,t,n){let r=t.pos;for(;t.pos<r+n;){t.int32();let i={Layers:[]};i.PriorityPlane=t.int32(),i.RenderMode=t.int32(),e.Version>=900&&e.Version<1100&&(i.Shader=t.str(80)),t.expectKeyword("LAYS","Incorrect materials format");let a=t.int32();for(let o=0;o<a;++o){let s=t.pos,f=t.int32(),l={};if(l.FilterMode=t.int32(),l.Shading=t.int32(),l.TextureID=t.int32(),l.TVertexAnimId=t.int32(),l.TVertexAnimId===Ge&&(l.TVertexAnimId=null),l.CoordId=t.int32(),l.Alpha=t.float32(),e.Version>=900&&(l.EmissiveGain=t.float32(),e.Version>=1e3&&(l.FresnelColor=t.float32Array(3),l.FresnelOpacity=t.float32(),l.FresnelTeamColor=t.float32())),e.Version>=1100){l.ShaderTypeId=t.int32();let c=t.int32();for(let T=0;T<c;++T){let P=t.int32();t.int32();let V=T;t.keyword()==="KMTF"?l[Sr[V]]=t.animVector(U.INT1):(l[Sr[V]]=P,t.pos-=4)}}for(;t.pos<s+f;){let c=t.keyword();if(c==="KMTA")l.Alpha=t.animVector(U.FLOAT1);else if(c==="KMTF")l.TextureID=t.animVector(U.INT1);else if(c==="KMTE"&&e.Version>=900)l.EmissiveGain=t.animVector(U.FLOAT1);else if(c==="KFC3"&&e.Version>=1e3)l.FresnelColor=t.animVector(U.FLOAT3);else if(c==="KFCA"&&e.Version>=1e3)l.FresnelOpacity=t.animVector(U.FLOAT1);else if(c==="KFTC"&&e.Version>=1e3)l.FresnelTeamColor=t.animVector(U.FLOAT1);else throw new Error("Unknown layer chunk data "+c)}i.Layers.push(l)}e.Materials.push(i)}}var Qn=256;function Jn(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i={};i.ReplaceableId=t.int32(),i.Image=t.str(Qn),t.int32(),i.Flags=t.int32(),e.Textures.push(i)}}function ei(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i={};t.int32(),t.expectKeyword("VRTX","Incorrect geosets format");let a=t.int32();i.Vertices=new Float32Array(a*3);for(let m=0;m<a*3;++m)i.Vertices[m]=t.float32();t.expectKeyword("NRMS","Incorrect geosets format");let o=t.int32();i.Normals=new Float32Array(o*3);for(let m=0;m<o*3;++m)i.Normals[m]=t.float32();t.expectKeyword("PTYP","Incorrect geosets format");let s=t.int32();for(let m=0;m<s;++m)if(t.int32()!==4)throw new Error("Incorrect geosets format");t.expectKeyword("PCNT","Incorrect geosets format");let f=t.int32();for(let m=0;m<f;++m)t.int32();t.expectKeyword("PVTX","Incorrect geosets format");let l=t.int32();i.Faces=new Uint16Array(l);for(let m=0;m<l;++m)i.Faces[m]=t.uint16();t.expectKeyword("GNDX","Incorrect geosets format");let c=t.int32();i.VertexGroup=new Uint8Array(c);for(let m=0;m<c;++m)i.VertexGroup[m]=t.uint8();t.expectKeyword("MTGC","Incorrect geosets format");let T=t.int32();i.Groups=[];for(let m=0;m<T;++m)i.Groups[m]=new Array(t.int32());t.expectKeyword("MATS","Incorrect geosets format"),i.TotalGroupsCount=t.int32();let P=0,V=0;for(let m=0;m<i.TotalGroupsCount;++m)P>=i.Groups[V].length&&(P=0,V++),i.Groups[V][P++]=t.int32();i.MaterialID=t.int32(),i.SelectionGroup=t.int32(),i.Unselectable=t.int32()>0,e.Version>=900&&(i.LevelOfDetail=t.int32(),i.Name=t.str(80)),yt(i,t);let I=t.int32();i.Anims=[];for(let m=0;m<I;++m){let x={};yt(x,t),i.Anims.push(x)}let w=t.keyword();if(e.Version>=900)for(;;){if(t.pos>=t.length)throw new Error("Unexpected EOF");if(w==="TANG"){if(i.Tangents)throw new Error("Incorrect geoset, multiple Tangents");let m=t.int32();i.Tangents=t.float32Array(m*4)}else if(w==="SKIN"){if(i.SkinWeights)throw new Error("Incorrect geoset, multiple SkinWeights");let m=t.int32();i.SkinWeights=t.uint8Array(m)}else if(w==="UVAS")break;w=t.keyword()}else if(w!=="UVAS")throw new Error("Incorrect geosets format");let _=t.int32();i.TVertices=[];for(let m=0;m<_;++m){t.expectKeyword("UVBS","Incorrect geosets format");let x=t.int32(),u=new Float32Array(x*2);for(let M=0;M<x*2;++M)u[M]=t.float32();i.TVertices.push(u)}e.Geosets.push(i)}}function ti(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i=t.pos,a=t.int32(),o={};o.Alpha=t.float32(),o.Flags=t.int32(),o.Color=new Float32Array(3);for(let s=0;s<3;++s)o.Color[s]=t.float32();for(o.GeosetId=t.int32(),o.GeosetId===Ge&&(o.GeosetId=null);t.pos<i+a;){let s=t.keyword();if(s==="KGAO")o.Alpha=t.animVector(U.FLOAT1);else if(s==="KGAC")o.Color=t.animVector(U.FLOAT3);else throw new Error("Incorrect GeosetAnim chunk data "+s)}e.GeosetAnims.push(o)}}var ri=80;function Be(e,t,n){let r=n.pos,i=n.int32();for(t.Name=n.str(ri),t.ObjectId=n.int32(),t.ObjectId===Ge&&(t.ObjectId=null),t.Parent=n.int32(),t.Parent===Ge&&(t.Parent=null),t.Flags=n.int32();n.pos<r+i;){let a=n.keyword();if(a==="KGTR")t.Translation=n.animVector(U.FLOAT3);else if(a==="KGRT")t.Rotation=n.animVector(U.FLOAT4);else if(a==="KGSC")t.Scaling=n.animVector(U.FLOAT3);else throw new Error("Incorrect node chunk data "+a)}e.Nodes[t.ObjectId]=t}function ni(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i={};Be(e,i,t),i.GeosetId=t.int32(),i.GeosetId===Ge&&(i.GeosetId=null),i.GeosetAnimId=t.int32(),i.GeosetAnimId===Ge&&(i.GeosetAnimId=null),e.Bones.push(i)}}function ii(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i={};Be(e,i,t),e.Helpers.push(i)}}var oi=256;function ai(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i=t.pos,a=t.int32(),o={};Be(e,o,t),o.Path=t.str(oi),t.int32(),o.AttachmentID=t.int32(),t.pos<i+a&&(t.expectKeyword("KATV","Incorrect attachment chunk data"),o.Visibility=t.animVector(U.FLOAT1)),e.Attachments.push(o)}}function si(e,t,n){let r=n/12;for(let i=0;i<r;++i)e.PivotPoints[i]=new Float32Array(3),e.PivotPoints[i][0]=t.float32(),e.PivotPoints[i][1]=t.float32(),e.PivotPoints[i][2]=t.float32()}function li(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i={};Be(e,i,t),t.expectKeyword("KEVT","Incorrect EventObject chunk data");let a=t.int32();i.EventTrack=new Uint32Array(a),t.int32();for(let o=0;o<a;++o)i.EventTrack[o]=t.int32();e.EventObjects.push(i)}}function fi(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i={};Be(e,i,t),i.Shape=t.int32(),i.Shape===ot.Box?i.Vertices=new Float32Array(6):i.Vertices=new Float32Array(3);for(let a=0;a<i.Vertices.length;++a)i.Vertices[a]=t.float32();i.Shape===ot.Sphere&&(i.BoundsRadius=t.float32()),e.CollisionShapes.push(i)}}function ui(e,t,n){let r=t.pos;for(e.GlobalSequences=[];t.pos<r+n;)e.GlobalSequences.push(t.int32())}var hi=256;function ci(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i=t.pos,a=t.int32(),o={};for(Be(e,o,t),o.EmissionRate=t.float32(),o.Gravity=t.float32(),o.Longitude=t.float32(),o.Latitude=t.float32(),o.Path=t.str(hi),t.int32(),o.LifeSpan=t.float32(),o.InitVelocity=t.float32();t.pos<i+a;){let s=t.keyword();if(s==="KPEV")o.Visibility=t.animVector(U.FLOAT1);else if(s==="KPEE")o.EmissionRate=t.animVector(U.FLOAT1);else if(s==="KPEG")o.Gravity=t.animVector(U.FLOAT1);else if(s==="KPLN")o.Longitude=t.animVector(U.FLOAT1);else if(s==="KPLT")o.Latitude=t.animVector(U.FLOAT1);else if(s==="KPEL")o.LifeSpan=t.animVector(U.FLOAT1);else if(s==="KPES")o.InitVelocity=t.animVector(U.FLOAT1);else throw new Error("Incorrect particle emitter chunk data "+s)}e.ParticleEmitters.push(o)}}function di(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i=t.pos,a=t.int32(),o={};Be(e,o,t),o.Speed=t.float32(),o.Variation=t.float32(),o.Latitude=t.float32(),o.Gravity=t.float32(),o.LifeSpan=t.float32(),o.EmissionRate=t.float32(),o.Width=t.float32(),o.Length=t.float32(),o.FilterMode=t.int32(),o.Rows=t.int32(),o.Columns=t.int32();let s=t.int32();o.FrameFlags=0,(s===0||s===2)&&(o.FrameFlags|=at.Head),(s===1||s===2)&&(o.FrameFlags|=at.Tail),o.TailLength=t.float32(),o.Time=t.float32(),o.SegmentColor=[];for(let f=0;f<3;++f){o.SegmentColor[f]=new Float32Array(3);for(let l=0;l<3;++l)o.SegmentColor[f][l]=t.float32()}o.Alpha=new Uint8Array(3);for(let f=0;f<3;++f)o.Alpha[f]=t.uint8();o.ParticleScaling=new Float32Array(3);for(let f=0;f<3;++f)o.ParticleScaling[f]=t.float32();for(let f of["LifeSpanUVAnim","DecayUVAnim","TailUVAnim","TailDecayUVAnim"]){o[f]=new Uint32Array(3);for(let l=0;l<3;++l)o[f][l]=t.int32()}for(o.TextureID=t.int32(),o.TextureID===Ge&&(o.TextureID=null),o.Squirt=t.int32()>0,o.PriorityPlane=t.int32(),o.ReplaceableId=t.int32();t.pos<i+a;){let f=t.keyword();if(f==="KP2V")o.Visibility=t.animVector(U.FLOAT1);else if(f==="KP2E")o.EmissionRate=t.animVector(U.FLOAT1);else if(f==="KP2W")o.Width=t.animVector(U.FLOAT1);else if(f==="KP2N")o.Length=t.animVector(U.FLOAT1);else if(f==="KP2S")o.Speed=t.animVector(U.FLOAT1);else if(f==="KP2L")o.Latitude=t.animVector(U.FLOAT1);else if(f==="KP2G")o.Gravity=t.animVector(U.FLOAT1);else if(f==="KP2R")o.Variation=t.animVector(U.FLOAT1);else throw new Error("Incorrect particle emitter2 chunk data "+f)}e.ParticleEmitters2.push(o)}}var gi=80;function pi(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i=t.pos,a=t.int32(),o={};for(o.Name=t.str(gi),o.Position=new Float32Array(3),o.Position[0]=t.float32(),o.Position[1]=t.float32(),o.Position[2]=t.float32(),o.FieldOfView=t.float32(),o.FarClip=t.float32(),o.NearClip=t.float32(),o.TargetPosition=new Float32Array(3),o.TargetPosition[0]=t.float32(),o.TargetPosition[1]=t.float32(),o.TargetPosition[2]=t.float32();t.pos<i+a;){let s=t.keyword();if(s==="KCTR")o.Translation=t.animVector(U.FLOAT3);else if(s==="KTTR")o.TargetTranslation=t.animVector(U.FLOAT3);else if(s==="KCRL")o.Rotation=t.animVector(U.FLOAT1);else throw new Error("Incorrect camera chunk data "+s)}e.Cameras.push(o)}}function mi(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i=t.pos,a=t.int32(),o={};Be(e,o,t),o.LightType=t.int32(),o.AttenuationStart=t.float32(),o.AttenuationEnd=t.float32(),o.Color=new Float32Array(3);for(let s=0;s<3;++s)o.Color[s]=t.float32();o.Intensity=t.float32(),o.AmbColor=new Float32Array(3);for(let s=0;s<3;++s)o.AmbColor[s]=t.float32();for(o.AmbIntensity=t.float32();t.pos<i+a;){let s=t.keyword();if(s==="KLAV")o.Visibility=t.animVector(U.FLOAT1);else if(s==="KLAC")o.Color=t.animVector(U.FLOAT3);else if(s==="KLAI")o.Intensity=t.animVector(U.FLOAT1);else if(s==="KLBC")o.AmbColor=t.animVector(U.FLOAT3);else if(s==="KLBI")o.AmbIntensity=t.animVector(U.FLOAT1);else if(s==="KLAS")o.AttenuationStart=t.animVector(U.INT1);else if(s==="KLAE")o.AttenuationEnd=t.animVector(U.INT1);else throw new Error("Incorrect light chunk data "+s)}e.Lights.push(o)}}function vi(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i=t.pos,a=t.int32(),o={};for(;t.pos<i+a;){let s=t.keyword();if(s==="KTAT")o.Translation=t.animVector(U.FLOAT3);else if(s==="KTAR")o.Rotation=t.animVector(U.FLOAT4);else if(s==="KTAS")o.Scaling=t.animVector(U.FLOAT3);else throw new Error("Incorrect light chunk data "+s)}e.TextureAnims.push(o)}}function bi(e,t,n){let r=t.pos;for(;t.pos<r+n;){let i=t.pos,a=t.int32(),o={};Be(e,o,t),o.HeightAbove=t.float32(),o.HeightBelow=t.float32(),o.Alpha=t.float32(),o.Color=new Float32Array(3);for(let s=0;s<3;++s)o.Color[s]=t.float32();for(o.LifeSpan=t.float32(),o.TextureSlot=t.int32(),o.EmissionRate=t.int32(),o.Rows=t.int32(),o.Columns=t.int32(),o.MaterialID=t.int32(),o.Gravity=t.float32();t.pos<i+a;){let s=t.keyword();if(s==="KRVS")o.Visibility=t.animVector(U.FLOAT1);else if(s==="KRHA")o.HeightAbove=t.animVector(U.FLOAT1);else if(s==="KRHB")o.HeightBelow=t.animVector(U.FLOAT1);else if(s==="KRAL")o.Alpha=t.animVector(U.FLOAT1);else if(s==="KRTX")o.TextureSlot=t.animVector(U.INT1);else throw new Error("Incorrect ribbon emitter chunk data "+s)}e.RibbonEmitters.push(o)}}function Ti(e,t,n){if(e.Version<900)throw new Error("Mismatched version chunk");let r=t.pos;for(e.FaceFX=e.FaceFX||[];t.pos<r+n;){let i={Name:"",Path:""};i.Name=t.str(80),i.Path=t.str(260),e.FaceFX.push(i)}}function xi(e,t,n){if(e.Version<900)throw new Error("Mismatched version chunk");let r=t.pos;e.BindPoses=e.BindPoses||[];let i=t.int32(),a={Matrices:[]};for(let o=0;o<i;++o){let s=t.float32Array(12);a.Matrices.push(s)}if(e.BindPoses.push(a),t.pos!==r+n)throw new Error("Mismatched BindPose data")}function Ai(e,t,n){if(e.Version<900)throw new Error("Mismatched version chunk");let r=t.pos;for(e.ParticleEmitterPopcorns=e.ParticleEmitterPopcorns||[];t.pos<r+n;){let i=t.pos,a=t.int32(),o={};for(Be(e,o,t),o.LifeSpan=t.float32(),o.EmissionRate=t.float32(),o.Speed=t.float32(),o.Color=t.float32Array(3),o.Alpha=t.float32(),o.ReplaceableId=t.int32(),o.Path=t.str(260),o.AnimVisibilityGuide=t.str(260);t.pos<i+a;){let s=t.keyword();if(s==="KPPA")o.Alpha=t.animVector(U.FLOAT1);else if(s==="KPPC")o.Color=t.animVector(U.FLOAT3);else if(s==="KPPE")o.EmissionRate=t.animVector(U.FLOAT1);else if(s==="KPPL")o.LifeSpan=t.animVector(U.FLOAT1);else if(s==="KPPS")o.Speed=t.animVector(U.FLOAT1);else if(s==="KPPV")o.Visibility=t.animVector(U.FLOAT1);else throw new Error("Incorrect particle emitter popcorn chunk data "+s)}e.ParticleEmitterPopcorns.push(o)}}var Lr={VERS:qn,MODL:$n,SEQS:jn,MTLS:Zn,TEXS:Jn,GEOS:ei,GEOA:ti,BONE:ni,HELP:ii,ATCH:ai,PIVT:si,EVTS:li,CLID:fi,GLBS:ui,PREM:ci,PRE2:di,CAMS:pi,LITE:mi,TXAN:vi,RIBB:bi,FAFX:Ti,BPOS:xi,CORN:Ai};function Ur(e){let t=new Wn(e);if(t.keyword()!=="MDLX")throw new Error("Not a mdx model");let n={Version:800,Info:{Name:"",MinimumExtent:null,MaximumExtent:null,BoundsRadius:0,BlendTime:150},Sequences:[],GlobalSequences:[],Textures:[],Materials:[],TextureAnims:[],Geosets:[],GeosetAnims:[],Bones:[],Helpers:[],Attachments:[],EventObjects:[],ParticleEmitters:[],ParticleEmitters2:[],Cameras:[],Lights:[],RibbonEmitters:[],CollisionShapes:[],PivotPoints:[],Nodes:[]};for(;t.pos<t.length;){let r=t.keyword(),i=t.int32();r in Lr?Lr[r](n,t,i):t.pos+=i}for(let r=0;r<n.Nodes.length;++r)n.Nodes[r]&&n.PivotPoints[r]&&(n.Nodes[r].PivotPoint=n.PivotPoints[r]);return n.Info.NumGeosets=n.Geosets.length,n.Info.NumGeosetAnims=n.GeosetAnims.length,n.Info.NumBones=n.Bones.length,n.Info.NumLights=n.Lights.length,n.Info.NumAttachments=n.Attachments.length,n.Info.NumEvents=n.EventObjects.length,n.Info.NumParticleEmitters=n.ParticleEmitters.length,n.Info.NumParticleEmitters2=n.ParticleEmitters2.length,n.Info.NumRibbonEmitters=n.RibbonEmitters.length,n}var it=function(e){return e[e.INT1=0]="INT1",e[e.FLOAT1=1]="FLOAT1",e[e.FLOAT3=2]="FLOAT3",e[e.FLOAT4=3]="FLOAT4",e}(it||{}),Qi={[it.INT1]:1,[it.FLOAT1]:1,[it.FLOAT3]:3,[it.FLOAT4]:4};var Ji=function(){"use strict";var t=new Int32Array([0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,27,20,13,6,7,14,21,28,35,42,49,56,57,50,43,36,29,22,15,23,30,37,44,51,58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63]),n=4017,r=799,i=3406,a=2276,o=1567,s=3784,f=5793,l=2896;function c(){}function T(m,x){for(var u=0,M=[],F,d,y=16;y>0&&!m[y-1];)y--;M.push({children:[],index:0});var g=M[0],h;for(F=0;F<y;F++){for(d=0;d<m[F];d++){for(g=M.pop(),g.children[g.index]=x[u];g.index>0;)g=M.pop();for(g.index++,M.push(g);M.length<=F;)M.push(h={children:[],index:0}),g.children[g.index]=h.children,g=h;u++}F+1<y&&(M.push(h={children:[],index:0}),g.children[g.index]=h.children,g=h)}return M[0].children}function P(m,x,u){return 64*((m.blocksPerLine+1)*x+u)}function V(m,x,u,M,F,d,y,g,h){u.precision,u.samplesPerLine,u.scanLines;var C=u.mcusPerLine,G=u.progressive;u.maxH,u.maxV;var L=x,p=0,E=0;function A(){if(E>0)return E--,p>>E&1;if(p=m[x++],p==255){var D=m[x++];if(D)throw"unexpected marker: "+(p<<8|D).toString(16)}return E=7,p>>>7}function b(D){for(var z=D,K;(K=A())!==null;){if(z=z[K],typeof z=="number")return z;if(typeof z!="object")throw"invalid huffman sequence"}return null}function B(D){for(var z=0;D>0;){var K=A();if(K===null)return;z=z<<1|K,D--}return z}function S(D){var z=B(D);return z>=1<<D-1?z:z+(-1<<D)+1}function re(D,z){var K=b(D.huffmanTableDC),j=K===0?0:S(K);D.blockData[z]=D.pred+=j;for(var J=1;J<64;){var le=b(D.huffmanTableAC),de=le&15,Ue=le>>4;if(de===0){if(Ue<15)break;J+=16;continue}J+=Ue;var Lt=t[J];D.blockData[z+Lt]=S(de),J++}}function oe(D,z){var K=b(D.huffmanTableDC),j=K===0?0:S(K)<<h;D.blockData[z]=D.pred+=j}function Q(D,z){D.blockData[z]|=A()<<h}var Y=0;function te(D,z){if(Y>0){Y--;return}for(var K=d,j=y;K<=j;){var J=b(D.huffmanTableAC),le=J&15,de=J>>4;if(le===0){if(de<15){Y=B(de)+(1<<de)-1;break}K+=16;continue}K+=de;var Ue=t[K];D.blockData[z+Ue]=S(le)*(1<<h),K++}}var q=0,X;function se(D,z){for(var K=d,j=y,J=0;K<=j;){var le=t[K];switch(q){case 0:var de=b(D.huffmanTableAC),Ue=de&15,J=de>>4;if(Ue===0)J<15?(Y=B(J)+(1<<J),q=4):(J=16,q=1);else{if(Ue!==1)throw"invalid ACn encoding";X=S(Ue),q=J?2:3}continue;case 1:case 2:D.blockData[z+le]?D.blockData[z+le]+=A()<<h:(J--,J===0&&(q=q==2?3:0));break;case 3:D.blockData[z+le]?D.blockData[z+le]+=A()<<h:(D.blockData[z+le]=X<<h,q=0);break;case 4:D.blockData[z+le]&&(D.blockData[z+le]+=A()<<h);break}K++}q===4&&(Y--,Y===0&&(q=0))}function be(D,z,K,j,J){var le=K/C|0,de=K%C;z(D,P(D,le*D.v+j,de*D.h+J))}function pe(D,z,K){z(D,P(D,K/D.blocksPerLine|0,K%D.blocksPerLine))}var Te=M.length,he,ue,ye,ce,Pe,Oe;G?d===0?Oe=g===0?oe:Q:Oe=g===0?te:se:Oe=re;var Re=0,ne,ze;Te==1?ze=M[0].blocksPerLine*M[0].blocksPerColumn:ze=C*u.mcusPerColumn,F||(F=ze);for(var Qe,ht;Re<ze;){for(ue=0;ue<Te;ue++)M[ue].pred=0;if(Y=0,Te==1)for(he=M[0],Pe=0;Pe<F;Pe++)pe(he,Oe,Re),Re++;else for(Pe=0;Pe<F;Pe++){for(ue=0;ue<Te;ue++)for(he=M[ue],Qe=he.h,ht=he.v,ye=0;ye<ht;ye++)for(ce=0;ce<Qe;ce++)be(he,Oe,Re,ye,ce);Re++}if(E=0,ne=m[x]<<8|m[x+1],ne<=65280)throw"marker was not found";if(ne>=65488&&ne<=65495)x+=2;else break}return x-L}function I(m,x,u){var M=m.quantizationTable,F,d,y,g,h,C,G,L,p,E;for(E=0;E<64;E++)u[E]=m.blockData[x+E]*M[E];for(E=0;E<8;++E){var A=8*E;if(u[1+A]==0&&u[2+A]==0&&u[3+A]==0&&u[4+A]==0&&u[5+A]==0&&u[6+A]==0&&u[7+A]==0){p=f*u[0+A]+512>>10,u[0+A]=p,u[1+A]=p,u[2+A]=p,u[3+A]=p,u[4+A]=p,u[5+A]=p,u[6+A]=p,u[7+A]=p;continue}F=f*u[0+A]+128>>8,d=f*u[4+A]+128>>8,y=u[2+A],g=u[6+A],h=l*(u[1+A]-u[7+A])+128>>8,L=l*(u[1+A]+u[7+A])+128>>8,C=u[3+A]<<4,G=u[5+A]<<4,p=F-d+1>>1,F=F+d+1>>1,d=p,p=y*s+g*o+128>>8,y=y*o-g*s+128>>8,g=p,p=h-G+1>>1,h=h+G+1>>1,G=p,p=L+C+1>>1,C=L-C+1>>1,L=p,p=F-g+1>>1,F=F+g+1>>1,g=p,p=d-y+1>>1,d=d+y+1>>1,y=p,p=h*a+L*i+2048>>12,h=h*i-L*a+2048>>12,L=p,p=C*r+G*n+2048>>12,C=C*n-G*r+2048>>12,G=p,u[0+A]=F+L,u[7+A]=F-L,u[1+A]=d+G,u[6+A]=d-G,u[2+A]=y+C,u[5+A]=y-C,u[3+A]=g+h,u[4+A]=g-h}for(E=0;E<8;++E){var b=E;if(u[8+b]==0&&u[16+b]==0&&u[24+b]==0&&u[32+b]==0&&u[40+b]==0&&u[48+b]==0&&u[56+b]==0){p=f*u[E+0]+8192>>14,u[0+b]=p,u[8+b]=p,u[16+b]=p,u[24+b]=p,u[32+b]=p,u[40+b]=p,u[48+b]=p,u[56+b]=p;continue}F=f*u[0+b]+2048>>12,d=f*u[32+b]+2048>>12,y=u[16+b],g=u[48+b],h=l*(u[8+b]-u[56+b])+2048>>12,L=l*(u[8+b]+u[56+b])+2048>>12,C=u[24+b],G=u[40+b],p=F-d+1>>1,F=F+d+1>>1,d=p,p=y*s+g*o+2048>>12,y=y*o-g*s+2048>>12,g=p,p=h-G+1>>1,h=h+G+1>>1,G=p,p=L+C+1>>1,C=L-C+1>>1,L=p,p=F-g+1>>1,F=F+g+1>>1,g=p,p=d-y+1>>1,d=d+y+1>>1,y=p,p=h*a+L*i+2048>>12,h=h*i-L*a+2048>>12,L=p,p=C*r+G*n+2048>>12,C=C*n-G*r+2048>>12,G=p,u[0+b]=F+L,u[56+b]=F-L,u[8+b]=d+G,u[48+b]=d-G,u[16+b]=y+C,u[40+b]=y-C,u[24+b]=g+h,u[32+b]=g-h}for(E=0;E<64;++E){var B=x+E,S=u[E];S=S<=-2056?0:S>=2024?255:S+2056>>4,m.blockData[B]=S}}function w(m,x){var u=x.blocksPerLine,M=x.blocksPerColumn;u<<3;for(var F=new Int32Array(64),d=0;d<M;d++)for(var y=0;y<u;y++)I(x,P(x,d,y),F);return x.blockData}function _(m){return m<=0?0:m>=255?255:m|0}return c.prototype={load:function(x){var u=new XMLHttpRequest;u.open("GET",x,!0),u.responseType="arraybuffer",u.onload=function(){var M=new Uint8Array(u.response||u.mozResponseArrayBuffer);this.parse(M),this.onload&&this.onload()}.bind(this),u.send(null)},loadFromBuffer:function(x){this.parse(x),this.onload&&this.onload()},parse:function(x){function u(){var j=x[d]<<8|x[d+1];return d+=2,j}function M(){var j=u(),J=x.subarray(d,d+j-2);return d+=J.length,J}function F(j){for(var J=Math.ceil(j.samplesPerLine/8/j.maxH),le=Math.ceil(j.scanLines/8/j.maxV),de=0;de<j.components.length;de++){ne=j.components[de];var Ue=Math.ceil(Math.ceil(j.samplesPerLine/8)*ne.h/j.maxH),Lt=Math.ceil(Math.ceil(j.scanLines/8)*ne.v/j.maxV),Vr=J*ne.h,wr=64*(le*ne.v)*(Vr+1);ne.blockData=new Int16Array(wr),ne.blocksPerLine=Ue,ne.blocksPerColumn=Lt}j.mcusPerLine=J,j.mcusPerColumn=le}var d=0;x.length;var y=null,g=null,h,C,G=[],L=[],p=[],E=u();if(E!=65496)throw"SOI not found";for(E=u();E!=65497;){var A,b,B;switch(E){case 65504:case 65505:case 65506:case 65507:case 65508:case 65509:case 65510:case 65511:case 65512:case 65513:case 65514:case 65515:case 65516:case 65517:case 65518:case 65519:case 65534:var S=M();E===65504&&S[0]===74&&S[1]===70&&S[2]===73&&S[3]===70&&S[4]===0&&(y={version:{major:S[5],minor:S[6]},densityUnits:S[7],xDensity:S[8]<<8|S[9],yDensity:S[10]<<8|S[11],thumbWidth:S[12],thumbHeight:S[13],thumbData:S.subarray(14,14+3*S[12]*S[13])}),E===65518&&S[0]===65&&S[1]===100&&S[2]===111&&S[3]===98&&S[4]===101&&S[5]===0&&(g={version:S[6],flags0:S[7]<<8|S[8],flags1:S[9]<<8|S[10],transformCode:S[11]});break;case 65499:for(var re=u()+d-2;d<re;){var oe=x[d++],Q=new Int32Array(64);if(oe>>4===0)for(b=0;b<64;b++){var Y=t[b];Q[Y]=x[d++]}else if(oe>>4===1)for(b=0;b<64;b++){var Y=t[b];Q[Y]=u()}else throw"DQT: invalid table spec";G[oe&15]=Q}break;case 65472:case 65473:case 65474:if(h)throw"Only single frame JPEGs supported";u(),h={},h.extended=E===65473,h.progressive=E===65474,h.precision=x[d++],h.scanLines=u(),h.samplesPerLine=u(),h.components=[],h.componentIds={};var te=x[d++],q,X=0,se=0;for(A=0;A<te;A++){q=x[d];var be=x[d+1]>>4,pe=x[d+1]&15;X<be&&(X=be),se<pe&&(se=pe);var Te=x[d+2],B=h.components.push({h:be,v:pe,quantizationTable:G[Te]});h.componentIds[q]=B-1,d+=3}h.maxH=X,h.maxV=se,F(h);break;case 65476:var he=u();for(A=2;A<he;){var ue=x[d++],ye=new Uint8Array(16),ce=0;for(b=0;b<16;b++,d++)ce+=ye[b]=x[d];var Pe=new Uint8Array(ce);for(b=0;b<ce;b++,d++)Pe[b]=x[d];A+=17+ce,(ue>>4===0?p:L)[ue&15]=T(ye,Pe)}break;case 65501:u(),C=u();break;case 65498:u();var Oe=x[d++],Re=[],ne;for(A=0;A<Oe;A++){var ze=h.componentIds[x[d++]];ne=h.components[ze];var Qe=x[d++];ne.huffmanTableDC=p[Qe>>4],ne.huffmanTableAC=L[Qe&15],Re.push(ne)}var ht=x[d++],D=x[d++],z=x[d++],K=V(x,d,h,Re,C,ht,D,z>>4,z&15);d+=K;break;default:if(x[d-3]==255&&x[d-2]>=192&&x[d-2]<=254){d-=3;break}throw"unknown JPEG marker "+E.toString(16)}E=u()}this.width=h.samplesPerLine,this.height=h.scanLines,this.jfif=y,this.adobe=g,this.components=[];for(var A=0;A<h.components.length;A++){var ne=h.components[A];this.components.push({output:w(h,ne),scaleX:ne.h/h.maxH,scaleY:ne.v/h.maxV,blocksPerLine:ne.blocksPerLine,blocksPerColumn:ne.blocksPerColumn})}},getData:function(x,u,M){var F=this.width/u,d=this.height/M,y,g,h,C,G,L,p=0,E=this.components.length;u*M*E;var A=x.data,b=new Uint8Array((this.components[0].blocksPerLine<<3)*this.components[0].blocksPerColumn*8);for(L=0;L<E;L++){y=this.components[L<3?2-L:L];for(var B=y.blocksPerLine,S=y.blocksPerColumn,re=B<<3,oe,Q,Y=0,te=0;te<S;te++)for(var q=te<<3,X=0;X<B;X++){var se=P(y,te,X),p=0,be=X<<3;for(oe=0;oe<8;oe++){var Y=(q+oe)*re;for(Q=0;Q<8;Q++)b[Y+be+Q]=y.output[se+p++]}}g=y.scaleX*F,h=y.scaleY*d,p=L;var pe,Te,he;for(G=0;G<M;G++)for(C=0;C<u;C++)Te=0|G*h,pe=0|C*g,he=Te*re+pe,A[p]=b[he],p+=E}return A},copyToImageData:function(x){var u=x.width,M=x.height,F=u*M*4,d=x.data,y=this.getData(u,M),g=0,h=0,C,G,L,p,E,A,b,B,S;switch(this.components.length){case 1:for(;h<F;)L=y[g++],d[h++]=L,d[h++]=L,d[h++]=L,d[h++]=255;break;case 3:for(;h<F;)b=y[g++],B=y[g++],S=y[g++],d[h++]=b,d[h++]=B,d[h++]=S,d[h++]=255;break;case 4:for(;h<F;)E=y[g++],A=y[g++],L=y[g++],p=y[g++],C=255-p,G=C/255,b=_(C-E*G),B=_(C-A*G),S=_(C-L*G),d[h++]=b,d[h++]=B,d[h++]=S,d[h++]=255;break;default:throw"Unsupported color mode"}}},c}();var Le=typeof Float32Array<"u"?Float32Array:Array;Math.PI/180;Math.hypot||(Math.hypot=function(){for(var e=0,t=arguments.length;t--;)e+=arguments[t]*arguments[t];return Math.sqrt(e)});function qt(){var e=new Le(9);return Le!=Float32Array&&(e[1]=0,e[2]=0,e[3]=0,e[5]=0,e[6]=0,e[7]=0),e[0]=1,e[4]=1,e[8]=1,e}function Pt(){var e=new Le(16);return Le!=Float32Array&&(e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0),e[0]=1,e[5]=1,e[10]=1,e[15]=1,e}function ve(){var e=new Le(3);return Le!=Float32Array&&(e[0]=0,e[1]=0,e[2]=0),e}function yi(e){var t=e[0],n=e[1],r=e[2];return Math.hypot(t,n,r)}function lt(e,t,n){var r=new Le(3);return r[0]=e,r[1]=t,r[2]=n,r}function Pi(e,t){var n=t[0],r=t[1],i=t[2],a=n*n+r*r+i*i;return a>0&&(a=1/Math.sqrt(a)),e[0]=t[0]*a,e[1]=t[1]*a,e[2]=t[2]*a,e}function Si(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function zt(e,t,n){var r=t[0],i=t[1],a=t[2],o=n[0],s=n[1],f=n[2];return e[0]=i*f-a*s,e[1]=a*o-r*f,e[2]=r*s-i*o,e}var Ei=yi;(function(){var e=ve();return function(t,n,r,i,a,o){var s,f;for(n||(n=3),r||(r=0),i?f=Math.min(i*n+r,t.length):f=t.length,s=r;s<f;s+=n)e[0]=t[s],e[1]=t[s+1],e[2]=t[s+2],a(e,e,o),t[s]=e[0],t[s+1]=e[1],t[s+2]=e[2];return t}})();function St(){var e=new Le(4);return Le!=Float32Array&&(e[0]=0,e[1]=0,e[2]=0,e[3]=0),e}function Li(e,t,n,r){var i=new Le(4);return i[0]=e,i[1]=t,i[2]=n,i[3]=r,i}function Fi(e,t){var n=t[0],r=t[1],i=t[2],a=t[3],o=n*n+r*r+i*i+a*a;return o>0&&(o=1/Math.sqrt(o)),e[0]=n*o,e[1]=r*o,e[2]=i*o,e[3]=a*o,e}(function(){var e=St();return function(t,n,r,i,a,o){var s,f;for(n||(n=4),r||(r=0),i?f=Math.min(i*n+r,t.length):f=t.length,s=r;s<f;s+=n)e[0]=t[s],e[1]=t[s+1],e[2]=t[s+2],e[3]=t[s+3],a(e,e,o),t[s]=e[0],t[s+1]=e[1],t[s+2]=e[2],t[s+3]=e[3];return t}})();function ft(){var e=new Le(4);return Le!=Float32Array&&(e[0]=0,e[1]=0,e[2]=0),e[3]=1,e}function Ui(e,t,n){n=n*.5;var r=Math.sin(n);return e[0]=r*t[0],e[1]=r*t[1],e[2]=r*t[2],e[3]=Math.cos(n),e}function Ht(e,t,n,r){var i=t[0],a=t[1],o=t[2],s=t[3],f=n[0],l=n[1],c=n[2],T=n[3],P,V=i*f+a*l+o*c+s*T,I,w,_;return V<0&&(V=-V,f=-f,l=-l,c=-c,T=-T),1-V>1e-6?(P=Math.acos(V),I=Math.sin(P),w=Math.sin((1-r)*P)/I,_=Math.sin(r*P)/I):(w=1-r,_=r),e[0]=w*i+_*f,e[1]=w*a+_*l,e[2]=w*o+_*c,e[3]=w*s+_*T,e}function Ci(e,t){var n=t[0]+t[4]+t[8],r;if(n>0)r=Math.sqrt(n+1),e[3]=.5*r,r=.5/r,e[0]=(t[5]-t[7])*r,e[1]=(t[6]-t[2])*r,e[2]=(t[1]-t[3])*r;else{var i=0;t[4]>t[0]&&(i=1),t[8]>t[i*3+i]&&(i=2);var a=(i+1)%3,o=(i+2)%3;r=Math.sqrt(t[i*3+i]-t[a*3+a]-t[o*3+o]+1),e[i]=.5*r,r=.5/r,e[3]=(t[a*3+o]-t[o*3+a])*r,e[a]=(t[a*3+i]+t[i*3+a])*r,e[o]=(t[o*3+i]+t[i*3+o])*r}return e}var Mi=Li;var Cr=Fi,eo=function(){var e=ve(),t=lt(1,0,0),n=lt(0,1,0);return function(r,i,a){var o=Si(i,a);return o<-.999999?(zt(e,t,i),Ei(e)<1e-6&&zt(e,n,i),Pi(e,e),Ui(r,e,Math.PI),r):o>.999999?(r[0]=0,r[1]=0,r[2]=0,r[3]=1,r):(zt(e,i,a),r[0]=e[0],r[1]=e[1],r[2]=e[2],r[3]=1+o,Cr(r,r))}}(),to=function(){var e=ft(),t=ft();return function(n,r,i,a,o,s){return Ht(e,r,o,s),Ht(t,i,a,s),Ht(n,e,t,2*s*(1-s)),n}}();(function(){var e=qt();return function(t,n,r,i){return e[0]=r[0],e[3]=r[1],e[6]=r[2],e[1]=i[0],e[4]=i[1],e[7]=i[2],e[2]=-n[0],e[5]=-n[1],e[8]=-n[2],Cr(t,Ci(t,e))}})();var ro=lt(0,0,0),no=St(),io=St(),oo=St(),ao=ve(),so=ve();var Bi=`attribute vec3 aVertexPosition;
attribute vec3 aNormal;
attribute vec2 aTextureCoord;
attribute vec4 aGroup;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNodesMatrices[\${MAX_NODES}];

varying vec3 vNormal;
varying vec2 vTextureCoord;

void main(void) {
    vec4 position = vec4(aVertexPosition, 1.0);
    int count = 1;
    vec4 sum = uNodesMatrices[int(aGroup[0])] * position;

    if (aGroup[1] < \${MAX_NODES}.) {
        sum += uNodesMatrices[int(aGroup[1])] * position;
        count += 1;
    }
    if (aGroup[2] < \${MAX_NODES}.) {
        sum += uNodesMatrices[int(aGroup[2])] * position;
        count += 1;
    }
    if (aGroup[3] < \${MAX_NODES}.) {
        sum += uNodesMatrices[int(aGroup[3])] * position;
        count += 1;
    }
    sum.xyz /= float(count);
    sum.w = 1.;
    position = sum;

    gl_Position = uPMatrix * uMVMatrix * position;
    vTextureCoord = aTextureCoord;
    vNormal = aNormal;
}`;var Vi=`attribute vec3 aVertexPosition;
attribute vec3 aNormal;
attribute vec2 aTextureCoord;
attribute vec4 aSkin;
attribute vec4 aBoneWeight;
attribute vec4 aTangent;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNodesMatrices[\${MAX_NODES}];

varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBinormal;
varying vec2 vTextureCoord;
varying mat3 vTBN;
varying vec3 vFragPos;

void main(void) {
    vec4 position = vec4(aVertexPosition, 1.0);
    mat4 sum;

    // sum += uNodesMatrices[int(aSkin[0])] * 1.;
    sum += uNodesMatrices[int(aSkin[0])] * aBoneWeight[0];
    sum += uNodesMatrices[int(aSkin[1])] * aBoneWeight[1];
    sum += uNodesMatrices[int(aSkin[2])] * aBoneWeight[2];
    sum += uNodesMatrices[int(aSkin[3])] * aBoneWeight[3];

    mat3 rotation = mat3(sum);

    position = sum * position;
    position.w = 1.;

    gl_Position = uPMatrix * uMVMatrix * position;
    vTextureCoord = aTextureCoord;

    vec3 normal = aNormal;
    vec3 tangent = aTangent.xyz;

    // https://learnopengl.com/Advanced-Lighting/Normal-Mapping
    tangent = normalize(tangent - dot(tangent, normal) * normal);

    vec3 binormal = cross(normal, tangent) * aTangent.w;

    normal = normalize(rotation * normal);
    tangent = normalize(rotation * tangent);
    binormal = normalize(rotation * binormal);

    vNormal = normal;
    vTangent = tangent;
    vBinormal = binormal;

    vTBN = mat3(tangent, binormal, normal);

    vFragPos = position.xyz;
}`,wi=`#version 300 es
in vec3 aVertexPosition;
in vec3 aNormal;
in vec2 aTextureCoord;
in vec4 aSkin;
in vec4 aBoneWeight;
in vec4 aTangent;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNodesMatrices[\${MAX_NODES}];

out vec3 vNormal;
out vec3 vTangent;
out vec3 vBinormal;
out vec2 vTextureCoord;
out mat3 vTBN;
out vec3 vFragPos;

void main(void) {
    vec4 position = vec4(aVertexPosition, 1.0);
    mat4 sum;

    // sum += uNodesMatrices[int(aSkin[0])] * 1.;
    sum += uNodesMatrices[int(aSkin[0])] * aBoneWeight[0];
    sum += uNodesMatrices[int(aSkin[1])] * aBoneWeight[1];
    sum += uNodesMatrices[int(aSkin[2])] * aBoneWeight[2];
    sum += uNodesMatrices[int(aSkin[3])] * aBoneWeight[3];

    mat3 rotation = mat3(sum);

    position = sum * position;
    position.w = 1.;

    gl_Position = uPMatrix * uMVMatrix * position;
    vTextureCoord = aTextureCoord;

    vec3 normal = aNormal;
    vec3 tangent = aTangent.xyz;

    // https://learnopengl.com/Advanced-Lighting/Normal-Mapping
    tangent = normalize(tangent - dot(tangent, normal) * normal);

    vec3 binormal = cross(normal, tangent) * aTangent.w;

    normal = normalize(rotation * normal);
    tangent = normalize(rotation * tangent);
    binormal = normalize(rotation * binormal);

    vNormal = normal;
    vTangent = tangent;
    vBinormal = binormal;

    vTBN = mat3(tangent, binormal, normal);

    vFragPos = position.xyz;
}`;var Di=`#version 300 es
precision mediump float;

in vec2 vTextureCoord;
in vec3 vNormal;
in vec3 vTangent;
in vec3 vBinormal;
in mat3 vTBN;
in vec3 vFragPos;

out vec4 FragColor;

uniform sampler2D uSampler;
uniform sampler2D uNormalSampler;
uniform sampler2D uOrmSampler;
uniform vec3 uReplaceableColor;
uniform float uDiscardAlphaLevel;
uniform mat3 uTVertexAnim;
uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform vec3 uCameraPos;
uniform vec3 uShadowParams;
uniform sampler2D uShadowMapSampler;
uniform mat4 uShadowMapLightMatrix;
uniform bool uHasEnv;
uniform samplerCube uIrradianceMap;
uniform samplerCube uPrefilteredEnv;
uniform sampler2D uBRDFLUT;
uniform float uWireframe;

const float PI = 3.14159265359;
const float gamma = 2.2;
const float MAX_REFLECTION_LOD = \${MAX_ENV_MIP_LEVELS};

float distributionGGX(vec3 normal, vec3 halfWay, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float nDotH = max(dot(normal, halfWay), 0.0);
    float nDotH2 = nDotH * nDotH;

    float num = a2;
    float denom = (nDotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return num / denom;
}

float geometrySchlickGGX(float nDotV, float roughness) {
    float r = roughness + 1.;
    float k = r * r / 8.;
    // float k = roughness * roughness / 2.;

    float num = nDotV;
    float denom = nDotV * (1. - k) + k;

    return num / denom;
}

float geometrySmith(vec3 normal, vec3 viewDir, vec3 lightDir, float roughness) {
    float nDotV = max(dot(normal, viewDir), .0);
    float nDotL = max(dot(normal, lightDir), .0);
    float ggx2  = geometrySchlickGGX(nDotV, roughness);
    float ggx1  = geometrySchlickGGX(nDotL, roughness);

    return ggx1 * ggx2;
}

vec3 fresnelSchlick(float lightFactor, vec3 f0) {
    return f0 + (1. - f0) * pow(clamp(1. - lightFactor, 0., 1.), 5.);
}

vec3 fresnelSchlickRoughness(float lightFactor, vec3 f0, float roughness) {
    return f0 + (max(vec3(1.0 - roughness), f0) - f0) * pow(clamp(1.0 - lightFactor, 0.0, 1.0), 5.0);
}

void main(void) {
    if (uWireframe > 0.) {
        FragColor = vec4(1.);
        return;
    }

    vec2 texCoord = (uTVertexAnim * vec3(vTextureCoord.s, vTextureCoord.t, 1.)).st;

    vec4 orm = texture(uOrmSampler, texCoord);

    float occlusion = orm.r;
    float roughness = orm.g;
    float metallic = orm.b;
    float teamColorFactor = orm.a;

    vec4 baseColor = texture(uSampler, texCoord);
    vec3 teamColor = baseColor.rgb * uReplaceableColor;
    baseColor.rgb = mix(baseColor.rgb, teamColor, teamColorFactor);
    baseColor.rgb = pow(baseColor.rgb, vec3(gamma));

    vec3 normal = texture(uNormalSampler, texCoord).rgb;
    normal = normal * 2.0 - 1.0;
    normal.x = -normal.x;
    normal.y = -normal.y;
    if (!gl_FrontFacing) {
        normal = -normal;
    }
    normal = normalize(vTBN * -normal);

    vec3 viewDir = normalize(uCameraPos - vFragPos);
    vec3 reflected = reflect(-viewDir, normal);

    vec3 lightDir = normalize(uLightPos - vFragPos);
    float lightFactor = max(dot(normal, lightDir), .0);
    vec3 radiance = uLightColor;

    vec3 f0 = vec3(.04);
    f0 = mix(f0, baseColor.rgb, metallic);

    vec3 totalLight = vec3(0.);
    vec3 halfWay = normalize(viewDir + lightDir);
    float ndf = distributionGGX(normal, halfWay, roughness);
    float g = geometrySmith(normal, viewDir, lightDir, roughness);
    vec3 f = fresnelSchlick(max(dot(halfWay, viewDir), 0.), f0);

    vec3 kS = f;
    vec3 kD = vec3(1.);// - kS;
    if (uHasEnv) {
        kD *= 1.0 - metallic;
    }
    vec3 num = ndf * g * f;
    float denom = 4. * max(dot(normal, viewDir), 0.) * max(dot(normal, lightDir), 0.) + .0001;
    vec3 specular = num / denom;

    totalLight = (kD * baseColor.rgb / PI + specular) * radiance * lightFactor;

    if (uShadowParams[0] > .5) {
        float shadowBias = uShadowParams[1];
        float shadowStep = uShadowParams[2];
        vec4 fragInLightPos = uShadowMapLightMatrix * vec4(vFragPos, 1.);
        vec3 shadowMapCoord = fragInLightPos.xyz / fragInLightPos.w;
        shadowMapCoord.xyz = (shadowMapCoord.xyz + 1.0) * .5;

        int passes = 5;
        float step = 1. / float(passes);

        float lightDepth = texture(uShadowMapSampler, shadowMapCoord.xy).r;
        float lightDepth0 = texture(uShadowMapSampler, vec2(shadowMapCoord.x + shadowStep, shadowMapCoord.y)).r;
        float lightDepth1 = texture(uShadowMapSampler, vec2(shadowMapCoord.x, shadowMapCoord.y + shadowStep)).r;
        float lightDepth2 = texture(uShadowMapSampler, vec2(shadowMapCoord.x, shadowMapCoord.y - shadowStep)).r;
        float lightDepth3 = texture(uShadowMapSampler, vec2(shadowMapCoord.x - shadowStep, shadowMapCoord.y)).r;
        float currentDepth = shadowMapCoord.z;

        float visibility = 0.;
        if (lightDepth > currentDepth - shadowBias) {
            visibility += step;
        }
        if (lightDepth0 > currentDepth - shadowBias) {
            visibility += step;
        }
        if (lightDepth1 > currentDepth - shadowBias) {
            visibility += step;
        }
        if (lightDepth2 > currentDepth - shadowBias) {
            visibility += step;
        }
        if (lightDepth3 > currentDepth - shadowBias) {
            visibility += step;
        }

        totalLight *= visibility;
    }

    vec3 color;

    if (uHasEnv) {
        vec3 f = fresnelSchlickRoughness(max(dot(normal, viewDir), 0.0), f0, roughness);
        vec3 kS = f;
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - metallic;

        vec3 diffuse = texture(uIrradianceMap, normal).rgb * baseColor.rgb;
        vec3 prefilteredColor = textureLod(uPrefilteredEnv, reflected, roughness * MAX_REFLECTION_LOD).rgb;
        vec2 envBRDF = texture(uBRDFLUT, vec2(max(dot(normal, viewDir), 0.0), roughness)).rg;
        specular = prefilteredColor * (f * envBRDF.x + envBRDF.y);

        vec3 ambient = (kD * diffuse + specular) * occlusion;
        color = ambient + totalLight;
    } else {
        vec3 ambient = vec3(.03);
        ambient *= baseColor.rgb * occlusion;
        color = ambient + totalLight;
    }

    color = color / (vec3(1.) + color);
    color = pow(color, vec3(1. / gamma));

    FragColor = vec4(color, baseColor.a);

    // hand-made alpha-test
    if (FragColor[3] < uDiscardAlphaLevel) {
        discard;
    }
}
`;var Ri=`struct VSUniforms {
    mvMatrix: mat4x4f,
    pMatrix: mat4x4f,
    nodesMatrices: array<mat4x4f, \${MAX_NODES}>,
}

struct FSUniforms {
    replaceableColor: vec3f,
    replaceableType: u32,
    discardAlphaLevel: f32,
    wireframe: u32,
    tVertexAnim: mat3x3f,
}

@group(0) @binding(0) var<uniform> vsUniforms: VSUniforms;
@group(1) @binding(0) var<uniform> fsUniforms: FSUniforms;
@group(1) @binding(1) var fsUniformSampler: sampler;
@group(1) @binding(2) var fsUniformTexture: texture_2d<f32>;

struct VSIn {
    @location(0) vertexPosition: vec3f,
    @location(1) normal: vec3f,
    @location(2) textureCoord: vec2f,
    @location(3) group: vec4<u32>,
}

struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) textureCoord: vec2f,
}

@vertex fn vs(
    in: VSIn
) -> VSOut {
    var position: vec4f = vec4f(in.vertexPosition, 1.0);
    var count: i32 = 1;
    var sum: vec4f = vsUniforms.nodesMatrices[in.group[0]] * position;

    if (in.group[1] < \${MAX_NODES}) {
        sum += vsUniforms.nodesMatrices[in.group[1]] * position;
        count += 1;
    }
    if (in.group[2] < \${MAX_NODES}) {
        sum += vsUniforms.nodesMatrices[in.group[2]] * position;
        count += 1;
    }
    if (in.group[3] < \${MAX_NODES}) {
        sum += vsUniforms.nodesMatrices[in.group[3]] * position;
        count += 1;
    }
    sum /= f32(count);
    sum.w = 1.;
    position = sum;

    var out: VSOut;
    out.position = vsUniforms.pMatrix * vsUniforms.mvMatrix * position;
    out.textureCoord = in.textureCoord;
    out.normal = in.normal;
    return out;
}

fn hypot(z: vec2f) -> f32 {
    var t: f32 = 0;
    var x: f32 = abs(z.x);
    let y: f32 = abs(z.y);
    t = min(x, y);
    x = max(x, y);
    t = t / x;
    if (z.x == 0.0 && z.y == 0.0) {
        return 0.0;
    }
    return x * sqrt(1.0 + t * t);
}

@fragment fn fs(
    in: VSOut
) -> @location(0) vec4f {
    if (fsUniforms.wireframe > 0) {
        return vec4f(1);
    }

    let texCoord: vec2f = (fsUniforms.tVertexAnim * vec3f(in.textureCoord.x, in.textureCoord.y, 1.)).xy;
    var color: vec4f = vec4f(0.0);

    if (fsUniforms.replaceableType == 0) {
        color = textureSample(fsUniformTexture, fsUniformSampler, texCoord);
    } else if (fsUniforms.replaceableType == 1) {
        color = vec4f(fsUniforms.replaceableColor, 1.0);
    } else if (fsUniforms.replaceableType == 2) {
        let dist: f32 = hypot(texCoord - vec2(0.5, 0.5)) * 2.;
        let truncateDist: f32 = clamp(1. - dist * 1.4, 0., 1.);
        let alpha: f32 = sin(truncateDist);
        color = vec4f(fsUniforms.replaceableColor * alpha, 1.0);
    }

    // hand-made alpha-test
    if (color.a < fsUniforms.discardAlphaLevel) {
        discard;
    }

    return color;
}
`,Ii=`struct VSUniforms {
    mvMatrix: mat4x4f,
    pMatrix: mat4x4f,
    nodesMatrices: array<mat4x4f, \${MAX_NODES}>,
}

struct FSUniforms {
    replaceableColor: vec3f,
    // replaceableType: u32,
    discardAlphaLevel: f32,
    tVertexAnim: mat3x3f,
    lightPos: vec3f,
    hasEnv: u32,
    lightColor: vec3f,
    wireframe: u32,
    cameraPos: vec3f,
    shadowParams: vec3f,
    shadowMapLightMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> vsUniforms: VSUniforms;
@group(1) @binding(0) var<uniform> fsUniforms: FSUniforms;
@group(1) @binding(1) var fsUniformDiffuseSampler: sampler;
@group(1) @binding(2) var fsUniformDiffuseTexture: texture_2d<f32>;
@group(1) @binding(3) var fsUniformNormalSampler: sampler;
@group(1) @binding(4) var fsUniformNormalTexture: texture_2d<f32>;
@group(1) @binding(5) var fsUniformOrmSampler: sampler;
@group(1) @binding(6) var fsUniformOrmTexture: texture_2d<f32>;
@group(1) @binding(7) var fsUniformShadowSampler: sampler_comparison;
@group(1) @binding(8) var fsUniformShadowTexture: texture_depth_2d;
@group(1) @binding(9) var irradienceMapSampler: sampler;
@group(1) @binding(10) var irradienceMapTexture: texture_cube<f32>;
@group(1) @binding(11) var prefilteredEnvSampler: sampler;
@group(1) @binding(12) var prefilteredEnvTexture: texture_cube<f32>;
@group(1) @binding(13) var brdfLutSampler: sampler;
@group(1) @binding(14) var brdfLutTexture: texture_2d<f32>;

struct VSIn {
    @location(0) vertexPosition: vec3f,
    @location(1) normal: vec3f,
    @location(2) textureCoord: vec2f,
    @location(3) tangent: vec4f,
    @location(4) skin: vec4<u32>,
    @location(5) boneWeight: vec4f,
}

struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) textureCoord: vec2f,
    @location(2) tangent: vec3f,
    @location(3) binormal: vec3f,
    @location(4) fragPos: vec3f,
}

@vertex fn vs(
    in: VSIn
) -> VSOut {
    var position: vec4f = vec4f(in.vertexPosition, 1.0);
    var sum: mat4x4f;

    sum += vsUniforms.nodesMatrices[in.skin[0]] * in.boneWeight[0];
    sum += vsUniforms.nodesMatrices[in.skin[1]] * in.boneWeight[1];
    sum += vsUniforms.nodesMatrices[in.skin[2]] * in.boneWeight[2];
    sum += vsUniforms.nodesMatrices[in.skin[3]] * in.boneWeight[3];

    let rotation: mat3x3f = mat3x3f(sum[0].xyz, sum[1].xyz, sum[2].xyz);

    position = sum * position;
    position.w = 1;

    var out: VSOut;
    out.position = vsUniforms.pMatrix * vsUniforms.mvMatrix * position;
    out.textureCoord = in.textureCoord;
    out.normal = in.normal;

    var normal: vec3f = in.normal;
    var tangent: vec3f = in.tangent.xyz;

    // https://learnopengl.com/Advanced-Lighting/Normal-Mapping
    tangent = normalize(tangent - dot(tangent, normal) * normal);

    var binormal: vec3f = cross(normal, tangent) * in.tangent.w;

    normal = normalize(rotation * normal);
    tangent = normalize(rotation * tangent);
    binormal = normalize(rotation * binormal);

    out.normal = normal;
    out.tangent = tangent;
    out.binormal = binormal;

    out.fragPos = position.xyz;

    return out;
}

fn hypot(z: vec2f) -> f32 {
    var t: f32 = 0;
    var x: f32 = abs(z.x);
    let y: f32 = abs(z.y);
    t = min(x, y);
    x = max(x, y);
    t = t / x;
    if (z.x == 0.0 && z.y == 0.0) {
        return 0.0;
    }
    return x * sqrt(1.0 + t * t);
}

const PI: f32 = 3.14159265359;
const gamma: f32 = 2.2;
const MAX_REFLECTION_LOD: f32 = \${MAX_ENV_MIP_LEVELS};

fn distributionGGX(normal: vec3f, halfWay: vec3f, roughness: f32) -> f32 {
    let a: f32 = roughness * roughness;
    let a2: f32 = a * a;
    let nDotH: f32 = max(dot(normal, halfWay), 0.0);
    let nDotH2: f32 = nDotH * nDotH;

    let num: f32 = a2;
    var denom: f32 = (nDotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return num / denom;
}

fn geometrySchlickGGX(nDotV: f32, roughness: f32) -> f32 {
    let r: f32 = roughness + 1.;
    let k: f32 = r * r / 8.;
    // float k = roughness * roughness / 2.;

    let num: f32 = nDotV;
    let denom: f32 = nDotV * (1. - k) + k;

    return num / denom;
}

fn geometrySmith(normal: vec3f, viewDir: vec3f, lightDir: vec3f, roughness: f32) -> f32 {
    let nDotV: f32 = max(dot(normal, viewDir), .0);
    let nDotL: f32 = max(dot(normal, lightDir), .0);
    let ggx2: f32  = geometrySchlickGGX(nDotV, roughness);
    let ggx1: f32  = geometrySchlickGGX(nDotL, roughness);

    return ggx1 * ggx2;
}

fn fresnelSchlick(lightFactor: f32, f0: vec3f) -> vec3f {
    return f0 + (1. - f0) * pow(clamp(1. - lightFactor, 0., 1.), 5.);
}

fn fresnelSchlickRoughness(lightFactor: f32, f0: vec3f, roughness: f32) -> vec3f {
    return f0 + (max(vec3(1.0 - roughness), f0) - f0) * pow(clamp(1.0 - lightFactor, 0.0, 1.0), 5.0);
}

@fragment fn fs(
    in: VSOut,
    @builtin(front_facing) isFront: bool
) -> @location(0) vec4f {
    if (fsUniforms.wireframe > 0) {
        return vec4f(1);
    }

    let texCoord: vec2f = (fsUniforms.tVertexAnim * vec3f(in.textureCoord.x, in.textureCoord.y, 1.)).xy;
    var baseColor: vec4f = textureSample(fsUniformDiffuseTexture, fsUniformDiffuseSampler, texCoord);

    // hand-made alpha-test
    if (baseColor.a < fsUniforms.discardAlphaLevel) {
        discard;
    }

    let orm: vec4f = textureSample(fsUniformOrmTexture, fsUniformOrmSampler, texCoord);

    let occlusion: f32 = orm.r;
    let roughness: f32 = orm.g;
    let metallic: f32 = orm.b;
    let teamColorFactor: f32 = orm.a;

    var teamColor: vec3f = baseColor.rgb * fsUniforms.replaceableColor;
    baseColor = vec4(mix(baseColor.rgb, teamColor, teamColorFactor), baseColor.a);
    baseColor = vec4(pow(baseColor.rgb, vec3f(gamma)), baseColor.a);

    let TBN: mat3x3f = mat3x3f(in.tangent, in.binormal, in.normal);

    var normal: vec3f = textureSample(fsUniformNormalTexture, fsUniformNormalSampler, texCoord).xyz;
    normal = normal * 2 - 1;
    normal.x = -normal.x;
    normal.y = -normal.y;
    if (!isFront) {
        normal = -normal;
    }
    normal = normalize(TBN * -normal);

    let viewDir: vec3f = normalize(fsUniforms.cameraPos - in.fragPos);
    let reflected = reflect(-viewDir, normal);

    let lightDir: vec3f = normalize(fsUniforms.lightPos - in.fragPos);
    let lightFactor: f32 = max(dot(normal, lightDir), 0);
    let radiance: vec3f = fsUniforms.lightColor;

    var f0 = vec3f(.04);
    f0 = mix(f0, baseColor.rgb, metallic);

    var totalLight: vec3f = vec3f(0);
    let halfWay: vec3f = normalize(viewDir + lightDir);
    let ndf: f32 = distributionGGX(normal, halfWay, roughness);
    let g: f32 = geometrySmith(normal, viewDir, lightDir, roughness);
    let f: vec3f = fresnelSchlick(max(dot(halfWay, viewDir), 0), f0);

    let kS = f;
    var kD = vec3f(1);// - kS;
    if (fsUniforms.hasEnv > 0) {
        kD *= 1 - metallic;
    }
    let num: vec3f = ndf * g * f;
    let denom: f32 = 4. * max(dot(normal, viewDir), 0.) * max(dot(normal, lightDir), 0.) + .0001;
    var specular: vec3f = num / denom;

    totalLight = (kD * baseColor.rgb / PI + specular) * radiance * lightFactor;

    if (fsUniforms.shadowParams[0] > .5) {
        let shadowBias: f32 = fsUniforms.shadowParams[1];
        let shadowStep: f32 = fsUniforms.shadowParams[2];
        let fragInLightPos: vec4f = fsUniforms.shadowMapLightMatrix * vec4f(in.fragPos, 1.);
        var shadowMapCoord: vec3f = fragInLightPos.xyz / fragInLightPos.w;
        shadowMapCoord = vec3f((shadowMapCoord.xy + 1) * .5, shadowMapCoord.z);
        shadowMapCoord.y = 1 - shadowMapCoord.y;

        let passes: u32 = 5;
        let step: f32 = 1. / f32(passes);

        let currentDepth: f32 = shadowMapCoord.z;
        var lightDepth: f32 = textureSampleCompare(fsUniformShadowTexture, fsUniformShadowSampler, shadowMapCoord.xy, currentDepth - shadowBias);
        let lightDepth0: f32 = textureSampleCompare(fsUniformShadowTexture, fsUniformShadowSampler, vec2f(shadowMapCoord.x + shadowStep, shadowMapCoord.y), currentDepth - shadowBias);
        let lightDepth1: f32 = textureSampleCompare(fsUniformShadowTexture, fsUniformShadowSampler, vec2f(shadowMapCoord.x, shadowMapCoord.y + shadowStep), currentDepth - shadowBias);
        let lightDepth2: f32 = textureSampleCompare(fsUniformShadowTexture, fsUniformShadowSampler, vec2f(shadowMapCoord.x, shadowMapCoord.y - shadowStep), currentDepth - shadowBias);
        let lightDepth3: f32 = textureSampleCompare(fsUniformShadowTexture, fsUniformShadowSampler, vec2f(shadowMapCoord.x - shadowStep, shadowMapCoord.y), currentDepth - shadowBias);

        var visibility: f32 = 0.;
        if (lightDepth > .5) {
            visibility += step;
        }
        if (lightDepth0 > .5) {
            visibility += step;
        }
        if (lightDepth1 > .5) {
            visibility += step;
        }
        if (lightDepth2 > .5) {
            visibility += step;
        }
        if (lightDepth3 > .5) {
            visibility += step;
        }

        totalLight *= visibility;
    }

    var color: vec3f = vec3f(0.0);

    if (fsUniforms.hasEnv > 0) {
        let f: vec3f = fresnelSchlickRoughness(max(dot(normal, viewDir), 0.0), f0, roughness);
        let kS: vec3f = f;
        var kD: vec3f = vec3f(1.0) - kS;
        kD *= 1.0 - metallic;

        let diffuse: vec3f = textureSample(irradienceMapTexture, irradienceMapSampler, normal).rgb * baseColor.rgb;
        let prefilteredColor: vec3f = textureSampleLevel(prefilteredEnvTexture, prefilteredEnvSampler, reflected, roughness * MAX_REFLECTION_LOD).rgb;
        let envBRDF: vec2f = textureSample(brdfLutTexture, brdfLutSampler, vec2f(max(dot(normal, viewDir), 0.0), roughness)).rg;
        specular = prefilteredColor * (f * envBRDF.x + envBRDF.y);

        let ambient: vec3f = (kD * diffuse + specular) * occlusion;
        color = ambient + totalLight;
    } else {
        var ambient: vec3f = vec3(.03);
        ambient *= baseColor.rgb * occlusion;
        color = ambient + totalLight;
    }

    color = color / (vec3f(1) + color);
    color = pow(color, vec3f(1 / gamma));

    return vec4f(color, baseColor.a);
}
`,Gi=`struct VSUniforms {
    mvMatrix: mat4x4f,
    pMatrix: mat4x4f,
    nodesMatrices: array<mat4x4f, \${MAX_NODES}>,
}

struct FSUniforms {
    replaceableColor: vec3f,
    // replaceableType: u32,
    discardAlphaLevel: f32,
    tVertexAnim: mat3x3f,
    lightPos: vec3f,
    lightColor: vec3f,
    cameraPos: vec3f,
    shadowParams: vec3f,
    shadowMapLightMatrix: mat4x4f,
    // env
}

@group(0) @binding(0) var<uniform> vsUniforms: VSUniforms;
@group(1) @binding(0) var<uniform> fsUniforms: FSUniforms;
@group(1) @binding(1) var fsUniformDiffuseSampler: sampler;
@group(1) @binding(2) var fsUniformDiffuseTexture: texture_2d<f32>;
@group(1) @binding(3) var fsUniformNormalSampler: sampler;
@group(1) @binding(4) var fsUniformNormalTexture: texture_2d<f32>;
@group(1) @binding(5) var fsUniformOrmSampler: sampler;
@group(1) @binding(6) var fsUniformOrmTexture: texture_2d<f32>;
@group(1) @binding(7) var fsUniformShadowSampler: sampler_comparison;
// @group(1) @binding(7) var fsUniformShadowSampler: sampler;
@group(1) @binding(8) var fsUniformShadowTexture: texture_depth_2d;

struct VSIn {
    @location(0) vertexPosition: vec3f,
    @location(1) normal: vec3f,
    @location(2) textureCoord: vec2f,
    @location(3) tangent: vec4f,
    @location(4) skin: vec4<u32>,
    @location(5) boneWeight: vec4f,
}

struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) textureCoord: vec2f,
    @location(1) depth: f32,
}

@vertex fn vs(
    in: VSIn
) -> VSOut {
    var position: vec4f = vec4f(in.vertexPosition, 1.0);
    var sum: mat4x4f;

    sum += vsUniforms.nodesMatrices[in.skin[0]] * in.boneWeight[0];
    sum += vsUniforms.nodesMatrices[in.skin[1]] * in.boneWeight[1];
    sum += vsUniforms.nodesMatrices[in.skin[2]] * in.boneWeight[2];
    sum += vsUniforms.nodesMatrices[in.skin[3]] * in.boneWeight[3];

    position = sum * position;
    position.w = 1;

    var out: VSOut;
    out.position = vsUniforms.pMatrix * vsUniforms.mvMatrix * position;
    out.textureCoord = in.textureCoord;

    out.depth = out.position.z / out.position.w;

    return out;
}

struct FSOut {
    @builtin(frag_depth) depth: f32,
    @location(0) color: vec4f
}

@fragment fn fs(
    in: VSOut,
    @builtin(front_facing) isFront: bool
) -> FSOut {
    let texCoord: vec2f = (fsUniforms.tVertexAnim * vec3f(in.textureCoord.x, in.textureCoord.y, 1.)).xy;
    var baseColor: vec4f = textureSample(fsUniformDiffuseTexture, fsUniformDiffuseSampler, texCoord);

    // hand-made alpha-test
    if (baseColor.a < fsUniforms.discardAlphaLevel) {
        discard;
    }

    var out: FSOut;
    out.color = vec4f(1, 1, 1, 1);
    out.depth = in.depth;
    return out;
}
`;var je=254;var Mr=8;var lo=Bi.replace(/\$\{MAX_NODES}/g,String(je)),fo=Vi.replace(/\$\{MAX_NODES}/g,String(je)),uo=wi.replace(/\$\{MAX_NODES}/g,String(je)),ho=Di.replace(/\$\{MAX_ENV_MIP_LEVELS}/g,String(Mr.toFixed(1))),co=Ri.replace(/\$\{MAX_NODES}/g,String(je)),go=Ii.replace(/\$\{MAX_NODES}/g,String(je)).replace(/\$\{MAX_ENV_MIP_LEVELS}/g,String(Mr.toFixed(1))),po=Gi.replace(/\$\{MAX_NODES}/g,String(je)),mo=ve(),vo=ft(),bo=ve(),To=lt(0,0,0),xo=Mi(0,0,0,1),Ao=lt(1,1,1),yo=ft(),Po=Pt(),So=Pt(),Eo=ve(),Lo=ve(),Fo=ft(),Uo=Pt(),Co=ve(),Mo=ve(),Bo=ve(),Vo=ve(),wo=ve(),Do=ve(),Ro=ve(),Io=qt(),Go=Pt(),_o=qt();var _i=100*1024*1024,Oi=200*1024*1024,Xo=/\.(mdx|mdl)$/i,Br=/\.(mdx|mdl|blp|tga|png|jpe?g|webp)$/i;function Et(e){let t=String(e).replaceAll("\\","/").replace(/^\.\//,"");if(!t||t.length>240||t.startsWith("/")||t.includes(":")||t.split("/").some(n=>n===".."||n===""))throw Error("Invalid file path: "+e);return t}var Ze=e=>Et(e).toLowerCase(),Wo=e=>/\.zip$/i.test(e)?"application/zip":/\.png$/i.test(e)?"image/png":/\.jpe?g$/i.test(e)?"image/jpeg":/\.webp$/i.test(e)?"image/webp":"application/octet-stream";async function qo(e){return[...new Uint8Array(await crypto.subtle.digest("SHA-256",e))].map(t=>t.toString(16).padStart(2,"0")).join("")}function Ko(e,t){if(!t.length||t.length>_i)throw Error("Each file must be between 1 byte and 100 MB.");let n=[],r=0,i=0;if(/\.zip$/i.test(e)){let o=yr(t,{filter:s=>{if(++i>1e3)throw Error("The ZIP contains too many files.");if(s.name.endsWith("/"))return!1;if(Et(s.name),r+=s.originalSize,r>Oi)throw Error("The expanded ZIP must be at most 200 MB.");return Br.test(s.name)}});for(let[s,f]of Object.entries(o))n.push({name:Et(s),bytes:f})}else{if(!Br.test(e))throw Error("Choose MDX, MDL, ZIP, BLP, TGA, PNG, JPG or WebP files.");n.push({name:Et(e),bytes:t})}let a=new Set;for(let o of n){let s=Ze(o.name);if(a.has(s))throw Error("Duplicate path in ZIP: "+o.name);a.add(s)}return n}function $o(e,t,n){let r=Ze(n),i=Ze(t).split("/").slice(0,-1).join("/");for(let f of[i?i+"/"+r:r,r]){let l=e.filter(c=>Ze(c.name)===f);if(l.length===1)return l[0]}let a=e.filter(f=>Ze(f.name).endsWith("/"+r));if(a.length===1)return a[0];let o=r.split("/").at(-1),s=e.filter(f=>Ze(f.name).split("/").at(-1)===o);if(s.length>1)throw Error("More than one texture matches "+n+". Keep its model-relative folder path.");return s[0]}function Yo(e){let t;try{t=/\.mdl$/i.test(e.name)?Fr(new TextDecoder().decode(e.bytes)):Ur(e.bytes.buffer.slice(e.bytes.byteOffset,e.bytes.byteOffset+e.bytes.byteLength))}catch(n){throw Error("Could not read "+e.name+": "+n.message)}if(!t.Geosets?.length)throw Error(e.name+" has no model geometry.");return{name:e.name,sequences:t.Sequences.map(n=>n.Name),geosets:t.Geosets.map((n,r)=>({index:r,vertices:n.Vertices.length/3,triangles:n.Faces.length/3,textures:[]})),textureRefs:[...new Set(t.Textures.filter(n=>n.Image&&![1,2].includes(n.ReplaceableId)).map(n=>n.Image))],bytes:e.bytes.length}}export{Oi as expandedLimit,_i as fileLimit,Et as filePath,Wo as fileType,$o as findTexture,Yo as inspectModel,Xo as modelPattern,Ze as pathKey,qo as sha256,Ko as unpackFile};
