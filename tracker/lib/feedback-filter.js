// Message rules for MDLxL problem reports. The term list is private: it is stored in the D1 table
// feedback_terms and never in Git. A report that matches is answered as if it was saved and is not stored.
// Term syntax: "word" a whole word or phrase · "^start" words that begin with it · "~part" anywhere ·
// "=exact" matched before accents, look-alike letters and digits are folded. Chinese, Japanese and Korean
// terms always match anywhere. Hebrew and Arabic words also match with attached prefixes and plural endings.

const INVISIBLE=/[­͏؜ᅟᅠ឴឵᠋-᠏​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ\u{E0000}-\u{E007F}]/gu;
const LETTERS={'ß':'ss','æ':'ae','œ':'oe','ø':'o','ł':'l','đ':'d','ð':'d','þ':'th','ı':'i','ſ':'s',
 'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ','ة':'ه','ى':'ي','ک':'ك','ی':'ي','ـ':''};
const LEET={'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','@':'a','$':'s','!':'i','|':'i','€':'e','¡':'i'};
// Cyrillic and Greek letters that look like Latin ones.
const LOOK={'а':'a','в':'b','е':'e','к':'k','м':'m','н':'h','о':'o','р':'p','с':'c','т':'t','у':'y','х':'x','і':'i','ј':'j','ѕ':'s','ԁ':'d','ɡ':'g',
 'α':'a','β':'b','ε':'e','η':'n','ι':'i','κ':'k','ν':'v','ο':'o','ρ':'p','τ':'t','υ':'u','χ':'x','ω':'w'};
const CJK=/[぀-ヿ㐀-鿿가-힯豈-﫿]/u,HEBREW=/^[֐-׿]/u,ARABIC=/^[؀-ۿ]/u;
const STRETCH=/[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}]/u;
const NOT_WORD='(?<![\\p{L}\\p{N}])',END='(?![\\p{L}\\p{N}])';
const HE_PREFIX='(?:[\\u05D5\\u05D4\\u05D1\\u05DB\\u05DC\\u05DE\\u05E9]{1,3})?',HE_SUFFIX='(?:\\u05D9\\u05DE|\\u05D5\\u05EA|\\u05D9\\u05EA|\\u05D9\\u05D5\\u05EA|\\u05D9|\\u05D4)?';
const AR_PREFIX='(?:[\\u0648\\u0641\\u0628\\u0644\\u0643]?(?:\\u0627\\u0644|\\u0644\\u0644)?)',AR_SUFFIX='(?:\\u064A\\u0646|\\u0648\\u0646|\\u0627\\u062A|\\u064A\\u0647|\\u064A|\\u0647)?';
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const map=(table,value)=>[...value].map(char=>table[char]??char).join('');

