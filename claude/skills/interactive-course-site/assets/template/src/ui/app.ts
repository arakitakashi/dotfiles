import type { Course, Lesson, Module, Scene, Step } from '../types';
import { Stage } from '../engine/stage';
import { icon } from '../engine/icons';
import { escapeHtml, rich } from './richtext';
import { chapterLabel, levelLabel, strings, type Strings } from './i18n';
import { courseStats, isLessonDone, loadProgress, markStep, recordAnswer, saveProgress, type Progress } from './progress';
import { Palette } from './palette';
import { renderCheatsheet, renderGlossary } from './pages';

type Route =
  | { view: 'learn'; lesson: string; step: number }
  | { view: 'cheatsheet' }
  | { view: 'glossary'; term?: string };

interface Flat { lesson: Lesson; module: Module; mi: number; li: number }

const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string): T => root.querySelector(sel) as T;

export class App {
  private t: Strings;
  private flat: Flat[] = [];
  private progress: Progress;
  private stage: Stage | null = null;
  private lesson: Lesson | null = null;
  private stepIdx = -1;
  private openModule = '';
  private knobValues = new Map<string, Record<string, number>>();
  private shown: Record<string, number | string | null> = {};
  private palette: Palette;
  private reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
  private dir: 1 | -1 = 1;

  constructor(private root: HTMLElement, private course: Course) {
    this.t = strings(course.lang);
    course.modules.forEach((module, mi) => module.lessons.forEach((lesson, li) => this.flat.push({ lesson, module, mi, li })));
    this.progress = loadProgress(`course:${course.id}`);
    document.documentElement.lang = course.lang;
    document.documentElement.dir = /^(ar|he|fa|ur)\b/.test(course.lang) ? 'rtl' : 'ltr';
    document.documentElement.dataset.palette = course.theme;
    document.title = course.title.replace(/[{}]/g, '');
    this.root.innerHTML = this.shell();
    this.palette = new Palette(document.body, course, this.t, () => this.progress);
    this.bind();
    // ページ内リンク（#guide など）はルートではないので無視する
    addEventListener('hashchange', () => { if (!location.hash || location.hash.startsWith('#/')) this.onRoute(); });
    this.onRoute();
  }

  /* ───────── ルーティング ───────── */

