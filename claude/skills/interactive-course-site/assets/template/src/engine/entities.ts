import type {
  ActorEntity, BlockEntity, Course, CustomEntity, Entity, Hue, NoteEntity,
  PanelEntity, QueueEntity, RenderCtx, Tone, ZoneEntity,
} from '../types';
import { iconAt } from './icons';
import { project, type Projection, type Pt } from './project';

export const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

/** 文字幅の見積もり。全角は 1em、半角は 0.6em として数える（等幅前提）。 */
export function textWidth(s: string, size: number): number {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 0x2e7f ? size : size * 0.6;
  return w;
}

/** 角を丸めた多角形のパス。 */
export function roundPoly(pts: Pt[], r: number, close = true): string {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    if (!close && (i === 0 || i === n - 1)) { d += `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`; continue; }
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ra = Math.min(r, la / 2);
    const rb = Math.min(r, lb / 2);
    const p1: Pt = [p[0] + ((a[0] - p[0]) / la) * ra, p[1] + ((a[1] - p[1]) / la) * ra];
    const p2: Pt = [p[0] + ((b[0] - p[0]) / lb) * rb, p[1] + ((b[1] - p[1]) / lb) * rb];
    d += `${i ? 'L' : 'M'}${p1[0].toFixed(1)} ${p1[1].toFixed(1)}Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return close ? d + 'Z' : d;
}

/** ピル型ラベル。図の中の文字はすべてこれに載せる（床や線の上に直接文字を置かない）。 */
export function pill(text: string, x: number, y: number, opts: { icon?: string; tone?: Tone; small?: boolean } = {}): string {
  const fs = opts.small ? 10 : 11;
  const h = opts.small ? 19 : 22;
  const iw = opts.icon ? 15 : 0;
  const w = Math.ceil(textWidth(text, fs)) + 18 + iw;
  const tone = opts.tone && opts.tone !== 'neutral' ? ` pill--${opts.tone}` : '';
  return `<g class="pill${tone}" transform="translate(${(x - w / 2).toFixed(1)} ${(y - h / 2).toFixed(1)})">`
    + `<rect class="pill__drop" y="2" width="${w}" height="${h}" rx="${h / 2}"/>`
    + `<rect class="pill__face" width="${w}" height="${h}" rx="${h / 2}"/>`
    + (opts.icon ? iconAt(opts.icon, 13, h / 2, 11) : '')
    + `<text x="${9 + iw}" y="${h / 2}" font-size="${fs}" dominant-baseline="central">${esc(text)}</text></g>`;
}

const hueOf = (course: Course, e: Entity, fallback: Hue = 'sand'): Hue =>
  (e.role && course.roles[e.role]?.hue) || fallback;
const iconOf = (course: Course, e: Entity): string | undefined => e.role ? course.roles[e.role]?.icon : undefined;

/** 図形ごとの大きさ。[左, 上, 右, 下]（エンティティ原点からの px）。カメラとリンクの接続に使う。 */
export interface Shape {
  bounds: [number, number, number, number];
  /** リンクが接続する楕円（中心は原点）または矩形 */
  rx: number;
  ry: number;
  rect?: boolean;
  /** 画面奥から手前への並び順に使う重み。大きいほど手前 */
  layer: number;
}

/* ───────── block / store ───────── */

const BLOCK = { a: 46, b: 23, h: 36 };
/** iso のブロックで、名前を上の面ではなく下のピルに出すかどうか。 */
const labelBelow = (e: BlockEntity): boolean =>
  e.kind === 'store' || textWidth(e.label ?? '', 12) + (e.sub ? 6 : 0) > 58 * (e.size ?? 1);

function gaugeSvg(v: number, label: string | undefined, y: number): string {
  const w = 54;
  const tone = v >= 0.88 ? 'bad' : v >= 0.75 ? 'warn' : 'good';
  const text = label ?? `${Math.round(v * 100)}%`;
  const tw = Math.ceil(textWidth(text, 10)) + 8;
  const W = w + tw + 14;
  return `<g class="gauge gauge--${tone}" transform="translate(${-W / 2} ${y})">`
    + `<rect class="pill__drop" y="2" width="${W}" height="18" rx="9"/><rect class="pill__face" width="${W}" height="18" rx="9"/>`
    + `<rect class="gauge__track" x="7" y="6" width="${w}" height="6" rx="3"/>`
    + `<rect class="gauge__fill" data-gauge x="7" y="6" width="${(w * Math.max(0.04, Math.min(1, v))).toFixed(1)}" height="6" rx="3"/>`
    + `<text data-gauge-text x="${w + 12}" y="9" font-size="10" dominant-baseline="central">${esc(text)}</text></g>`;
}

function tagSvg(tag: string, x: number, y: number): string {
  const w = Math.ceil(textWidth(tag, 9.5)) + 12;
  return `<g class="tag-badge" transform="translate(${x - w / 2} ${y})"><rect width="${w}" height="16" rx="4"/>`
    + `<text x="${w / 2}" y="8" font-size="9.5" text-anchor="middle" dominant-baseline="central">${esc(tag)}</text></g>`;
}

function blockIso(e: BlockEntity, course: Course): string {
  const s = e.size ?? 1;
  const a = BLOCK.a * s, b = BLOCK.b * s, h = BLOCK.h * s;
  const hue = hueOf(course, e, 'blue');
  const ic = iconOf(course, e);
  let body: string;
  let topY: number;
  if (e.kind === 'store') {
    const rx = a * 0.74, ry = b * 0.74;
    topY = -h - 4;
    body = `<ellipse class="ent-shadow" cx="0" cy="${b * 0.5}" rx="${a}" ry="${b * 0.9}"/>`
      + `<path class="face face--side" style="fill:var(--h-${hue}-side)" d="M${-rx} ${topY}V0A${rx} ${ry} 0 0 0 ${rx} 0V${topY}Z"/>`
      + `<path class="face-line" d="M${-rx} ${topY * 0.5}A${rx} ${ry} 0 0 0 ${rx} ${topY * 0.5}"/>`
      + `<ellipse class="face face--top" style="fill:var(--h-${hue}-top)" cx="0" cy="${topY}" rx="${rx}" ry="${ry}"/>`
      + `<path class="outline" d="M${-rx} ${topY}V0A${rx} ${ry} 0 0 0 ${rx} 0V${topY}A${rx} ${ry} 0 0 0 ${-rx} ${topY}Z"/>`;
  } else {
    topY = -h;
    const T: Pt = [0, -h - b], R: Pt = [a, -h], B: Pt = [0, -h + b], L: Pt = [-a, -h];
    const R2: Pt = [a, 0], B2: Pt = [0, b], L2: Pt = [-a, 0];
    body = `<ellipse class="ent-shadow" cx="0" cy="${b * 0.62}" rx="${a * 1.08}" ry="${b * 1.02}"/>`
      + `<path class="face face--side" style="fill:var(--h-${hue}-side)" d="${roundPoly([L, B, B2, L2], 7)}"/>`
      + `<path class="face face--side2" style="fill:var(--h-${hue}-side2)" d="${roundPoly([B, R, R2, B2], 7)}"/>`
      + `<path class="face face--top" style="fill:var(--h-${hue}-top)" d="${roundPoly([T, R, B, L], 9)}"/>`
      + `<path class="outline" d="${roundPoly([T, R, R2, B2, L2, L], 9)}"/>`
      + `<path class="face-line" d="${roundPoly([L, B, R], 9, false)}M${B[0]} ${B[1] + 3}V${B2[1] - 4}"/>`;
  }
  const label = e.label ?? '';
  // 上の面に収まらない長さの名前は、下のピルに出す（面からはみ出した文字は読めない）
  const out = labelBelow(e);
  let text = '';
  let under = b + 18;
  if (out) {
    text = (ic ? iconAt(ic, 0, topY, 18) : '') + (label ? pill(label, 0, under, {}) : '');
    if (label) under += 24;
    if (e.sub) {
      text += `<text class="ent-sub ent-sub--below" x="0" y="${under - 5}" font-size="10" text-anchor="middle" dominant-baseline="central">${esc(e.sub)}</text>`;
      under += 15;
    }
  } else {
    const hasSub = !!e.sub;
    const ly = topY + (ic ? 7 : 0) - (hasSub ? 3 : 0);
    text = (ic ? iconAt(ic, 0, ly - 15, 15) : '')
      + `<text class="ent-label" style="fill:var(--h-${hue}-ink)" x="0" y="${ly}" font-size="12" text-anchor="middle" dominant-baseline="central">${esc(label)}</text>`
      + (hasSub ? `<text class="ent-sub" style="fill:var(--h-${hue}-ink)" x="0" y="${ly + 12}" font-size="9" text-anchor="middle" dominant-baseline="central">${esc(e.sub!)}</text>` : '');
  }
  const top = (e.kind === 'store' ? topY - b : -h - b);
  return body + text
    + (e.gauge != null ? gaugeSvg(e.gauge, e.gaugeLabel, top - 26) : '')
    + (e.tag ? tagSvg(e.tag, a * 0.72, top + 2) : '')
    + (e.pill ? pill(e.pill, 0, under, { small: true }) : '');
}

const FLAT = { w: 138, h: 62 };

function blockFlat(e: BlockEntity, course: Course): string {
  const s = e.size ?? 1;
  const w = FLAT.w * s, h = FLAT.h * s;
  const hue = hueOf(course, e, 'blue');
  const ic = iconOf(course, e);
  const store = e.kind === 'store';
  const r = store ? 16 : 11;
  const tx = ic ? -w / 2 + 40 : 0;
  const anchor = ic ? 'start' : 'middle';
  return `<rect class="flat-drop" x="${-w / 2 + 2.5}" y="${-h / 2 + 3.5}" width="${w}" height="${h}" rx="${r}"/>`
    + `<rect class="flat-face" style="fill:var(--h-${hue}-top)" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${r}"/>`
    + (store ? `<path class="face-line" d="M${-w / 2 + 6} ${-h / 2 + 13}h${w - 12}"/>` : '')
    + (ic ? `<rect class="flat-ico" style="fill:var(--h-${hue}-side)" x="${-w / 2 + 9}" y="-12" width="24" height="24" rx="7"/>${iconAt(ic, -w / 2 + 21, 0, 14)}` : '')
    + `<text class="ent-label" style="fill:var(--h-${hue}-ink)" x="${tx}" y="${e.sub ? -6 : 1}" font-size="12.5" text-anchor="${anchor}" dominant-baseline="central">${esc(e.label ?? '')}</text>`
    + (e.sub ? `<text class="ent-sub" style="fill:var(--h-${hue}-ink)" x="${tx}" y="10" font-size="9.5" text-anchor="${anchor}" dominant-baseline="central">${esc(e.sub)}</text>` : '')
    + (e.gauge != null ? gaugeSvg(e.gauge, e.gaugeLabel, -h / 2 - 26) : '')
    + (e.tag ? tagSvg(e.tag, w / 2 - 16, -h / 2 - 9) : '')
    + (e.pill ? pill(e.pill, 0, h / 2 + 18, { small: true }) : '');
}

