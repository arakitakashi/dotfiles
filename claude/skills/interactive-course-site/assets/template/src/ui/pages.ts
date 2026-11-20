import type { Course } from '../types';
import { icon } from '../engine/icons';
import { escapeHtml, rich, termsIn } from './richtext';
import type { Strings } from './i18n';

/** チートシート: 各レッスンの recap（要点と表）を自動で集める。書き足す必要はない。 */
export function renderCheatsheet(course: Course, t: Strings): string {
  const mods = course.modules.map((m, mi) => {
    const cards = m.lessons.map((l) => {
      const recaps = l.steps.filter((s) => s.takeaways?.length || (s.chapter === 'recap' && s.table));
      if (!recaps.length) return '';
      const body = recaps.map((s) =>
        (s.takeaways ? `<ul class="takeaways">${s.takeaways.map((x) => `<li>${rich(x)}</li>`).join('')}</ul>` : '')
        + (s.table ? `<div class="tablewrap"><table class="compare"><thead><tr>${s.table[0].map((c) => `<th>${rich(c)}</th>`).join('')}</tr></thead><tbody>${s.table.slice(1).map((r) => `<tr>${r.map((c, k) => (k ? `<td>${rich(c)}</td>` : `<th scope="row">${rich(c)}</th>`)).join('')}</tr>`).join('')}</tbody></table></div>` : '')).join('');
      return `<article class="sheetcard"><h3>${escapeHtml(l.title)}</h3><p class="muted">${escapeHtml(l.summary)}</p>${body}`
        + `<a class="sheetcard__link" href="#/${l.id}/1">${t.seeLesson}${icon('arrow-right', 13)}</a></article>`;
    }).join('');
    return cards ? `<section class="pagesec" data-hue="${m.hue}"><h2><span class="mod__dot"></span>${String(mi + 1).padStart(2, '0')}. ${escapeHtml(m.title)}</h2><div class="sheetgrid">${cards}</div></section>` : '';
  }).join('');
  return `<header class="pagehead"><h1 class="title">${t.cheatsheet}</h1><p class="subtitle">${t.cheatsheetLead}</p></header>${mods}`;
}

/** 用語集: Course.glossary の定義と、その用語が登場するステップへのリンク。 */
export function renderGlossary(course: Course, t: Strings): string {
  const uses = new Map<string, { href: string; label: string }[]>();
  for (const m of course.modules) for (const l of m.lessons) l.steps.forEach((s, i) => {
    const text = [...s.body, s.callout?.text ?? '', ...(s.takeaways ?? [])].join(' ');
    for (const term of termsIn(text)) {
      const list = uses.get(term) ?? uses.set(term, []).get(term)!;
      if (list.length < 4) list.push({ href: `#/${l.id}/${i + 1}`, label: `${l.title} · ${i + 1}` });
    }
  });
  const items = Object.entries(course.glossary)
    .sort(([a], [b]) => a.localeCompare(b, course.lang))
    .map(([term, def]) => `<div class="gloss" data-term="${escapeHtml(term)}"><dt><span class="term">${escapeHtml(term)}</span></dt><dd><p>${rich(def)}</p>`
      + (uses.get(term)?.length ? `<p class="gloss__uses"><span class="muted">${t.appearsIn}</span>${uses.get(term)!.map((u) => `<a class="xref" href="${u.href}">${escapeHtml(u.label)}</a>`).join('')}</p>` : '')
      + '</dd></div>').join('');
  return `<header class="pagehead"><h1 class="title">${t.glossary}</h1><p class="subtitle">${t.glossaryLead}</p></header><dl class="glosslist">${items}</dl>`;
}