// Spaced-out single letters of one script are joined (b a n a n a); "X, Y и Z" mixes scripts and stays apart.
const SCRIPTS=[/\p{Script=Latin}/u,/\p{Script=Cyrillic}/u,/\p{Script=Greek}/u,/\p{Script=Hebrew}/u,/\p{Script=Arabic}/u];
const join=match=>{const letters=match.replace(/[^\p{L}]/gu,'');return SCRIPTS.some(script=>[...letters].every(letter=>script.test(letter)))?letters:match;};
// Lower case without accents, invisible characters or letter variants.
export function base(text){
 let value=map(LETTERS,String(text).normalize('NFKD').replace(INVISIBLE,'').replace(/\p{M}/gu,'').toLowerCase());
 value=value.replace(/(?<=[א-ת])["'׳״‘’“”](?=[א-ת])/gu,'');
 value=value.replace(/(?<![\p{L}\p{N}])\p{L}(?:[\s._\-/\\|+~:;·•'"]+\p{L}(?![\p{L}\p{N}])){2,}/gu,join);
 return value.replace(/\s+/gu,' ');
}
const leet=value=>map(LEET,value).replace(/(?<=\p{L})[.\-_*'`"’~^+]+(?=\p{L})/gu,'');
const look=value=>map(LOOK,value);
const VARIANTS=[value=>value,leet,look,value=>look(leet(value))];

function parse(raw){
 const term=String(raw).trim();if(!term)return null;
 const mode={'^':'start','~':'part','=':'exact'}[term[0]]||'word',text=mode==='word'?term:term.slice(1).trim();
 return text?{mode,text}:null;
}
function pattern(terms,mode){
 if(!terms.length)return null;
 // Each Latin, Cyrillic or Greek letter may repeat (baaanana), but a doubled letter still needs two (a term with "ll" never matches one "l").
 const stretch=char=>char===' '?'[^\\p{L}\\p{N}]*':STRETCH.test(char)?escape(char)+'+':escape(char);
 const words=terms.map(term=>[...term].map(stretch).join('')).sort((a,b)=>b.length-a.length).join('|');
 if(mode==='part')return `(?:${words})`;
 if(mode==='hebrew')return `${NOT_WORD}${HE_PREFIX}(?:${words})${HE_SUFFIX}${END}`;
 if(mode==='arabic')return `${NOT_WORD}${AR_PREFIX}(?:${words})${AR_SUFFIX}${END}`;
 if(mode==='hebrew-start')return `${NOT_WORD}${HE_PREFIX}(?:${words})`;
 if(mode==='arabic-start')return `${NOT_WORD}${AR_PREFIX}(?:${words})`;
 return `${NOT_WORD}(?:${words})${mode==='word'?END:''}`;
}
function compileVariant(entries,variant,index){
 const groups={};
 for(const {mode,text} of entries){
  const term=variant(base(text));
  // Folding must not turn a term into an ordinary short word, so short folded terms only match unfolded.
  if(index>0&&term!==base(text)&&term.replace(/[^\p{L}]/gu,'').length<3&&!CJK.test(term))continue;
  const kind=CJK.test(term)?'part':mode==='part'?'part':HEBREW.test(term)?(mode==='start'?'hebrew-start':'hebrew'):ARABIC.test(term)?(mode==='start'?'arabic-start':'arabic'):mode;
  (groups[kind]??=new Set()).add(term);
 }
 const source=Object.entries(groups).map(([kind,set])=>pattern([...set],kind)).filter(Boolean).join('|');
 return source?new RegExp(source,'u'):null;
}
// Words hidden with * or # (b*nana, b***) are compared letter by letter with each whole term, also with a
// common ending for start and part terms (gr*pes). Markdown bold (**word**, word**) is not a mask: the
// word must begin with a letter and hide a letter inside it, or end in three or more marks.
const ENDINGS=['','s','es','ed','er','ers','ing','in','y'];
function maskedMatch(text,entries){
 const tokens=text.split(/[^\p{L}*#]+/u).filter(token=>token.length>=3&&/^\p{L}/u.test(token)&&(/\p{L}[*#]+\p{L}/u.test(token)||/^[^*#]+[*#]{3,}$/u.test(token)));
 if(!tokens.length)return false;
 const plain=entries.map(entry=>({mode:entry.mode,text:base(entry.text)})).filter(({text})=>!/ /.test(text));
 return tokens.slice(0,200).some(token=>{
  const pattern=new RegExp('^'+[...token].map(char=>/[*#]/.test(char)?'\\p{L}{1,2}':escape(char)).join('')+'$','u');
  return plain.some(({mode,text})=>(mode==='word'?['']:ENDINGS).some(ending=>pattern.test(text+ending)));
 });
}

const compiled=new Map();
export function compileRules(list=[]){
 const key=list.join('\n');if(compiled.has(key))return compiled.get(key);
 const entries=list.map(parse).filter(Boolean),exact=entries.filter(entry=>entry.mode==='exact'),folded=entries.filter(entry=>entry.mode!=='exact');
 const regexes=VARIANTS.map((variant,index)=>compileVariant(folded,variant,index));
 const raw=exact.length?new RegExp(exact.map(({text})=>{const value=escape(text.normalize('NFC').toLowerCase());return /^[\p{L}\p{N}]/u.test(text)&&/[\p{L}\p{N}]$/u.test(text)&&!CJK.test(text)?`${NOT_WORD}${value}${END}`:value;}).join('|'),'u'):null;
 const rules={
  size:entries.length,
  blocks(text){
   const value=String(text||'');if(!value||!entries.length)return false;
   if(raw?.test(value.normalize('NFC').replace(INVISIBLE,'').toLowerCase()))return true;
   const clean=base(value);
   if(VARIANTS.some((variant,index)=>regexes[index]?.test(variant(clean))))return true;
   return maskedMatch(clean,folded);
  }
 };
 if(compiled.size>8)compiled.clear();
 compiled.set(key,rules);return rules;
}
