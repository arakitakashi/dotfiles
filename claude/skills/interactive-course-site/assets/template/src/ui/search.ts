import type { Chapter, Course } from '../types';
import { plain } from './richtext';

export interface Hit {
  type: 'lesson' | 'step' | 'term';
  title: string;
  /** 一致箇所の周辺。term では定義文 */
  excerpt: string;
  /** 移動先 */
  href: string;
  lesson?: string;
  step?: number;
  chapter?: Chapter;
  meta: string;
  score: number;
}

interface Doc {
  hit: Omit<Hit, 'score' | 'excerpt'>;
  /** [重み, 小文字化した本文, 元の本文] */
  fields: [number, string, string][];
}

export type Index = Doc[];

const norm = (s: string): string => s.toLowerCase().normalize('NFKC');

export function buildIndex(course: Course): Index {
  const docs: Doc[] = [];
  const f = (w: number, s: string): [number, string, string] => [w, norm(s), s];
  for (const m of course.modules) {
    for (const l of m.lessons) {
      docs.push({
        hit: { type: 'lesson', title: l.title, href: `#/${l.id}/1`, lesson: l.id, meta: m.title },
        fields: [f(10, l.title), f(10, l.id), f(4, l.summary), f(3, m.title), f(3, l.goals.map((g) => g.text).join(' '))],
      });
      l.steps.forEach((s, i) => docs.push({
        hit: { type: 'step', title: s.title, href: `#/${l.id}/${i + 1}`, lesson: l.id, step: i + 1, chapter: s.chapter, meta: `${l.title} · ${i + 1}` },
        fields: [
          f(8, s.title), f(6, s.short), f(3, s.body.map(plain).join(' ')), f(2, s.callout ? plain(s.callout.text) : ''),
          f(1.5, (s.changes ?? []).join(' ')), f(1.5, (s.takeaways ?? []).map(plain).join(' ')), f(1, l.id), f(1, s.alt),
        ],
      }));
    }
  }
  for (const [term, def] of Object.entries(course.glossary ?? {})) {
    docs.push({
      hit: { type: 'term', title: term, href: `#/~glossary/${encodeURIComponent(term)}`, meta: '' },
      fields: [f(12, term), f(2, def)],
    });
  }
  return docs;
}

function excerptOf(fields: Doc['fields'], word: string): string {
  // 見出し以外で最初に一致した文を返す
  for (const [, low, raw] of fields.slice(2)) {
    const at = low.indexOf(word);
    if (at < 0) continue;
    const start = Math.max(0, at - 24);
    return (start ? '…' : '') + raw.slice(start, at + 56) + (at + 56 < raw.length ? '…' : '');
  }
  return fields[2]?.[2].slice(0, 72) ?? '';
}

export function search(index: Index, query: string, limit = 24): Hit[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: Hit[] = [];
  for (const doc of index) {
    let score = 0;
    let ok = true;
    for (const w of words) {
      let best = 0;
      for (const [weight, low] of doc.fields) {
        const at = low.indexOf(w);
        if (at < 0) continue;
        // 語頭での一致と完全一致を優遇する
        const bonus = low === w ? 2 : at === 0 ? 1.4 : 1;
        best = Math.max(best, weight * bonus);
      }
      if (!best) { ok = false; break; }
      score += best;
    }
    if (!ok) continue;
    const excerpt = doc.hit.type === 'term' ? doc.fields[1][2] : excerptOf(doc.fields, words[0]);
    hits.push({ ...doc.hit, excerpt, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