  private parse(): Route {
    let h = '';
    // 壊れた URL（不正な % 表記）でも落とさず、既定の行き先へ回す
    try { h = decodeURIComponent(location.hash.replace(/^#\/?/, '')); } catch { /* 既定へ */ }
    if (h.startsWith('~cheatsheet')) return { view: 'cheatsheet' };
    if (h.startsWith('~glossary')) return { view: 'glossary', term: h.split('/')[1] };
    const m = /^([\w-]+)(?:\/(\d+))?$/.exec(h);
    const found = m && this.flat.find((f) => f.lesson.id === m[1]);
    if (found) return { view: 'learn', lesson: found.lesson.id, step: Math.min(found.lesson.steps.length, Math.max(1, Number(m![2] ?? 1))) - 1 };
    // 何も指定がなければ、前回の続きから始める（入口のページを挟まない）
    const last = this.progress.last && this.flat.find((f) => f.lesson.id === this.progress.last!.lesson);
    return last
      ? { view: 'learn', lesson: last.lesson.id, step: Math.min(last.lesson.steps.length - 1, this.progress.last!.step) }
      : { view: 'learn', lesson: this.flat[0].lesson.id, step: 0 };
  }

  private onRoute(): void {
    const r = this.parse();
    const app = $(this.root, '.app');
    app.dataset.view = r.view;
    this.root.querySelectorAll<HTMLAnchorElement>('.nav a').forEach((a) => {
      const on = a.dataset.view === r.view;
      a.classList.toggle('is-on', on);
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });
    this.closeDrawer();
    if (r.view === 'learn') {
      const f = this.flat.find((x) => x.lesson.id === r.lesson)!;
      const lessonChanged = this.lesson !== f.lesson;
      this.dir = !lessonChanged && r.step < this.stepIdx ? -1 : 1;
      if (lessonChanged) this.mountLesson(f);
      this.showStep(r.step, lessonChanged);
    } else {
      const page = $(this.root, '.page');
      page.innerHTML = r.view === 'cheatsheet' ? renderCheatsheet(this.course, this.t) : renderGlossary(this.course, this.t);
      this.renderSidebar();
      if (r.view === 'glossary' && r.term) {
        const target = page.querySelector<HTMLElement>(`[data-term="${CSS.escape(r.term)}"]`);
        target?.classList.add('is-target');
        target?.scrollIntoView({ block: 'center' });
      } else page.scrollTop = 0;
    }
  }

  private go(lesson: string, step: number): void {
    location.hash = `#/${lesson}/${step + 1}`;
  }

  /* ───────── 骨組み ───────── */

  private brand(): string {
    const name = escapeHtml(this.course.title).replace(/\{([^}]+)\}/g, '<mark>$1</mark>');
    return `<a class="brand" href="#/${this.flat[0].lesson.id}/1"><span class="brand__logo" aria-hidden="true"><i></i><i></i><i></i></span><span class="brand__name">${name}</span></a>`;
  }

  private shell(): string {
    const t = this.t;
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    return `
<a class="skip" href="#guide" data-act="skip">${t.skip}</a>
<div class="app" data-view="learn">
  <header class="topbar">
    <button class="iconbtn drawer-btn" data-act="drawer" aria-label="${t.menu}" aria-expanded="false">${icon('menu', 18)}</button>
    ${this.brand()}
    <nav class="nav" aria-label="${t.menu}">
      <a data-view="learn" href="#/" aria-label="${t.learn}" title="${t.learn}">${icon('book')}<span>${t.learn}</span></a>
      <a data-view="cheatsheet" href="#/~cheatsheet" aria-label="${t.cheatsheet}" title="${t.cheatsheet}">${icon('cheatsheet')}<span>${t.cheatsheet}</span></a>
      <a data-view="glossary" href="#/~glossary" aria-label="${t.glossary}" title="${t.glossary}">${icon('term')}<span>${t.glossary}</span></a>
    </nav>
    <button class="searchbtn" data-act="search" aria-label="${t.searchLabel}">${icon('search')}<span>${t.searchPlaceholder}</span><kbd>${mac ? '⌘' : 'Ctrl'} K</kbd></button>
    <button class="iconbtn" data-act="theme" aria-label="${t.themeDark}">${icon('moon', 17)}</button>
  </header>
  <aside class="sidebar" aria-label="${t.course}"></aside>
  <main class="sheet" id="main">
    <header class="lhead"></header>
    <section class="stage" aria-label="${t.inThisLesson}">
      <div class="hud" role="group"></div>
      <div class="stage__tools">
        <button class="tool tool--fit" data-act="fit" aria-label="${t.fit}" hidden>${icon('fit', 14)}<span>${t.fit}</span></button>
        <button class="tool" data-act="zoom-out" aria-label="${t.zoomOut}" title="${t.zoomOut}">${icon('minus', 14)}</button>
        <button class="tool" data-act="zoom-in" aria-label="${t.zoomIn}">${icon('plus', 14)}</button>
        <button class="tool" data-act="replay" aria-label="${t.replay}">${icon('replay', 14)}<span>${t.replay}</span></button>
        <button class="tool" data-act="pause" aria-label="${t.pause}" aria-pressed="false">${icon('pause', 14)}<span>${t.pause}</span></button>
      </div>
      <div class="stage__host"></div>
      <div class="legend"></div>
    </section>
    <nav class="timeline" aria-label="${t.inThisLesson}"></nav>
  </main>
  <aside class="rail">
    <article class="guide" id="guide" tabindex="-1"></article>
    <section class="goals"></section>
  </aside>
  <main class="page" tabindex="-1"></main>
</div>
<div class="scrim" data-act="drawer-close" hidden></div>
<div class="sr-only" aria-live="polite" id="live"></div>`;
  }

  /* ───────── サイドバー ───────── */

  private renderSidebar(): void {
    const t = this.t;
    const stats = courseStats(this.progress, this.course);
    const cur = this.lesson?.id;
    const mods = this.course.modules.map((m, mi) => {
      const open = m.id === this.openModule;
      const done = m.lessons.filter((l) => isLessonDone(this.progress, l)).length;
      const items = m.lessons.map((l) => {
        const isDone = isLessonDone(this.progress, l);
        const on = l.id === cur;
        return `<li><a class="lesson-link${on ? ' is-on' : ''}${isDone ? ' is-done' : ''}" href="#/${l.id}/1"${on ? ' aria-current="true"' : ''}>`
          + `<span class="lesson-link__mark">${isDone ? icon('check', 11) : ''}</span><span>${escapeHtml(l.title)}</span></a></li>`;
      }).join('');
      return `<li class="mod${open ? ' is-open' : ''}" data-hue="${m.hue}">
        <button class="mod__head" data-act="module" data-id="${m.id}" aria-expanded="${open}">
          ${icon('chevron-right', 13)}<span class="mod__dot"></span>
          <span class="mod__title"><span class="mod__num">${String(mi + 1).padStart(2, '0')}</span>${escapeHtml(m.title)}</span>
          <span class="mod__count">${done}/${m.lessons.length}</span>
        </button>
        <div class="mod__body"${open ? '' : ' inert'}><ul>${items}</ul></div>
      </li>`;
    }).join('');
    const pct = stats.lessons ? (stats.done / stats.lessons) * 100 : 0;
    $(this.root, '.sidebar').innerHTML = `
      <div class="sidebar__head"><span>${t.course}</span><span class="muted">${stats.lessons} ${t.lessons}</span></div>
      <ul class="mods">${mods}</ul>
      <div class="pcard">
        <div class="pcard__row"><span>${t.progress}</span><b>${stats.done} / ${stats.lessons}</b></div>
        <div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="${stats.lessons}" aria-valuenow="${stats.done}" aria-label="${t.progress}"><i style="width:${pct}%"></i></div>
        ${stats.predicts ? `<div class="pcard__row pcard__row--sub"><span>${t.predictScore}</span><b>${stats.correct} / ${stats.predicts}</b></div>` : ''}
      </div>`;
  }

  /* ───────── レッスン ───────── */

  private mountLesson(f: Flat): void {
    const t = this.t, l = f.lesson, lang = this.course.lang;
    this.lesson = l;
    this.stepIdx = -1;
    this.openModule = f.module.id;
    this.shown = {};
    $(this.root, '.lhead').innerHTML = `
      <p class="crumb"><span>${String(f.mi + 1).padStart(2, '0')}. ${escapeHtml(f.module.title)}</span><i>/</i><span>${t.lesson} ${f.li + 1} / ${f.module.lessons.length}</span></p>
      <div class="lhead__row">
        <h1 class="title">${escapeHtml(l.title)}</h1>
        <ul class="tags">
          <li class="tag" data-hue="sand">${icon('clock', 13)}${l.minutes} ${t.min}</li>
          <li class="tag" data-hue="green">${icon('chart', 13)}${levelLabel(lang, l.level)}</li>
          <li class="tag" data-hue="violet">${icon('list', 13)}${l.steps.length} ${t.steps}</li>
        </ul>
      </div>
      <p class="subtitle">${escapeHtml(l.summary)}</p>`;
    $(this.root, '.hud').innerHTML = l.metrics.map((k) => {
      const d = this.course.metrics[k];
      return `<div class="chip" data-metric="${k}" data-tone="neutral"><span class="chip__label">${d?.icon ? icon(d.icon, 11) : ''}${escapeHtml(d?.label ?? k)}</span><span class="chip__value">—</span></div>`;
    }).join('');
    $(this.root, '.timeline').innerHTML = `<div class="timeline__head"><span>${t.inThisLesson}</span><span class="timeline__pos"></span></div>
      <ol class="timeline__track"><i class="timeline__rail"><i></i></i>${l.steps.map((s, i) =>
        `<li><a class="tdot" data-chapter="${s.chapter}" href="#/${l.id}/${i + 1}" title="${escapeHtml(s.title)}"><span class="tdot__n">${i + 1}</span><span class="tdot__label">${escapeHtml(s.short)}</span></a></li>`).join('')}</ol>`;
    $(this.root, '.goals').innerHTML = `<h2 class="eyebrow">${t.youllLearn}</h2><ul>${l.goals.map((g) =>
      `<li data-step="${g.step}"><i class="cbox">${icon('check', 11)}</i><span>${escapeHtml(g.text)}</span></li>`).join('')}</ul>`;
    this.stage?.destroy();
    this.stage = new Stage($(this.root, '.stage__host'), this.course, () => this.reducedMq.matches, {
      onZoomChange: (z) => { $<HTMLButtonElement>(this.root, '[data-act="fit"]').hidden = !z; },
    });
    this.setPaused(false);
  }

  private key(i: number): string { return `${this.lesson!.id}:${i}`; }
  private answered(i: number): boolean { return this.key(i) in this.progress.answers; }

  /** ステップの図。つまみがあれば現在の値で作る。 */
  private sceneOf(i: number): Scene {
    const s = this.lesson!.steps[i];
    return s.sceneFor ? s.sceneFor(this.knobsOf(i)) : s.scene;
  }
  private metricsOf(i: number): Step['metrics'] {
    const s = this.lesson!.steps[i];
    return s.metricsFor ? { ...s.metrics, ...s.metricsFor(this.knobsOf(i)) } : s.metrics;
  }
  private knobsOf(i: number): Record<string, number> {
    const k = this.key(i);
    if (!this.knobValues.has(k)) this.knobValues.set(k, Object.fromEntries((this.lesson!.steps[i].knobs ?? []).map((x) => [x.id, x.value])));
    return this.knobValues.get(k)!;
  }

  private showStep(i: number, fresh: boolean): void {
    const l = this.lesson!, s = l.steps[i], stage = this.stage!;
    const prev = this.stepIdx;
    this.stepIdx = i;
    // 予測問題に未回答のあいだは、図を 1 つ前の状態で止めておく（答えを先に見せない）
    const held = !!s.predict && !this.answered(i) && i > 0;
    const sceneIdx = held ? i - 1 : i;
    const sequential = !fresh && Math.abs(i - prev) === 1;
    if (fresh || !sequential) {
      // 離れたステップへ飛んだときは、直前の状態を無音で置いてから 1 手だけ動かす
      if (sceneIdx > 0 && !held) stage.replay(this.sceneOf(sceneIdx - 1), this.sceneOf(sceneIdx));
      else stage.replay(null, this.sceneOf(sceneIdx));
    } else if (!(held && prev === i - 1)) stage.goTo(this.sceneOf(sceneIdx));
    stage.setAlt(l.steps[sceneIdx].alt);
    this.renderHud(this.metricsOf(sceneIdx));
    this.renderLegend(this.sceneOf(sceneIdx));

    if (!held) this.touch(i);
    this.renderGuide(held);
    this.renderTimeline();
    this.renderGoals();
    this.renderSidebar();
    $(this.root, '#live').textContent = `${this.t.step} ${i + 1} / ${l.steps.length}: ${s.title}`;
    // 小さい画面では、貼り付いた図のすぐ下に解説の先頭が来るように戻す
    if (!fresh && matchMedia('(max-width: 899px), (max-height: 599px)').matches) $(this.root, '.guide').scrollIntoView({ block: 'start', behavior: this.reducedMq.matches ? 'auto' : 'smooth' });
  }

  private touch(i: number): void {
    this.progress = markStep(this.progress, this.lesson!, i);
    saveProgress(`course:${this.course.id}`, this.progress);
  }

  /* ───────── 解説カード ───────── */

  private renderGuide(held: boolean): void {
    const t = this.t, l = this.lesson!, i = this.stepIdx, s = l.steps[i], lang = this.course.lang;
    const guide = $(this.root, '.guide');
    const f = this.flat.find((x) => x.lesson === l)!;
    const nextFlat = this.flat[this.flat.indexOf(f) + 1];
    const last = i === l.steps.length - 1;
    const nextLabel = last
      ? (nextFlat ? `${t.nextLesson}: ${escapeHtml(nextFlat.lesson.title)}` : t.finish)
      : `${t.next}: ${escapeHtml(l.steps[i + 1].short)}`;

    let predict = '';
    if (s.predict) {
      const chosen = this.progress.answers[this.key(i)];
      const done = chosen != null;
      predict = `<section class="predict${done ? ' is-done' : ''}" aria-labelledby="pq">
        <h3 class="eyebrow">${icon('target', 12)}${t.predict}</h3>
        <p class="predict__q" id="pq">${rich(s.predict.question)}</p>
        <div class="predict__opts" role="group">${s.predict.options.map((o, k) => {
          const cls = !done ? '' : k === s.predict!.answer ? ' is-right' : k === chosen ? ' is-wrong' : ' is-off';
          return `<button class="opt${cls}" data-act="answer" data-k="${k}"${done ? ' disabled' : ''}><span class="opt__k">${String.fromCharCode(65 + k)}</span><span>${rich(o)}</span>${done && k === chosen ? `<span class="sr-only">(${t.yourAnswer})</span>` : ''}</button>`;
        }).join('')}</div>
        ${done ? `<p class="predict__result ${chosen === s.predict.answer ? 'is-right' : 'is-wrong'}"><b>${chosen === s.predict.answer ? t.correct : t.incorrect}</b> ${rich(s.predict.explain)}</p>` : `<p class="predict__hint">${t.predictHint}</p>`}
      </section>`;
    }

    const table = s.table ? `<div class="tablewrap"><table class="compare"><thead><tr>${s.table[0].map((c) => `<th>${rich(c)}</th>`).join('')}</tr></thead><tbody>${s.table.slice(1).map((r) => `<tr>${r.map((c, k) => (k ? `<td>${rich(c)}</td>` : `<th scope="row">${rich(c)}</th>`)).join('')}</tr>`).join('')}</tbody></table></div>` : '';
    const takeaways = s.takeaways ? `<ul class="takeaways">${s.takeaways.map((x) => `<li>${rich(x)}</li>`).join('')}</ul>` : '';
    const knobs = s.knobs ? `<section class="knobs"><h3 class="eyebrow">${icon('sliders', 12)}${t.knobs}</h3>${s.knobs.map((k) => {
      const v = this.knobsOf(i)[k.id];
      return `<label class="knob"><span class="knob__label">${escapeHtml(k.label)}</span><output>${escapeHtml(k.format ? k.format(v) : `${v}${k.unit ?? ''}`)}</output><input type="range" data-knob="${k.id}" min="${k.min}" max="${k.max}" step="${k.step}" value="${v}"></label>`;
    }).join('')}</section>` : '';
    const co = s.callout;
    const coIcon = { insight: 'spark', tip: 'bulb', warn: 'alert', next: 'arrow-right' } as const;
    const coTitle = { insight: t.insight, tip: t.tip, warn: t.warn, next: t.nextUp } as const;
    const callout = co ? `<aside class="callout callout--${co.kind}"><span class="callout__ico">${icon(coIcon[co.kind], 15)}</span><div><p class="callout__title">${coTitle[co.kind]}</p><p>${rich(co.text)}</p></div></aside>` : '';
    const changes = s.changes?.length ? `<section class="changes"><h3 class="eyebrow">${t.changed}</h3><ul>${s.changes.map((c) => {
      const m = /^([+~\-−])\s*(.*)$/.exec(c);
      const sign = m ? (m[1] === '+' ? 'add' : m[1] === '~' ? 'mod' : 'del') : 'mod';
      return `<li class="chg chg--${sign}"><i aria-hidden="true">${sign === 'add' ? '+' : sign === 'mod' ? '~' : '−'}</i><span>${rich(m ? m[2] : c)}</span></li>`;
    }).join('')}</ul></section>` : '';

    // 描き直すと押したボタンごと消えるので、操作していたボタンを覚えておき、あとで戻す
    const held0 = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>('.guide__nav [data-act]')?.dataset.act : undefined;
    guide.dataset.dir = String(this.dir);
    guide.innerHTML = `
      <div class="guide__scroll">
        <div class="guide__top"><span class="stepno">${t.step} ${i + 1} / ${l.steps.length}</span><span class="chapter" data-chapter="${s.chapter}">${chapterLabel(lang, s.chapter)}</span></div>
        <h2 class="guide__title">${escapeHtml(s.title)}</h2>
        ${predict}
        <div class="guide__rest"${held ? ' hidden' : ''}>
          <div class="guide__body">${s.body.map((p) => `<p>${rich(p)}</p>`).join('')}</div>
          ${table}${takeaways}${knobs}${callout}${changes}
        </div>
      </div>
      <div class="guide__nav">
        <button class="btn btn--ghost" data-act="prev"${i === 0 && !this.prevFlat() ? ' disabled' : ''}>${icon('arrow-left', 15)}<span>${t.back}</span></button>
        <button class="btn btn--pop" data-act="next"${held || (last && !nextFlat) ? ' disabled' : ''}${held ? ` title="${t.answerFirst}"` : ''}><span>${nextLabel}</span>${icon('arrow-right', 15)}</button>
      </div>
      <p class="hint"><kbd>←</kbd><kbd>→</kbd> ${t.hintStep} · <kbd>R</kbd> ${t.hintReplay} · <kbd>Space</kbd> ${t.hintPause}</p>`;
    $(guide, '.guide__scroll').scrollTop = 0;
    if (held0) {
      // 無効になっていたら、もう一方のボタンか、予測の選択肢へ
      const back = guide.querySelector<HTMLElement>(`.guide__nav [data-act="${held0}"]:not(:disabled)`)
        ?? guide.querySelector<HTMLElement>('.opt:not(:disabled), .guide__nav [data-act]:not(:disabled)');
      back?.focus({ preventScroll: true });
    }
  }

  private prevFlat(): Flat | undefined {
    return this.flat[this.flat.findIndex((x) => x.lesson === this.lesson) - 1];
  }

  private renderTimeline(): void {
    const l = this.lesson!, i = this.stepIdx;
    const reached = this.progress.reached[l.id] ?? 0;
    this.root.querySelectorAll<HTMLAnchorElement>('.tdot').forEach((a, k) => {
      a.classList.toggle('is-on', k === i);
      a.classList.toggle('is-done', k < i || k <= reached && k !== i);
      k === i ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current');
    });
    $(this.root, '.timeline__pos').textContent = `${this.t.step} ${i + 1} / ${l.steps.length}`;
    $(this.root, '.timeline__rail > i').style.width = `${(i / Math.max(1, l.steps.length - 1)) * 100}%`;
    this.root.querySelector<HTMLElement>('.tdot.is-on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  private renderGoals(): void {
    const reached = (this.progress.reached[this.lesson!.id] ?? -1) + 1;
    this.root.querySelectorAll<HTMLElement>('.goals li').forEach((li) => {
      const on = reached >= Number(li.dataset.step);
      if (on && !li.classList.contains('is-on')) li.classList.add('is-fresh');
      li.classList.toggle('is-on', on);
    });
  }

  /* ───────── 指標 ───────── */

  private fmt(key: string, v: number | string | null): string {
    if (v == null) return '—';
    if (typeof v === 'string') return v;
    const d = this.course.metrics[key];
    return (d?.format ? d.format(v) : v.toLocaleString(this.course.lang, { maximumFractionDigits: 1 })) + (d?.unit ? ` ${d.unit}` : '');
  }

  /** 凡例には、いまの図に実際に流れている粒子だけを出す（並び順は Lesson.legend に従う）。 */
  private renderLegend(scene: Scene): void {
    const live = new Set<string>();
    for (const f of scene.flows ?? []) { live.add(f.kind); f.pattern?.forEach((k) => live.add(k)); if (f.bounce) live.add(f.bounce); }
    $(this.root, '.legend').innerHTML = this.lesson!.legend.filter((k) => live.has(k)).map((k) => {
      const d = this.course.flowKinds[k];
      return d ? `<span class="legend__item"><i class="legend__mark legend__mark--${d.shape}" style="--pk:var(--h-${d.hue}-pk)"></i>${escapeHtml(d.label)}</span>` : '';
    }).join('');
  }

  private renderHud(values: Step['metrics']): void {
    for (const chip of this.root.querySelectorAll<HTMLElement>('.chip')) {
      const k = chip.dataset.metric!;
      const v = values[k] ?? null, old = this.shown[k] ?? null;
      const out = $(chip, '.chip__value');
      const d = this.course.metrics[k];
      chip.dataset.tone = typeof v === 'number' && d ? d.tone(v) : 'neutral';
      if (v === old && out.textContent !== '—') continue;
      this.shown[k] = v;
      if (typeof v === 'number' && typeof old === 'number' && !this.reducedMq.matches) {
        // 数値は数え上げて変化を見せる
        const t0 = performance.now();
        const tick = (now: number): void => {
          if (this.shown[k] !== v) return;
          const p = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - p, 3);
          out.textContent = this.fmt(k, old + (v - old) * e);
          if (p < 1) requestAnimationFrame(tick); else out.textContent = this.fmt(k, v);
        };
        requestAnimationFrame(tick);
      } else out.textContent = this.fmt(k, v);
      if (v !== old) { chip.classList.remove('is-flash'); void chip.offsetWidth; chip.classList.add('is-flash'); }
    }
  }

  /* ───────── 操作 ───────── */

  private next(): void {
    const l = this.lesson!, i = this.stepIdx;
    if (l.steps[i].predict && !this.answered(i) && i > 0) {
      $(this.root, '#live').textContent = this.t.answerFirst;
      this.root.querySelector<HTMLElement>('.opt')?.focus();
      return;
    }
    if (i < l.steps.length - 1) return this.go(l.id, i + 1);
    const n = this.flat[this.flat.findIndex((x) => x.lesson === l) + 1];
    if (n) this.go(n.lesson.id, 0);
  }

  private prev(): void {
    const l = this.lesson!;
    if (this.stepIdx > 0) return this.go(l.id, this.stepIdx - 1);
    const p = this.prevFlat();
    if (p) this.go(p.lesson.id, p.lesson.steps.length - 1);
  }

  private answer(k: number): void {
    const i = this.stepIdx;
    if (this.answered(i)) return;
    this.progress = recordAnswer(this.progress, this.lesson!.id, i, k);
    this.touch(i);
    // 選んだ直後に図を動かして、答えを「見せる」
    this.stage!.goTo(this.sceneOf(i));
    this.stage!.setAlt(this.lesson!.steps[i].alt);
    this.renderHud(this.metricsOf(i));
    this.renderLegend(this.sceneOf(i));
    this.renderGuide(false);
    this.renderTimeline();
    this.renderGoals();
    this.renderSidebar();
    this.root.querySelector<HTMLElement>('.predict__result')?.setAttribute('tabindex', '-1');
    this.root.querySelector<HTMLElement>('.predict__result')?.focus();
  }

  private setPaused(p: boolean): void {
    this.stage?.setPaused(p);
    const b = $<HTMLButtonElement>(this.root, '[data-act="pause"]');
    b.setAttribute('aria-pressed', String(p));
    b.classList.toggle('is-on', p);
    // 名前は「一時停止」のまま変えず、押されているかどうかは aria-pressed で伝える（見た目の文言だけ切り替える）
    b.innerHTML = `${icon(p ? 'play' : 'pause', 14)}<span>${p ? this.t.resume : this.t.pause}</span>`;
  }

  private replay(): void {
    const i = this.stepIdx;
    const held = !!this.lesson!.steps[i].predict && !this.answered(i) && i > 0;
    const k = held ? i - 1 : i;
    this.stage!.replay(k > 0 ? this.sceneOf(k - 1) : null, this.sceneOf(k));
  }

  private toggleTheme(): void {
    const root = document.documentElement;
    const dark = root.dataset.theme !== 'dark';
    const apply = (): void => {
      root.dataset.theme = dark ? 'dark' : 'light';
      const b = $<HTMLButtonElement>(this.root, '[data-act="theme"]');
      b.innerHTML = icon(dark ? 'sun' : 'moon', 17);
      b.setAttribute('aria-label', dark ? this.t.themeLight : this.t.themeDark);
    };
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* 保存なしで続行 */ }
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !this.reducedMq.matches) doc.startViewTransition(apply); else apply();
  }

