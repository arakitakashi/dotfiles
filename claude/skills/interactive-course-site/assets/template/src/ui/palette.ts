import type { Course } from '../types';
import { icon } from '../engine/icons';
import { escapeHtml } from './richtext';
import { chapterLabel, type Strings } from './i18n';
import { isLessonDone, type Progress } from './progress';
import { buildIndex, search, type Hit, type Index } from './search';

/** ⌘K の検索パレット。ステップ単位でヒットし、空の入力では全レッスンを一覧する。 */
export class Palette {
  private dlg: HTMLDialogElement;
  private input: HTMLInputElement;
  private list: HTMLElement;
  private index: Index | null = null;
  private hits: { href: string }[] = [];
  private sel = 0;

  constructor(host: HTMLElement, private course: Course, private t: Strings, private progress: () => Progress) {
    this.dlg = document.createElement('dialog');
    this.dlg.className = 'palette';
    this.dlg.setAttribute('aria-label', t.searchLabel);
    this.dlg.innerHTML = `
      <div class="palette__bar">${icon('search', 17)}
        <input type="text" role="combobox" aria-expanded="true" aria-controls="px-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="${t.searchPlaceholder}">
        <kbd>esc</kbd></div>
      <div class="palette__list" id="px-list" role="listbox"></div>
      <div class="palette__foot"><span><kbd>↑</kbd><kbd>↓</kbd> ${t.navMove}</span><span><kbd>↵</kbd> ${t.navOpen}</span><span><kbd>esc</kbd> ${t.navClose}</span></div>`;
    host.appendChild(this.dlg);
    this.input = this.dlg.querySelector('input')!;
    this.list = this.dlg.querySelector('.palette__list')!;
    this.input.addEventListener('input', () => this.render());
    this.dlg.addEventListener('click', (ev) => {
      if (ev.target === this.dlg) return this.close(); // 外側（backdrop）のクリック
      const chip = (ev.target as Element).closest<HTMLElement>('[data-q]');
      if (chip) { this.input.value = chip.dataset.q!; this.render(); this.input.focus(); return; }
      const row = (ev.target as Element).closest<HTMLElement>('[data-i]');
      if (row) this.pick(Number(row.dataset.i));
    });
    this.dlg.addEventListener('keydown', (ev) => {
      // 日本語などの変換中の Enter や矢印は、候補の確定・選択に使われる
      if (ev.isComposing || ev.keyCode === 229) return;
      if (ev.key === 'ArrowDown' || (ev.ctrlKey && ev.key === 'n')) { ev.preventDefault(); this.move(1); }
      else if (ev.key === 'ArrowUp' || (ev.ctrlKey && ev.key === 'p')) { ev.preventDefault(); this.move(-1); }
      else if (ev.key === 'Enter') { ev.preventDefault(); this.pick(this.sel); }
    });
  }

  get isOpen(): boolean { return this.dlg.open; }
  toggle(): void { this.isOpen ? this.close() : this.open(); }
  close(): void { this.dlg.close(); }

  open(): void {
    this.index ??= buildIndex(this.course);
    this.input.value = '';
    this.dlg.showModal();
    this.render();
    this.input.focus();
  }

  private move(d: number): void {
    if (!this.hits.length) return;
    this.sel = (this.sel + d + this.hits.length) % this.hits.length;
    this.mark();
  }

  private mark(): void {
    this.list.querySelectorAll<HTMLElement>('[data-i]').forEach((r) => {
      const on = Number(r.dataset.i) === this.sel;
      r.classList.toggle('is-sel', on);
      r.setAttribute('aria-selected', String(on));
      if (on) { r.scrollIntoView({ block: 'nearest' }); this.input.setAttribute('aria-activedescendant', r.id); }
    });
  }

  private pick(i: number): void {
    const h = this.hits[i];
    if (!h) return;
    this.close();
    location.hash = h.href;
  }

  private hl(text: string, q: string): string {
    const safe = escapeHtml(text);
    const w = q.trim().split(/\s+/)[0];
    if (!w) return safe;
    const at = safe.toLowerCase().indexOf(escapeHtml(w).toLowerCase());
    return at < 0 ? safe : `${safe.slice(0, at)}<mark>${safe.slice(at, at + escapeHtml(w).length)}</mark>${safe.slice(at + escapeHtml(w).length)}`;
  }

  private render(): void {
    const q = this.input.value;
    const t = this.t;
    this.sel = 0;
    if (!q.trim()) {
      // 空の入力: モジュール別の全レッスン一覧
      const p = this.progress();
      let i = 0;
      this.hits = [];
      this.list.innerHTML = this.course.modules.map((m) => `<p class="palette__group">${escapeHtml(m.title)}</p>` + m.lessons.map((l) => {
        this.hits.push({ href: `#/${l.id}/1` });
        const done = isLessonDone(p, l);
        return `<div class="hit" role="option" id="px-${i}" data-i="${i++}"><span class="hit__ico" data-hue="${m.hue}">${icon(done ? 'check' : 'book', 15)}</span>`
          + `<span class="hit__main"><b>${escapeHtml(l.title)}</b><small>${escapeHtml(l.summary)}</small></span><span class="hit__meta">${l.steps.length} ${t.steps}</span></div>`;
      }).join('')).join('');
      this.mark();
      return;
    }
    const hits: Hit[] = search(this.index!, q);
    this.hits = hits;
    if (!hits.length) {
      const tips = Object.keys(this.course.glossary).slice(0, 5);
      this.list.innerHTML = `<div class="palette__empty"><p><b>「${escapeHtml(q)}」</b>${t.searchEmpty}</p><p class="muted">${t.searchTry}</p>`
        + `<p>${tips.map((x) => `<button class="chipbtn" data-q="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join('')}</p></div>`;
      return;
    }
    this.list.innerHTML = hits.map((h, i) => {
      const badge = h.type === 'step'
        ? `<span class="hit__ico hit__ico--step" data-chapter="${h.chapter}">${h.step}</span>`
        : `<span class="hit__ico">${icon(h.type === 'term' ? 'term' : 'book', 15)}</span>`;
      const meta = h.type === 'step' ? `${escapeHtml(h.meta)} · ${chapterLabel(this.course.lang, h.chapter!)}` : h.type === 'term' ? t.glossary : escapeHtml(h.meta);
      return `<div class="hit" role="option" id="px-${i}" data-i="${i}">${badge}<span class="hit__main"><b>${this.hl(h.title, q)}</b><small>${this.hl(h.excerpt, q)}</small></span><span class="hit__meta">${meta}</span></div>`;
    }).join('');
    this.mark();
  }
}
