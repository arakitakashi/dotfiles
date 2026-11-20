/**
 * 内容の機械検証。「良いレッスンの型」のうち、機械で判定できる部分をここで落とす。
 * error = 壊れている・型から外れている（直すまで公開しない）
 * warn  = 型からの逸脱（意図があるなら残してよいが、理由を説明できること）
 */
import type { Chapter, Course, Entity, Scene, Step } from './types';
import { diffScenes } from './engine/diff';
import { shapeOf } from './engine/entities';
import { project } from './engine/project';
import { plain, termsIn, xrefsIn } from './ui/richtext';

export interface Issue {
  level: 'error' | 'warn';
  rule: string;
  where: string;
  message: string;
}

const CHAPTERS: Chapter[] = ['setup', 'problem', 'solution', 'technique', 'tradeoff', 'insight', 'recap'];

/** 分量の単位。日本語などは文字数、空白で区切る言語は語数で数える。 */
function size(text: string, lang: string): number {
  const t = plain(text);
  return /^(ja|zh|ko)/.test(lang) ? [...t].length : t.split(/\s+/).filter(Boolean).length;
}
const limits = (lang: string): { paraMax: number; paraMin: number; bodyMax: number; shortMax: number; calloutMax: number; altMin: number } =>
  /^(ja|zh|ko)/.test(lang)
    ? { paraMax: 150, paraMin: 20, bodyMax: 270, shortMax: 9, calloutMax: 110, altMin: 20 }
    : { paraMax: 55, paraMin: 8, bodyMax: 110, shortMax: 3, calloutMax: 40, altMin: 8 };

function texts(s: Step): string[] {
  return [...s.body, s.callout?.text ?? '', ...(s.takeaways ?? []), ...(s.table ?? []).flat(), s.predict?.question ?? '', s.predict?.explain ?? '', ...(s.predict?.options ?? [])];
}

function scenesOf(s: Step): Scene[] {
  if (!s.sceneFor || !s.knobs) return [s.scene];
  // つまみの両端でも図が壊れないことを確かめる
  const at = (pick: (k: NonNullable<Step['knobs']>[number]) => number): Scene => s.sceneFor!(Object.fromEntries(s.knobs!.map((k) => [k.id, pick(k)])));
  return [s.scene, at((k) => k.min), at((k) => k.max)];
}

function overlaps(scene: Scene, course: Course): [string, string][] {
  const boxes = scene.entities.filter((e) => e.kind !== 'zone').map((e: Entity) => {
    const p = project(e.at, course.projection), b = shapeOf(e, course).bounds;
    return { id: e.id, x0: p[0] + b[0], y0: p[1] + b[1], x1: p[0] + b[2], y1: p[1] + b[3] };
  });
  const out: [string, string][] = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    if (w <= 0 || h <= 0) continue;
    // 小さい方の面積の 12% 以上が重なっていたら、読めなくなっている可能性が高い
    const small = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
    if ((w * h) / small > 0.12) out.push([a.id, b.id]);
  }
  return out;
}

/**
 * 図全体の大きさの上限（px）。デスクトップの図の枠はおよそ 670×460 px で、
 * 文字が読める最小の倍率（engine/stage.ts の MIN_SCALE = 0.62）で割ると、収まるのはこの大きさまで。
 */
const MAX_SCENE: [number, number] = [1080, 740];

function extent(scene: Scene, course: Course): [number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of scene.entities) {
    const p = project(e.at, course.projection), b = shapeOf(e, course).bounds;
    x0 = Math.min(x0, p[0] + b[0]); y0 = Math.min(y0, p[1] + b[1]);
    x1 = Math.max(x1, p[0] + b[2]); y1 = Math.max(y1, p[1] + b[3]);
  }
  return Number.isFinite(x0) ? [x1 - x0, y1 - y0] : [0, 0];
}

