/**
 * 本文用の最小限の記法。レッスンのデータに生の HTML を書かせないためのもの。
 *
 *   **太字**            数値やキーワードの強調
 *   ==用語==            新出用語。蛍光ペンの下線が付き、用語集（Course.glossary）へリンクする
 *   `code`              識別子・コマンド
 *   *強調*              他レッスンの名前など
 *   [[lesson-id#3|文]]  レッスン（とステップ）へのリンク。#3 は省略可
 */
const escMap: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escapeHtml = (s: string): string => s.replace(/[&<>"]/g, (c) => escMap[c]);

export function rich(src: string): string {
  // コードの中身は他の記法に触らせない
  return src.split(/(`[^`]+`)/).map((part) => {
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
    return escapeHtml(part)
      .replace(/\[\[([\w-]+)(?:#(\d+))?\|([^\]]+)\]\]/g, (_m, id, step, label) => `<a class="xref" href="#/${id}/${step ?? 1}">${label}</a>`)
      .replace(/==([^=]+)==/g, (_m, t) => `<a class="term" href="#/~glossary/${encodeURIComponent(t)}">${t}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }).join('');
}

/** 記法を取り除いた素の文字列（検索・読み上げ・文字数の検証に使う）。 */
export function plain(src: string): string {
  return src
    .replace(/\[\[[\w-]+(?:#\d+)?\|([^\]]+)\]\]/g, '$1')
    .replace(/==([^=]+)==/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

export function termsIn(src: string): string[] {
  return [...new Set([...src.matchAll(/==([^=]+)==/g)].map((m) => m[1]))];
}

export function xrefsIn(src: string): { lesson: string; step: number }[] {
  return [...src.matchAll(/\[\[([\w-]+)(?:#(\d+))?\|/g)].map((m) => ({ lesson: m[1], step: Number(m[2] ?? 1) }));
}