  private openDrawer(): void {
    $(this.root, '.app').classList.add('drawer-open');
    $(this.root, '.scrim').hidden = false;
    $(this.root, '.drawer-btn').setAttribute('aria-expanded', 'true');
    this.root.querySelector<HTMLElement>('.sidebar .lesson-link.is-on, .sidebar .mod__head')?.focus();
  }
  private closeDrawer(): void {
    $(this.root, '.app').classList.remove('drawer-open');
    $(this.root, '.scrim').hidden = true;
    $(this.root, '.drawer-btn').setAttribute('aria-expanded', 'false');
  }

  private bind(): void {
    const dark = document.documentElement.dataset.theme === 'dark';
    if (dark) { const b = $(this.root, '[data-act="theme"]'); b.innerHTML = icon('sun', 17); b.setAttribute('aria-label', this.t.themeLight); }

    this.root.addEventListener('click', (ev) => {
      const b = (ev.target as Element).closest<HTMLElement>('[data-act]');
      if (!b) return;
      switch (b.dataset.act) {
        case 'skip': {
          // URL を変えずに本文へ移る（ハッシュを書き換えるとルーティングが走ってしまう）
          ev.preventDefault();
          const view = $(this.root, '.app').dataset.view;
          return (view === 'learn' ? $(this.root, '.guide') : $(this.root, '.page')).focus();
        }
        case 'next': return this.next();
        case 'prev': return this.prev();
        case 'answer': return this.answer(Number(b.dataset.k));
        case 'replay': return this.replay();
        case 'pause': return this.setPaused(!this.stage?.isPaused);
        case 'fit': return this.stage?.fit();
        case 'zoom-in': return this.stage?.zoomBy(1.4);
        case 'zoom-out': return this.stage?.zoomBy(1 / 1.4);
        case 'theme': return this.toggleTheme();
        case 'search': return this.palette.open();
        case 'drawer': return $(this.root, '.app').classList.contains('drawer-open') ? this.closeDrawer() : this.openDrawer();
        case 'drawer-close': return this.closeDrawer();
        case 'module':
          this.openModule = this.openModule === b.dataset.id ? '' : b.dataset.id!;
          this.renderSidebar();
          this.root.querySelector<HTMLElement>(`.mod__head[data-id="${b.dataset.id}"]`)?.focus();
      }
    });

    this.root.addEventListener('input', (ev) => {
      const input = ev.target as HTMLInputElement;
      if (!input.dataset.knob) return;
      const i = this.stepIdx;
      this.knobsOf(i)[input.dataset.knob] = Number(input.value);
      const k = this.lesson!.steps[i].knobs!.find((x) => x.id === input.dataset.knob)!;
      input.closest('.knob')!.querySelector('output')!.textContent = k.format ? k.format(Number(input.value)) : `${input.value}${k.unit ?? ''}`;
      this.stage!.goTo(this.sceneOf(i), { quick: true });
      this.renderHud(this.metricsOf(i));
      this.renderLegend(this.sceneOf(i));
    });

    addEventListener('keydown', (ev) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); this.palette.toggle(); return; }
      if (this.palette.isOpen) return;
      if (ev.key === 'Escape') return this.closeDrawer();
      const el = ev.target as HTMLElement;
      if (ev.metaKey || ev.ctrlKey || ev.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) return;
      if ($(this.root, '.app').dataset.view !== 'learn') { if (ev.key === '/') { ev.preventDefault(); this.palette.open(); } return; }
      const rtl = getComputedStyle(document.documentElement).direction === 'rtl';
      switch (ev.key) {
        case 'ArrowRight': ev.preventDefault(); return rtl ? this.prev() : this.next();
        case 'ArrowLeft': ev.preventDefault(); return rtl ? this.next() : this.prev();
        case 'r': case 'R': return this.replay();
        case ' ': if (el.tagName !== 'BUTTON' && el.tagName !== 'A') { ev.preventDefault(); this.setPaused(!this.stage?.isPaused); } return;
        case '0': return this.stage?.fit();
        case '+': case '=': return this.stage?.zoomBy(1.4);
        case '-': return this.stage?.zoomBy(1 / 1.4);
        case '/': ev.preventDefault(); return this.palette.open();
      }
    });

    // 動きを減らす設定が途中で変わったら、いまの図を描き直す
    this.reducedMq.addEventListener('change', () => { if (this.lesson) this.replay(); });
  }
}