/* ───────── actor ───────── */

function actor(e: ActorEntity, course: Course, proj: Projection): string {
  const hue = hueOf(course, e, 'sand');
  const ic = iconOf(course, e) ?? (e.count ? 'users' : 'user');
  const base = proj === 'iso'
    ? `<ellipse class="ent-shadow" cx="0" cy="10" rx="40" ry="18"/>`
      + `<path class="face face--side" style="fill:var(--h-${hue}-side)" d="${roundPoly([[-36, 0], [0, 18], [36, 0], [36, 8], [0, 26], [-36, 8]], 6)}"/>`
      + `<path class="face face--top" style="fill:var(--h-${hue}-top)" d="${roundPoly([[0, -18], [36, 0], [0, 18], [-36, 0]], 8)}"/>`
      + `<path class="outline" d="${roundPoly([[0, -18], [36, 0], [36, 8], [0, 26], [-36, 8], [-36, 0]], 8)}"/>`
    : '';
  const cy = proj === 'iso' ? -24 : 0;
  return base
    + `<circle class="flat-drop" cx="2" cy="${cy + 3}" r="19"/>`
    + `<circle class="actor__face" style="fill:var(--h-${hue}-top)" cx="0" cy="${cy}" r="19"/>`
    + iconAt(ic, 0, cy, 19)
    + (e.label ? pill(e.label, 0, (proj === 'iso' ? 44 : 38), {}) : '')
    + (e.count ? pill(e.count, 0, cy - 34, { small: true, icon: 'users' }) : '')
    + (e.pill ? pill(e.pill, 0, (proj === 'iso' ? 68 : 62), { small: true }) : '');
}