export function validateCourse(course: Course): Issue[] {
  const issues: Issue[] = [];
  const L = limits(course.lang);
  const lessons = course.modules.flatMap((m) => m.lessons);
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const usedTerms = new Set<string>();
  const add = (level: Issue['level'], rule: string, where: string, message: string): void => { issues.push({ level, rule, where, message }); };

  if (!lessons.length) add('error', 'structure', course.id, 'レッスンがない');
  if (byId.size !== lessons.length) add('error', 'structure', course.id, 'レッスン id が重複している');

  lessons.forEach((l, li) => {
    const lastLesson = li === lessons.length - 1;
    const W = l.id;
    if (!/^[\w-]+$/.test(l.id)) add('error', 'structure', W, 'レッスン id は英数字・ハイフン・下線だけにする（URL になる）');
    if (l.steps.length < 6 || l.steps.length > 16) add('error', 'structure', W, `ステップ数 ${l.steps.length} は範囲外（6〜16）`);
    else if (l.steps.length < 8 || l.steps.length > 14) add('warn', 'structure', W, `ステップ数 ${l.steps.length}。8〜14 が読み切れる目安`);
    if (l.metrics.length < 3 || l.metrics.length > 5) add('warn', 'metrics', W, `指標は 3〜5 個にする（現在 ${l.metrics.length}）`);
    for (const k of l.metrics) if (!course.metrics[k]) add('error', 'vocabulary', W, `指標 "${k}" が Course.metrics にない`);
    for (const k of l.legend) if (!course.flowKinds[k]) add('error', 'vocabulary', W, `粒子の種類 "${k}" が Course.flowKinds にない`);
    if (l.goals.length < 3 || l.goals.length > 6) add('warn', 'goals', W, `学習目標は 3〜6 個にする（現在 ${l.goals.length}）`);
    for (const g of l.goals) if (!(g.step >= 1 && g.step <= l.steps.length)) add('error', 'goal-step', W, `学習目標「${g.text}」の step ${g.step} が範囲外`);
    if (!l.summary || /(について|を学びます|を解説|とは何か)。?$/.test(l.summary)) add('warn', 'hook', W, 'summary は説明の予告ではなく、問い・逆説・対比で書く');

    const first = l.steps[0], last = l.steps[l.steps.length - 1];
    if (first && first.chapter !== 'setup' && first.chapter !== 'problem') add('error', 'first-step', `${W}#1`, '最初のステップは setup（壊れる前の状態）か problem（症状）で始める');
    if (last && (last.chapter !== 'recap' || !(last.takeaways?.length || last.table?.length))) add('error', 'recap', `${W}#${l.steps.length}`, '最後のステップは recap にし、takeaways（4〜5 個）か決定表を持たせる');
    if (last?.takeaways && (last.takeaways.length < 3 || last.takeaways.length > 6)) add('warn', 'recap', `${W}#${l.steps.length}`, `takeaways は 3〜6 個にする（4〜5 個が目安。現在 ${last.takeaways.length}）`);
    if (last && !lastLesson && last.callout?.kind !== 'next') add('warn', 'next', `${W}#${l.steps.length}`, '最後の callout は kind: "next" にして、次のレッスンへの問いを 1 文で書く');
    if (l.steps.filter((s) => s.chapter === 'problem').length < 2) add('warn', 'problem-first', W, 'problem のステップが 2 つ未満。解決策が次の問題を生む往復を作る');
    if (!l.steps.some((s) => s.predict)) add('warn', 'predict', W, '予測問題が 1 つもない。結果が直感に反するステップに置く（答えるまで、図は 1 つ前の状態で止まる）');
    for (const k of l.metrics) {
      const vals = new Set(l.steps.map((s) => JSON.stringify(s.metrics[k] ?? null)));
      if (vals.size < 2) add('warn', 'metrics', W, `指標 "${k}" がレッスンを通して一度も変わらない`);
    }

    let seenProblem = false;
    l.steps.forEach((s, i) => {
      const at = `${W}#${i + 1}`;
      const prev = i ? l.steps[i - 1] : null;
      if (!CHAPTERS.includes(s.chapter)) add('error', 'structure', at, `chapter "${s.chapter}" は不正`);
      if (s.chapter === 'problem') seenProblem = true;
      if (s.chapter === 'solution' && !seenProblem) add('error', 'problem-first', at, 'solution の前に problem がない。先に壊れるところを見せる');
      for (const [name, v] of [['short', s.short], ['title', s.title], ['alt', s.alt]] as const) if (!v?.trim()) add('error', 'structure', at, `${name} が空`);
      if (size(s.short ?? '', course.lang) > L.shortMax) add('warn', 'short', at, `short「${s.short}」が長い（タイムラインに収まらない）`);
      if (size(s.alt ?? '', course.lang) < L.altMin) add('warn', 'alt', at, 'alt が短い。図が見えない読者に、このステップの状態が伝わるように書く');

      if (!s.body?.length || s.body.length > 3) add('error', 'structure', at, `body は 1〜3 段落（現在 ${s.body?.length ?? 0}）`);
      else {
        if (s.body.length !== 2) add('warn', 'body-shape', at, `body は 2 段落が基本（何が起きたか / なぜ・だから何か）。現在 ${s.body.length}`);
        const sizes = s.body.map((p) => size(p, course.lang));
        if (sizes.some((n) => n > L.paraMax) || sizes.reduce((a, b) => a + b, 0) > L.bodyMax) add('warn', 'body-length', at, `本文が長い（段落 ${sizes.join(' / ')}、上限は段落 ${L.paraMax}・合計 ${L.bodyMax}）。図を見ながら 30 秒で読める量にする`);
        if (sizes.some((n) => n < L.paraMin)) add('warn', 'body-length', at, `短すぎる段落がある（${sizes.join(' / ')}）`);
      }
      if (!s.callout) add('warn', 'callout', at, 'callout がない。このステップの教訓・落とし穴・実在の例を 1 文で添える');
      else if (size(s.callout.text, course.lang) > L.calloutMax) add('warn', 'callout', at, 'callout が長い。1〜2 文に絞る');

      for (const c of s.changes ?? []) if (!/^[+~\-−]\s+\S/.test(c)) add('error', 'changes', at, `changes「${c}」は "+ " "~ " "- " のいずれかで始める`);
      if (s.table && new Set(s.table.map((r) => r.length)).size > 1) add('error', 'structure', at, 'table の列数が行によって違う');

      for (const k of l.metrics) if (!(k in s.metrics)) add('error', 'metrics', at, `指標 "${k}" の値がない（未計測なら null を明示する）`);

      const all = texts(s).join(' ');
      for (const t of termsIn(all)) { usedTerms.add(t); if (!(t in course.glossary)) add('error', 'glossary', at, `用語「${t}」が Course.glossary にない`); }
      for (const x of xrefsIn(all)) {
        const target = byId.get(x.lesson);
        if (!target || x.step < 1 || x.step > target.steps.length) add('error', 'xref', at, `リンク先 ${x.lesson}#${x.step} が存在しない`);
      }

      if (s.predict) {
        const p = s.predict;
        if (i === 0) add('error', 'predict', at, '最初のステップには予測問題を置けない（予測の材料になる前の図がない）');
        if (p.options.length < 2 || p.options.length > 4 || !(p.answer >= 0 && p.answer < p.options.length)) add('error', 'predict', at, '選択肢は 2〜4 個で、answer はその添字にする');
        if (!p.explain?.trim()) add('error', 'predict', at, 'explain が空');
      }
      if (s.knobs) {
        if (!s.sceneFor && !s.metricsFor) add('error', 'knobs', at, 'knobs には sceneFor か metricsFor が要る（動かしても何も変わらない）');
        for (const k of s.knobs) if (!(k.min <= k.value && k.value <= k.max)) add('error', 'knobs', at, `つまみ "${k.id}" の初期値が範囲外`);
      }

      for (const scene of scenesOf(s)) {
        const ids = new Set(scene.entities.map((e) => e.id));
        if (ids.size !== scene.entities.length) add('error', 'scene-ref', at, 'エンティティ id が重複している');
        for (const e of scene.entities) {
          if (e.role && !course.roles[e.role]) add('error', 'vocabulary', at, `役割 "${e.role}" が Course.roles にない`);
          if (e.kind === 'custom' && !course.renderers?.[e.renderer]) add('error', 'vocabulary', at, `カスタム描画 "${e.renderer}" が Course.renderers にない`);
        }
        for (const k of scene.links ?? []) if (!ids.has(k.from) || !ids.has(k.to)) add('error', 'scene-ref', at, `リンク ${k.from} → ${k.to} の端が図にない`);
        for (const f of scene.flows ?? []) {
          for (const id of f.route.flat()) if (!ids.has(id)) add('error', 'scene-ref', at, `粒子 "${f.id}" の経路にある "${id}" が図にない`);
          for (const k of [f.kind, ...(f.pattern ?? []), ...(f.bounce ? [f.bounce] : [])]) if (!course.flowKinds[k]) add('error', 'vocabulary', at, `粒子の種類 "${k}" が Course.flowKinds にない`);
        }
        for (const [a, b] of overlaps(scene, course)) add('warn', 'overlap', at, `"${a}" と "${b}" が重なっている。at をずらす`);
        const [w, h] = extent(scene, course);
        if (w > MAX_SCENE[0] || h > MAX_SCENE[1]) add('warn', 'scene-size', at, `図が大きすぎる（${Math.round(w)}×${Math.round(h)} px。${MAX_SCENE[0]}×${MAX_SCENE[1]} 以内にする）。デスクトップでも全体が映らず、一部が切れる`);
      }

      if (prev) {
        const d = diffScenes(prev.scene, s.scene);
        if (d.count === 0 && !s.knobs && JSON.stringify(prev.scene.flows ?? []) === JSON.stringify(s.scene.flows ?? [])) add('warn', 'scene-diff', at, '図が前のステップから何も変わっていない。1 ステップに 1 つ、見える変化を入れる');
        if (d.count > 9) add('warn', 'scene-diff', at, `図の変化が多すぎる（${d.count} か所）。ステップを分ける`);
        if (d.count > 0 && !s.changes?.length && s.chapter !== 'recap') add('warn', 'changes', at, '図が変わったのに changes がない。同じ変化を言葉でも示す');
      }
    });
  });

  for (const t of Object.keys(course.glossary)) if (!usedTerms.has(t)) add('warn', 'glossary', course.id, `用語集の「${t}」が本文で一度も ==用語== として使われていない`);
  return issues;
}

/* ───────── 配色の検査 ───────── */

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** WCAG のコントラスト比。 */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** themes.css の各ブロックで、文字色が面の上で 4.5:1 以上あるかを調べる。 */
export function validateThemes(css: string): Issue[] {
  const issues: Issue[] = [];
  for (const m of css.matchAll(/(:root[^{]*)\{([^}]*--bg:[^}]*)\}/g)) {
    const vars = Object.fromEntries([...m[2].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((v) => [v[1], v[2]]));
    const name = m[1].trim().split(',').pop()!.trim();
    for (const fg of ['ink', 'ink-2', 'muted', 'muted-2']) for (const bg of ['card', 'surface', 'bg']) {
      if (!vars[fg] || !vars[bg]) continue;
      const c = contrast(vars[fg], vars[bg]);
      if (c < 4.5) issues.push({ level: 'error', rule: 'contrast', where: name, message: `--${fg} / --${bg} = ${c.toFixed(2)}:1（4.5:1 以上にする）` });
    }
    if (vars['on-accent'] && vars.accent && contrast(vars['on-accent'], vars.accent) < 4.5) issues.push({ level: 'error', rule: 'contrast', where: name, message: '--on-accent / --accent が 4.5:1 未満' });
  }
  return issues;
}
