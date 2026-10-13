// 既存 markdown 抽出のコード欠損を修復するための補助。
// ページ内の <pre> をすべて、マーカー付きテキストの <pre> に置き換える（表示は壊れるが再読込で戻る）。
// 実行後に get_page_text で読み取り、結果を code_chNN.txt に保存して fill_code.py に渡す。
//   ⟦CODE i⟧...⟦/CODE⟧ : i 番目のコードブロック
//   ␣ : 行頭スペース1個   ⏎ : 改行   （get_page_text が空白を潰すため）
// 表に <sup>（2^8 など上付き文字）がある章は ⟦TABLE⟧ も出力する。
// 注意: javascript_tool の戻り値にコードを載せると「Cookie/query string data」としてブロックされる
//       ため、戻り値は件数だけにし、本文は get_page_text で取る。
await new Promise(r=>setTimeout(r,2500));
const art=document.querySelector('article')||document.body;
art.querySelectorAll('sup').forEach(s=>{s.textContent='^'+s.textContent;});
const pres=[...art.querySelectorAll('pre')];
const out=pres.map((p,i)=>{
  const t=p.innerText.replace(/\n$/,'');
  const enc=t.split('\n').map(l=>{const m=l.match(/^( *)(.*)$/); return '␣'.repeat(m[1].length)+m[2];}).join('⏎');
  return '⟦CODE '+i+'⟧'+enc+'⟦/CODE⟧';
});
const tables=[...art.querySelectorAll('table')].filter(t=>t.querySelector('sup')).map((t,i)=>{
  const cap=(t.querySelector('caption')||{}).innerText||'';
  const rows=[...t.querySelectorAll('tr')].map(r=>[...r.querySelectorAll('th,td')].map(c=>c.innerText.replace(/\s+/g,' ').trim()).join(' | '));
  return '⟦TABLE '+i+' '+cap.trim()+'⟧'+rows.join('⏎')+'⟦/TABLE⟧';
});
art.innerHTML='';
out.concat(tables).forEach(s=>{const d=document.createElement('pre'); d.textContent=s; art.appendChild(d);});
pres.length+' pres, '+tables.length+' tables'