/* ───────── zone ───────── */

function zoneCorners(e: ZoneEntity, proj: Projection): Pt[] {
  const [w, d] = e.size;
  // iso では床の目に沿った平行四辺形（w は右下方向、d は左下方向の長さ）。at は奥の角。
  if (proj === 'iso') return [[0, 0], [w * 52, w * 26], [(w - d) * 52, (w + d) * 26], [-d * 52, d * 26]];
  return [[0, 0], [w, 0], [w, d], [0, d]].map((p) => project(p as Pt, proj));
}

function zone(e: ZoneEntity, course: Course, proj: Projection): string {
  const hue = hueOf(course, e, 'slate');
  const c = zoneCorners(e, proj);
  const top = c.reduce((m, p) => (p[1] < m[1] ? p : m));
  return `<path class="zone" style="fill:var(--h-${hue}-top);stroke:var(--h-${hue}-line)" d="${roundPoly(c, 14)}"/>`
    + (e.label ? pill(e.label, proj === 'iso' ? top[0] : c[0][0] + textWidth(e.label, 11) / 2 + 22, proj === 'iso' ? top[1] + 4 : c[0][1], { small: true }) : '');
}

/* ───────── queue ───────── */

const CELL = { w: 74, h: 26, gap: 5, pad: 8 };

