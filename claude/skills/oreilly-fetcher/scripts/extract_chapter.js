// O'Reilly Learning の章ページを markdown に変換して chNN.md としてダウンロードする。
// 使い方: Claude in Chrome の javascript_tool にこのファイルの内容を貼って実行する。
//        末尾の el.download の章番号を対象に合わせて書き換える。
// 戻り値: 'download triggered len=... pres=... figcaps=... tables=... mangled=...'
//   mangled>0 なら <dd> 内コードの崩れ（本スクリプトの mixed() で防いでいるので通常は 0）。
await new Promise(r=>setTimeout(r,2500));
function inl(n){
  if(n.nodeType===3) return n.nodeValue.replace(/\s+/g,' ');
  if(n.nodeType!==1) return '';
  const t=n.tagName.toLowerCase();
  const kids=()=>[...n.childNodes].map(inl).join('');
  if(t==='code'||t==='kbd'||t==='tt') return '`'+n.textContent+'`';
  if(t==='em'||t==='i') return '_'+kids()+'_';
  if(t==='strong'||t==='b') return '**'+kids()+'**';
  if(t==='a'){const h=n.getAttribute('href')||''; const txt=kids(); return h? '['+txt+']('+new URL(h,location.href).href+')':txt;}
  if(t==='sup') return '^'+kids();
  if(t==='br') return '  <br>';
  if(t==='img') return '!['+(n.getAttribute('alt')||'')+']('+n.src+')';
  return kids();
}
const BLOCK=/^(p|pre|ul|ol|div|section|article|blockquote|figure|table|h[1-6]|dl|dd|dt|aside|nav|header|footer)$/;
// インライン要素とブロック要素が混在する親（dd, li, div など）を扱う。
// インラインの連なりは段落に、ブロック子要素は blk() に委ねる。
function mixed(n){ let out='', run=''; for(const c of n.childNodes){ if(c.nodeType===1&&BLOCK.test(c.tagName.toLowerCase())){ if(run.trim()) out+=run.trim()+'\n\n'; run=''; out+=blk(c);} else run+=inl(c);} if(run.trim()) out+=run.trim()+'\n\n'; return out; }
function blk(n){
  if(n.nodeType===3){const s=n.nodeValue.trim(); return s? s+'\n\n':'';}
  if(n.nodeType!==1) return '';
  const t=n.tagName.toLowerCase();
  // O'Reilly の図は <figure><div class="figure"><img><h6>Figure N-M. ...</h6></div></figure>
  if(t==='figure'||(t==='div'&&n.classList.contains('figure'))){const img=n.querySelector('img'); const cap=n.querySelector('figcaption, h6, .caption'); return (img?'!['+(img.getAttribute('alt')||'')+']('+img.src+')\n\n':'')+(cap?'###### '+inl(cap).trim()+'\n\n':'');}
  if(/^h[1-6]$/.test(t)) return '#'.repeat(+t[1])+' '+inl(n).trim()+'\n\n';
  if(t==='p'||t==='dt') return inl(n).trim()+'\n\n';
  if(t==='dd') return mixed(n);
  if(t==='pre') return '```\n'+n.innerText.replace(/\n$/,'')+'\n```\n\n';
  if(t==='ul'||t==='ol'){let i=0; return [...n.children].map(li=>{i++; const inner=mixed(li).trim(); const lines=inner.split('\n'); return (t==='ol'?i+'. ':'- ')+lines[0]+(lines.length>1?'\n'+lines.slice(1).map(l=>l?'    '+l:'').join('\n'):'')+'\n\n';}).join('');}
  if(t==='blockquote') return mixed(n).trim().split('\n').map(l=>'> '+l).join('\n')+'\n\n';
  if(t==='img') return inl(n)+'\n\n';
  if(t==='figcaption') return '###### '+inl(n).trim()+'\n\n';
  if(t==='table'){const cap=n.querySelector('caption'); let s=cap?inl(cap).trim()+'\n':''; const rows=[...n.querySelectorAll('tr')]; rows.forEach((r,ri)=>{const cells=[...r.children].map(c=>inl(c).replace(/\|/g,'\\|').trim()); s+='|'+cells.join('|')+'|\n'; if(ri===0) s+='|'+cells.map(()=>'---').join('|')+'|\n';}); return s+'\n';}
  if(t==='caption') return '';
  if(t==='script'||t==='style'||t==='nav'||t==='button') return '';
  return mixed(n);
}
const a=document.querySelector('article')||document.body;
const md=blk(a).replace(/\n{3,}/g,'\n\n');
const blob=new Blob([md],{type:'text/markdown'}); const el=document.createElement('a'); el.href=URL.createObjectURL(blob); el.download='chNN.md'; document.body.appendChild(el); el.click(); el.remove();
'download triggered len='+md.length+' pres='+a.querySelectorAll('pre').length+' figcaps='+(md.match(/^###### /gm)||[]).length+' tables='+(md.match(/^\|---/gm)||[]).length+' mangled='+(md.match(/`` ``/g)||[]).length