function queueSize(e: QueueEntity): { w: number; h: number; n: number; head: number } {
  const n = Math.max(e.capacity ?? 0, e.items.length, 1);
  const stack = e.layout === 'stack';
  const head = e.label ? 22 : 0;
  const w = stack ? CELL.w + CELL.pad * 2 : n * CELL.w + (n - 1) * CELL.gap + CELL.pad * 2;
  const h = (stack ? n * CELL.h + (n - 1) * CELL.gap : CELL.h) + CELL.pad * 2 + head;
  return { w, h, n, head };
}

function queue(e: QueueEntity, course: Course): string {
  const { w, h, n, head } = queueSize(e);
  const hue = hueOf(course, e, 'sand');
  const stack = e.layout === 'stack';
  const x0 = -w / 2, y0 = -h / 2;
  let s = `<rect class="card-drop" x="${x0 + 2.5}" y="${y0 + 3.5}" width="${w}" height="${h}" rx="11"/>`
    + `<rect class="card-face" x="${x0}" y="${y0}" width="${w}" height="${h}" rx="11"/>`;
  if (e.label) {
    const ic = iconOf(course, e);
    s += (ic ? iconAt(ic, x0 + 17, y0 + 15, 12) : '')
      + `<text class="card-title" x="${x0 + (ic ? 28 : 11)}" y="${y0 + 15}" font-size="10" dominant-baseline="central">${esc(e.label)}</text>`
      + (e.sub ? `<text class="card-sub" x="${x0 + w - 10}" y="${y0 + 15}" font-size="9.5" text-anchor="end" dominant-baseline="central">${esc(e.sub)}</text>` : '');
  }
  for (let i = 0; i < n; i++) {
    // stack は下から積む。row は左が先頭（次に取り出される側）。
    const cx = stack ? x0 + CELL.pad : x0 + CELL.pad + i * (CELL.w + CELL.gap);
    const cy = stack ? y0 + head + CELL.pad + (n - 1 - i) * (CELL.h + CELL.gap) : y0 + head + CELL.pad;
    const item = e.items[i];
    if (item == null) {
      s += `<rect class="slot" x="${cx}" y="${cy}" width="${CELL.w}" height="${CELL.h}" rx="7"/>`;
    } else {
      const ih = e.itemHues?.[i] ?? hue;
      s += `<g class="slot-item" data-item="${esc(item)}"><rect style="fill:var(--h-${ih}-top)" x="${cx}" y="${cy}" width="${CELL.w}" height="${CELL.h}" rx="7"/>`
        + `<text style="fill:var(--h-${ih}-ink)" x="${cx + CELL.w / 2}" y="${cy + CELL.h / 2}" font-size="${textWidth(item, 10.5) > CELL.w - 8 ? 9 : 10.5}" text-anchor="middle" dominant-baseline="central">${esc(item)}</text></g>`;
    }
  }
  return s;
}

/* ───────── panel ───────── */

function panelSize(e: PanelEntity): { w: number; h: number } {
  const rows = (e.rows?.length ?? 0) + (e.head ? 1 : 0) + (e.lines?.length ?? 0) + (e.bars?.length ?? 0);
  let w = e.label ? textWidth(e.label, 10.5) + 40 : 120;
  if (e.head) w = Math.max(w, textWidth(e.head[0], 10) + textWidth(e.head[1], 10) + 44);
  for (const r of e.rows ?? []) w = Math.max(w, textWidth(r[0], 10.5) + textWidth(r[1], 11) + 44);
  for (const l of e.lines ?? []) w = Math.max(w, textWidth(l, 10.5) + 26);
  for (const b of e.bars ?? []) w = Math.max(w, textWidth(b[0], 10.5) + 120);
  return { w: Math.ceil(w), h: (e.label ? 26 : 8) + rows * 21 + 8 };
}

function panel(e: PanelEntity, course: Course): string {
  const { w, h } = panelSize(e);
  const x0 = -w / 2, y0 = -h / 2;
  let y = y0 + (e.label ? 26 : 8);
  const hue = e.role ? course.roles[e.role]?.hue : undefined;
  let s = `<rect class="card-drop" x="${x0 + 2.5}" y="${y0 + 3.5}" width="${w}" height="${h}" rx="10"/>`
    + `<rect class="card-face" x="${x0}" y="${y0}" width="${w}" height="${h}" rx="10"/>`;
  if (e.label) {
    // 役割があれば、見出しの帯をその色にする（どの役割のカードかが色でわかる）
    if (hue) s += `<path class="card-band" style="fill:var(--h-${hue}-top)" d="M${x0 + 0.8} ${y0 + 26}V${y0 + 10}a9.2 9.2 0 0 1 9.2-9.2h${w - 20}a9.2 9.2 0 0 1 9.2 9.2V${y0 + 26}z"/>`;
    s += `<text class="card-title" ${hue ? `style="fill:var(--h-${hue}-ink)"` : ''} x="${x0 + 12}" y="${y0 + 14.5}" font-size="10" dominant-baseline="central">${esc(e.label)}</text><path class="card-rule${hue ? ' card-rule--ink' : ''}" d="M${x0 + 1} ${y0 + 26}h${w - 2}"/>`;
  }
  if (e.head) {
    s += `<text class="card-head" x="${x0 + 12}" y="${y + 10.5}" font-size="10" dominant-baseline="central">${esc(e.head[0])}</text>`
      + `<text class="card-head" x="${x0 + w - 12}" y="${y + 10.5}" font-size="10" text-anchor="end" dominant-baseline="central">${esc(e.head[1])}</text>`
      + `<path class="card-rule" d="M${x0 + 8} ${y + 20.5}h${w - 16}"/>`;
    y += 21;
  }
  (e.lines ?? []).forEach((l, i) => {
    const on = e.mark?.includes(i);
    s += (on ? `<rect class="line-mark" x="${x0 + 5}" y="${y + 1}" width="${w - 10}" height="19" rx="5"/>` : '')
      + `<text class="card-code${on ? ' is-on' : ''}" x="${x0 + 12}" y="${y + 10.5}" font-size="10.5" dominant-baseline="central" xml:space="preserve">${esc(l)}</text>`;
    y += 21;
  });
  (e.rows ?? []).forEach((r, i) => {
    const total = e.total && i === e.rows!.length - 1;
    s += (total ? `<rect class="row-total" x="${x0 + 5}" y="${y + 1}" width="${w - 10}" height="19" rx="5"/>` : '')
      + `<text class="card-key tone-${r[2] ?? 'neutral'}" x="${x0 + 12}" y="${y + 10.5}" font-size="10.5" dominant-baseline="central">${esc(r[0])}</text>`
      + `<text class="card-val tone-${r[2] ?? 'neutral'}" x="${x0 + w - 12}" y="${y + 10.5}" font-size="11" text-anchor="end" dominant-baseline="central">${esc(r[1])}</text>`;
    y += 21;
  });
  (e.bars ?? []).forEach((b) => {
    const bw = 84;
    s += `<text class="card-key" x="${x0 + 12}" y="${y + 10.5}" font-size="10.5" dominant-baseline="central">${esc(b[0])}</text>`
      + `<rect class="gauge__track" x="${x0 + w - bw - 12}" y="${y + 7}" width="${bw}" height="7" rx="3.5"/>`
      + `<rect class="bar-fill tone-bg-${b[2] ?? 'good'}" x="${x0 + w - bw - 12}" y="${y + 7}" width="${(bw * Math.max(0.03, Math.min(1, b[1]))).toFixed(1)}" height="7" rx="3.5"/>`;
    y += 21;
  });
  return s;
}

/* ───────── 公開 API ───────── */

export function makeCtx(proj: Projection): RenderCtx {
  return {
    project: (x, y) => project([x, y], proj),
    projection: proj,
    esc,
    icon: iconAt,
    pill: (t, x, y, o) => pill(t, x, y, o),
  };
}

export function renderEntity(e: Entity, course: Course): string {
  const proj = course.projection;
  switch (e.kind) {
    case 'block':
    case 'store': return proj === 'iso' ? blockIso(e, course) : blockFlat(e, course);
    case 'actor': return actor(e, course, proj);
    case 'zone': return zone(e, course, proj);
    case 'queue': return queue(e, course);
    case 'panel': return panel(e, course);
    case 'note': return pill((e as NoteEntity).label ?? '', 0, 0, { tone: (e as NoteEntity).tone });
    case 'custom': {
      const r = course.renderers?.[(e as CustomEntity).renderer];
      return r ? r.draw(e as CustomEntity, makeCtx(proj)) : '';
    }
  }
}

export function shapeOf(e: Entity, course: Course): Shape {
  const proj = course.projection;
  switch (e.kind) {
    case 'block':
    case 'store': {
      const s = e.size ?? 1;
      if (proj === 'flat') {
        const w = FLAT.w * s, h = FLAT.h * s;
        return { bounds: [-w / 2 - 4, -h / 2 - (e.gauge != null ? 30 : 6), w / 2 + 6, h / 2 + (e.pill ? 32 : 8)], rx: w / 2 + 7, ry: h / 2 + 7, rect: true, layer: 1 };
      }
      const a = BLOCK.a * s, b = BLOCK.b * s, h = BLOCK.h * s;
      const out = labelBelow(e);
      const below = 8 + (out && e.label ? 24 : 0) + (out && e.sub ? 15 : 0) + (e.pill ? 22 : 0);
      return { bounds: [-a - 6, -h - b - (e.gauge != null ? 30 : 6), a + 6, b + below], rx: a + 9, ry: b + 7, layer: 1 };
    }
    case 'actor':
      return proj === 'iso'
        ? { bounds: [-46, e.count ? -70 : -48, 46, e.pill ? 82 : 58], rx: 46, ry: 25, layer: 1 }
        : { bounds: [-40, e.count ? -46 : -24, 40, e.pill ? 74 : 52], rx: 27, ry: 27, layer: 1 };
    case 'zone': {
      const c = zoneCorners(e, proj);
      const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]);
      return { bounds: [Math.min(...xs) - 6, Math.min(...ys) - 14, Math.max(...xs) + 6, Math.max(...ys) + 6], rx: 0, ry: 0, layer: -1 };
    }
    case 'queue': {
      const { w, h } = queueSize(e);
      return { bounds: [-w / 2 - 3, -h / 2 - 3, w / 2 + 6, h / 2 + 7], rx: w / 2 + 6, ry: h / 2 + 6, rect: true, layer: 2 };
    }
    case 'panel': {
      const { w, h } = panelSize(e);
      return { bounds: [-w / 2 - 3, -h / 2 - 3, w / 2 + 6, h / 2 + 7], rx: w / 2 + 6, ry: h / 2 + 6, rect: true, layer: 2 };
    }
    case 'note': {
      const w = textWidth(e.label ?? '', 11) + 22;
      return { bounds: [-w / 2, -13, w / 2, 15], rx: w / 2 + 4, ry: 16, rect: true, layer: 2 };
    }
    case 'custom': {
      const r = course.renderers?.[e.renderer];
      const b = r?.bounds(e) ?? [-40, -40, 40, 40];
      const rad = r?.radius ?? Math.max(b[2], -b[0]);
      return Array.isArray(rad)
        ? { bounds: b, rx: rad[0], ry: rad[1], rect: true, layer: 1 }
        : { bounds: b, rx: rad, ry: rad, layer: 1 };
    }
  }
}

/** center から toward へ向かう線が図形の縁と交わる点。リンクの端を図形の外に出すために使う。 */
export function clipToShape(center: Pt, toward: Pt, sh: Shape): Pt {
  const dx = toward[0] - center[0], dy = toward[1] - center[1];
  if ((!dx && !dy) || (!sh.rx && !sh.ry)) return center;
  let t: number;
  if (sh.rect) t = Math.min(sh.rx / Math.abs(dx || 1e-6), sh.ry / Math.abs(dy || 1e-6));
  else t = 1 / Math.sqrt((dx * dx) / (sh.rx * sh.rx) + (dy * dy) / (sh.ry * sh.ry));
  t = Math.min(t, 0.48);
  return [center[0] + dx * t, center[1] + dy * t];
}
