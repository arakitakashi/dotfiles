import type { Course, Entity, Flow, Link, Scene } from '../types';
import { diffScenes, linkKey } from './diff';
import { clipToShape, pill, renderEntity, roundPoly, shapeOf, type Shape } from './entities';
import { expandRoute, makeRng, pickBranch } from './flows';
import { project, type Pt } from './project';
import { T, Timeline, clamp, ease, lerp } from './tween';

type Box = [number, number, number, number]; // x, y, w, h
const NS = 'http://www.w3.org/2000/svg';
/** 図の文字が読める最小の拡大率。これを下回るときは変化した部分に寄る。 */
const MIN_SCALE = 0.62;

interface EntView {
  spec: Entity;
  g: SVGGElement;
  inner: SVGGElement;
  pos: Pt;
  shape: Shape;
}
interface LinkView {
  spec: Link;
  g: SVGGElement;
  line: SVGPathElement;
  label: SVGGElement;
  /** 中心から中心までの折れ線（粒子の経路に使う） */
  path: Pt[];
}
interface Particle {
  el: SVGGElement;
  pts: Pt[];
  len: number;
  d: number;
  speed: number;
  flow: Flow;
  back: boolean;
}

const el = <K extends keyof SVGElementTagNameMap>(tag: K, cls?: string): SVGElementTagNameMap[K] => {
  const n = document.createElementNS(NS, tag);
  if (cls) n.setAttribute('class', cls);
  return n;
};

function polyLen(pts: Pt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
function pointAt(pts: Pt[], d: number): Pt {
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= seg || i === pts.length - 1) {
      const t = seg ? clamp(d / seg, 0, 1) : 0;
      return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)];
    }
    d -= seg;
  }
  return pts[0];
}

export interface StageHooks {
  /** 読者がズーム・パンしたかどうかが変わったとき */
  onZoomChange?: (zoomed: boolean) => void;
}

export class Stage {
  readonly svg: SVGSVGElement;
  private grid: SVGSVGElement;
  private L: Record<'zones' | 'links' | 'flows' | 'ents' | 'labels' | 'fx', SVGGElement>;
  private views = new Map<string, EntView>();
  private links = new Map<string, LinkView>();
  private particles: Particle[] = [];
  private flowState = new Map<string, { acc: number; pick: (n: number) => number; n: number }>();
  private scene: Scene | null = null;
  private tl = new Timeline();
  private cam: Box = [0, 0, 800, 500];
  private home: Box = [0, 0, 800, 500];
  private zoomed = false;
  private paused = false;
  private flowsLive = false;
  private size: Pt = [800, 500];
  private ro: ResizeObserver;
  private stopFrame: () => void;
  private gen = 0;
  private busyUntil = 0;

  constructor(private host: HTMLElement, private course: Course, private reduced: () => boolean, private hooks: StageHooks = {}) {
    const proj = course.projection;
    host.innerHTML = '';
    this.grid = el('svg', `stage-grid stage-grid--${proj}`);
    this.grid.setAttribute('aria-hidden', 'true');
    this.grid.innerHTML = proj === 'iso'
      ? '<defs><pattern id="g-iso" width="104" height="52" patternUnits="userSpaceOnUse"><path d="M0 26 52 0l52 26-52 26z" fill="none"/></pattern></defs><rect x="-6000" y="-6000" width="12000" height="12000" fill="url(#g-iso)"/>'
      : '<defs><pattern id="g-flat" width="42" height="42" patternUnits="userSpaceOnUse"><circle cx="21" cy="21" r="1.1"/></pattern></defs><rect x="-6000" y="-6000" width="12000" height="12000" fill="url(#g-flat)"/>';
    this.svg = el('svg', `stage-svg stage-svg--${proj}`);
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.grid.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.innerHTML = '<defs>'
      + '<marker id="arr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path class="arr" d="M1 1.5 9 5 1 8.5z"/></marker>'
      + '<marker id="arr-off" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arr arr--off" d="M1 1.5 9 5 1 8.5z"/></marker>'
      + '<filter id="soft" x="-40%" y="-80%" width="180%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>'
      + '</defs>';
    const mk = (c: string): SVGGElement => this.svg.appendChild(el('g', c));
    this.L = { zones: mk('L-zones'), links: mk('L-links'), flows: mk('L-flows'), ents: mk('L-ents'), labels: mk('L-labels'), fx: mk('L-fx') };
    host.append(this.grid, this.svg);

    this.ro = new ResizeObserver(() => this.measure());
    this.ro.observe(host);
    this.measure(true);
    this.stopFrame = this.tl.onFrame((_now, dt) => this.frame(dt));
    this.bindGestures();
  }

  destroy(): void {
    this.ro.disconnect();
    this.stopFrame();
    this.tl.flush();
    this.host.innerHTML = '';
  }

  setAlt(text: string): void {
    this.svg.setAttribute('aria-label', text);
  }

  setPaused(p: boolean): void { this.paused = p; }
  get isPaused(): boolean { return this.paused; }
  get current(): Scene | null { return this.scene; }

  /* ───────── シーンの切り替え ───────── */

  /**
   * 次のシーンへ進む。前のシーンとの差分を「退場 → 移動 → 登場 → 線」の順に見せる。
   * quick は読者がつまみを動かしたとき用（振り付けを省いて素早く追従する）。
   */
  goTo(next: Scene, opts: { animate?: boolean; quick?: boolean } = {}): void {
    this.tl.instant = this.reduced();
    this.tl.flush();
    const animate = (opts.animate ?? true) && !this.tl.instant;
    const gen = ++this.gen;
    const d = diffScenes(this.scene, next);
    const k = !animate ? 0 : opts.quick ? 0.4 : 1;
    const first = !this.scene;
    this.scene = next;
    this.clearParticles();
    this.flowsLive = false;

    // 1) 退場
    const tExit = d.exit.length || d.linkExit.length ? T.exit * k : 0;
    for (const e of d.exit) {
      const v = this.views.get(e.id);
      if (!v) continue;
      this.views.delete(e.id);
      this.tl.add(0, tExit, ease.inOut, (t) => this.pose(v, 1 - t, lerp(1, 0.9, t), 0), () => v.g.remove());
    }
    for (const l of d.linkExit) {
      const lv = this.links.get(linkKey(l));
      if (!lv) continue;
      this.links.delete(linkKey(l));
      this.tl.add(0, tExit * 0.8, ease.out, (t) => { lv.g.style.opacity = lv.label.style.opacity = String(1 - t); }, () => { lv.g.remove(); lv.label.remove(); });
    }

    // 2) 移動・変更・カメラ
    const tMove = (d.moved.length || !first ? T.move : 0) * k;
    const t0 = tExit * 0.6;
    for (const e of d.moved) {
      const v = this.views.get(e.id)!;
      const from = v.pos, to = project(e.at, this.course.projection);
      this.tl.add(t0, tMove, ease.inOut, (t) => { v.pos = [lerp(from[0], to[0], t), lerp(from[1], to[1], t)]; this.place(v); });
    }
    for (const e of d.changed) this.tl.add(t0, 0, ease.out, () => {}, () => { if (gen === this.gen) this.rerender(e, animate); });
    for (const e of d.same) this.views.get(e.id)!.spec = e;
    for (const e of d.moved) this.views.get(e.id)!.spec = e;

    // 3) 登場（先に見えない状態で作り、並び順とカメラの計算に含める）
    const tEnterAt = t0 + (d.moved.length ? tMove * 0.55 : first ? 0 : tMove * 0.25);
    d.enter.forEach((e, i) => {
      const v = this.mount(e);
      this.pose(v, 0, 0.82, -12);
      this.tl.add(tEnterAt + i * T.stagger * k, T.enter * k, ease.back, (t) => this.pose(v, clamp(t * 1.6, 0, 1), lerp(0.82, 1, t), lerp(-12, 0, t)));
    });
    this.reorder();

    // 4) 線
    const tLinkAt = tEnterAt + (d.enter.length ? Math.min(d.enter.length, 4) * T.stagger * k + T.enter * k * 0.45 : 0);
    for (const l of d.linkChanged) {
      const lv = this.links.get(linkKey(l));
      if (lv) { lv.spec = l; this.styleLink(lv); }
    }
    d.linkEnter.forEach((l, i) => {
      const lv = this.mountLink(l);
      lv.g.style.opacity = '0';
      this.tl.add(tLinkAt + i * 70 * k, T.draw * k, ease.inOut, (t) => this.drawLink(lv, t), () => this.drawLink(lv, 1));
    });

    // カメラ: 目的地は最終配置から計算する
    const target = this.frameFor(next, d.count && !first ? this.touched(d) : null);
    this.home = target;
    const from = this.cam;
    this.setZoomed(false);
    this.tl.add(first ? 0 : t0, first ? 0 : Math.max(tMove, T.move * k), ease.inOut, (t) => this.applyCam([
      lerp(from[0], target[0], t), lerp(from[1], target[1], t), lerp(from[2], target[2], t), lerp(from[3], target[3], t),
    ]));

    // 5) 粒子
    const total = tLinkAt + (d.linkEnter.length ? T.draw * k * 0.7 : 0);
    this.tl.add(total, 0, ease.out, () => {}, () => { if (gen === this.gen) this.startFlows(); });
    this.busyUntil = performance.now() + t0 + tMove + 80;
    this.updateLinks();
  }

  /** 現在のステップの変化をもう一度見せる。 */
  replay(prev: Scene | null, cur: Scene): void {
    this.tl.flush();
    this.reset();
    if (prev) this.goTo(prev, { animate: false });
    this.goTo(cur, { animate: true });
  }

  private reset(): void {
    this.gen++;
    this.clearParticles();
    for (const v of this.views.values()) v.g.remove();
    for (const l of this.links.values()) { l.g.remove(); l.label.remove(); }
    this.views.clear();
    this.links.clear();
    this.L.fx.innerHTML = '';
    this.scene = null;
  }

  /* ───────── エンティティ ───────── */

  private mount(e: Entity): EntView {
    const g = el('g', `ent ent--${e.kind}`);
    const inner = el('g', 'ent__in');
    g.appendChild(inner);
    const v: EntView = { spec: e, g, inner, pos: project(e.at, this.course.projection), shape: shapeOf(e, this.course) };
    inner.innerHTML = renderEntity(e, this.course);
    this.decorate(v);
    (e.kind === 'zone' ? this.L.zones : this.L.ents).appendChild(g);
    this.views.set(e.id, v);
    this.place(v);
    return v;
  }

  private decorate(v: EntView): void {
    v.g.dataset.id = v.spec.id;
    v.g.dataset.state = v.spec.state ?? 'ok';
    if (v.spec.role) v.g.dataset.role = v.spec.role;
  }

  private rerender(e: Entity, animate: boolean): void {
    const v = this.views.get(e.id);
    if (!v) return;
    const old = v.spec;
    const oldItems = new Set(old.kind === 'queue' ? old.items : []);
    const oldGauge = 'gauge' in old ? old.gauge : undefined;
    v.spec = e;
    v.shape = shapeOf(e, this.course);
    v.inner.innerHTML = renderEntity(e, this.course);
    this.decorate(v);
    if (!animate) return;
    if (e.kind === 'queue') {
      v.inner.querySelectorAll<SVGGElement>('.slot-item').forEach((n) => { if (!oldItems.has(n.dataset.item ?? '')) n.classList.add('is-new'); });
    }
    const fill = v.inner.querySelector<SVGRectElement>('[data-gauge]');
    if (fill && oldGauge != null && 'gauge' in e && e.gauge != null) {
      const to = Number(fill.getAttribute('width'));
      const from = (to / Math.max(0.04, e.gauge)) * Math.max(0.04, oldGauge);
      this.tl.add(0, T.count, ease.out, (t) => fill.setAttribute('width', lerp(from, to, t).toFixed(1)));
    }
    if (old.kind !== 'zone') this.spot(v.pos, v.shape);
  }

  private pose(v: EntView, alpha: number, scale: number, dy: number): void {
    v.inner.style.opacity = alpha >= 1 ? '' : String(alpha);
    v.inner.setAttribute('transform', scale === 1 && !dy ? '' : `translate(0 ${dy.toFixed(1)}) scale(${scale.toFixed(3)})`);
  }

  private place(v: EntView): void {
    v.g.setAttribute('transform', `translate(${v.pos[0].toFixed(1)} ${v.pos[1].toFixed(1)})`);
  }

  /** 奥から手前の順に並べ直す（iso で手前の物が奥の物を隠すように）。 */
  private reorder(): void {
    const order = [...this.views.values()].filter((v) => v.spec.kind !== 'zone').sort((a, b) => {
      const pa = project(a.spec.at, this.course.projection), pb = project(b.spec.at, this.course.projection);
      return a.shape.layer - b.shape.layer || pa[1] - pb[1];
    });
    for (const v of order) this.L.ents.appendChild(v.g);
  }

  /* ───────── リンク ───────── */

  private mountLink(l: Link): LinkView {
    const g = el('g', 'link');
    const line = el('path', 'link__line');
    const label = el('g', 'link__label');
    g.appendChild(line);
    this.L.links.appendChild(g);
    this.L.labels.appendChild(label);
    const lv: LinkView = { spec: l, g, line, label, path: [] };
    this.links.set(linkKey(l), lv);
    this.styleLink(lv);
    return lv;
  }

  private styleLink(lv: LinkView): void {
    const s = lv.spec.style ?? 'solid';
    lv.g.setAttribute('class', `link link--${s}`);
    if (lv.spec.plain || s === 'cut') lv.line.removeAttribute('marker-end');
    else lv.line.setAttribute('marker-end', `url(#${s === 'off' ? 'arr-off' : 'arr'})`);
    lv.label.setAttribute('class', `link__label link__label--${s}`);
    this.layoutLink(lv);
  }

  private layoutLink(lv: LinkView): void {
    const a = this.views.get(lv.spec.from), b = this.views.get(lv.spec.to);
    if (!a || !b) return;
    const mids = (lv.spec.via ?? []).map((p) => project(p, this.course.projection));
    const start = clipToShape(a.pos, mids[0] ?? b.pos, a.shape);
    const end = clipToShape(b.pos, mids[mids.length - 1] ?? a.pos, b.shape);
    const pts = [start, ...mids, end];
    lv.path = [a.pos, ...mids, b.pos];
    lv.line.setAttribute('d', roundPoly(pts, 14, false));
    if (lv.spec.label) {
      const m = pointAt(pts, polyLen(pts) / 2);
      lv.label.innerHTML = pill(lv.spec.label, m[0], m[1], { small: true });
    } else lv.label.innerHTML = '';
  }

  private drawLink(lv: LinkView, t: number): void {
    lv.g.style.opacity = '';
    const solid = (lv.spec.style ?? 'solid') === 'solid';
    if (solid && t < 1) {
      const len = lv.line.getTotalLength?.() || 1;
      lv.line.style.strokeDasharray = `${len}`;
      lv.line.style.strokeDashoffset = `${len * (1 - t)}`;
    } else {
      lv.line.style.strokeDasharray = '';
      lv.line.style.strokeDashoffset = '';
      if (!solid) lv.g.style.opacity = t < 1 ? String(t) : '';
    }
    lv.label.style.opacity = t < 1 ? String(clamp(t * 2 - 1, 0, 1)) : '';
  }

  private updateLinks(): void {
    for (const lv of this.links.values()) this.layoutLink(lv);
  }

  /* ───────── カメラ ───────── */

  private measure(first = false): void {
    const r = this.host.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    const changed = Math.abs(r.width - this.size[0]) > 1 || Math.abs(r.height - this.size[1]) > 1;
    this.size = [r.width, r.height];
    if ((changed || first) && this.scene) {
      this.home = this.frameFor(this.scene, null);
      this.setZoomed(false);
      this.applyCam(this.home);
    }
  }

  private boundsOf(ids: Iterable<string>, scene: Scene): Box | null {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const byId = new Map(scene.entities.map((e) => [e.id, e]));
    for (const id of ids) {
      const e = byId.get(id);
      if (!e) continue;
      const p = project(e.at, this.course.projection);
      const b = shapeOf(e, this.course).bounds;
      x0 = Math.min(x0, p[0] + b[0]); y0 = Math.min(y0, p[1] + b[1]);
      x1 = Math.max(x1, p[0] + b[2]); y1 = Math.max(y1, p[1] + b[3]);
    }
    return Number.isFinite(x0) ? [x0, y0, x1 - x0, y1 - y0] : null;
  }

  private touched(d: ReturnType<typeof diffScenes>): string[] {
    const ids = new Set<string>([...d.enter, ...d.moved, ...d.changed].map((e) => e.id));
    for (const l of [...d.linkEnter, ...d.linkChanged]) { ids.add(l.from); ids.add(l.to); }
    return [...ids];
  }

  /** シーン全体を収める枠。画面が小さく文字が読めなくなるときは focus（変化した部分）に寄る。 */
  private frameFor(scene: Scene, focus: string[] | null): Box {
    const pad = scene.camera?.pad ?? 34;
    const want = scene.camera?.focus ?? scene.entities.map((e) => e.id);
    let b = this.boundsOf(want, scene) ?? [0, 0, 400, 300];
    for (const l of scene.links ?? []) for (const p of l.via ?? []) {
      const q = project(p, this.course.projection);
      const x1 = Math.max(b[0] + b[2], q[0]), y1 = Math.max(b[1] + b[3], q[1]);
      b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), 0, 0];
      b[2] = x1 - b[0]; b[3] = y1 - b[1];
    }
    const full = this.toAspect([b[0] - pad, b[1] - pad, b[2] + pad * 2, b[3] + pad * 2]);
    const scale = this.size[0] / full[2];
    if (scale >= MIN_SCALE) return full;
    // 全体では小さすぎる: 読める倍率の窓を、変化した部分の中心に置く
    const w = this.size[0] / MIN_SCALE, h = this.size[1] / MIN_SCALE;
    const f = (focus && this.boundsOf(focus, scene)) || b;
    const cx = clamp(f[0] + f[2] / 2, full[0] + w / 2, full[0] + full[2] - w / 2);
    const cy = clamp(f[1] + f[3] / 2, full[1] + h / 2, Math.max(full[1] + h / 2, full[1] + full[3] - h / 2));
    return [cx - w / 2, cy - h / 2, w, h];
  }

  private toAspect(b: Box): Box {
    const ar = this.size[0] / this.size[1];
    let [x, y, w, h] = b;
    if (w / h > ar) { const nh = w / ar; y -= (nh - h) / 2; h = nh; } else { const nw = h * ar; x -= (nw - w) / 2; w = nw; }
    return [x, y, w, h];
  }

  private applyCam(b: Box): void {
    this.cam = b;
    const vb = b.map((n) => n.toFixed(1)).join(' ');
    this.svg.setAttribute('viewBox', vb);
    this.grid.setAttribute('viewBox', vb);
  }

  private setZoomed(z: boolean): void {
    if (this.zoomed === z) return;
    this.zoomed = z;
    this.host.classList.toggle('is-zoomed', z);
    this.hooks.onZoomChange?.(z);
  }

  /** 全体表示に戻す。 */
  fit(): void {
    const from = this.cam, to = this.home;
    this.setZoomed(false);
    this.tl.add(0, T.zoom, ease.out, (t) => this.applyCam([lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t), lerp(from[3], to[3], t)]));
  }

  /** factor > 1 で拡大。at は画面上の位置（省略時は中央）。 */
  zoomBy(factor: number, at?: Pt, smooth = true): void {
    const r = this.host.getBoundingClientRect();
    const fx = at ? (at[0] - r.left) / r.width : 0.5, fy = at ? (at[1] - r.top) / r.height : 0.5;
    const from = this.cam;
    const w = clamp(from[2] / factor, this.home[2] / 6, this.home[2] * 1.6);
    const h = w * (from[3] / from[2]);
    const to: Box = [from[0] + (from[2] - w) * fx, from[1] + (from[3] - h) * fy, w, h];
    this.setZoomed(true);
    if (!smooth) { this.applyCam(to); return; }
    this.tl.add(0, T.zoom, ease.out, (t) => this.applyCam([lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t), lerp(from[3], to[3], t)]));
  }

  private bindGestures(): void {
    const h = this.host;
    h.addEventListener('wheel', (ev) => {
      if (!(ev.ctrlKey || ev.metaKey)) return; // 素のホイールはページのスクロールに譲る
      ev.preventDefault();
      this.zoomBy(Math.exp(-ev.deltaY * 0.01), [ev.clientX, ev.clientY], false);
    }, { passive: false });
    h.addEventListener('dblclick', (ev) => this.zoomBy(1.8, [ev.clientX, ev.clientY]));
    let drag: { x: number; y: number; cam: Box; id: number } | null = null;
    h.addEventListener('pointerdown', (ev) => {
      if (!this.zoomed || ev.button !== 0) return;
      drag = { x: ev.clientX, y: ev.clientY, cam: this.cam, id: ev.pointerId };
      h.setPointerCapture(ev.pointerId);
      h.classList.add('is-dragging');
    });
    h.addEventListener('pointermove', (ev) => {
      if (!drag || ev.pointerId !== drag.id) return;
      const k = this.cam[2] / this.size[0];
      this.applyCam([drag.cam[0] - (ev.clientX - drag.x) * k, drag.cam[1] - (ev.clientY - drag.y) * k, drag.cam[2], drag.cam[3]]);
    });
    const end = (): void => { drag = null; h.classList.remove('is-dragging'); };
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
  }

  /* ───────── 粒子と演出 ───────── */

  private routePts(ids: string[]): Pt[] {
    const out: Pt[] = [];
    for (let i = 0; i < ids.length - 1; i++) {
      const fwd = this.links.get(`${ids[i]}>${ids[i + 1]}`);
      const rev = this.links.get(`${ids[i + 1]}>${ids[i]}`);
      const a = this.views.get(ids[i])?.pos, b = this.views.get(ids[i + 1])?.pos;
      if (!a || !b) return [];
      const seg = fwd ? fwd.path : rev ? [...rev.path].reverse() : [a, b];
      out.push(...(i ? seg.slice(1) : seg));
    }
    return out;
  }

  private startFlows(): void {
    this.flowState.clear();
    this.flowsLive = true;
    const flows = this.scene?.flows ?? [];
    flows.forEach((f, i) => this.flowState.set(f.id, { acc: 0.7, pick: pickBranch(f.pick, makeRng(1000 + i)), n: 0 }));
    if (!this.reduced()) return;
    // 動きを減らす設定では、流れを止めた絵として経路上に置く
    for (const f of flows) {
      const st = this.flowState.get(f.id)!;
      const branches = Math.max(1, ...f.route.map((h) => (Array.isArray(h) ? h.length : 1)));
      for (let b = 0; b < branches; b++) {
        const p = this.spawn(f, st, false);
        if (p) { p.d = p.len * (0.38 + (b % 2) * 0.24); this.placeParticle(p); }
      }
    }
  }

  private clearParticles(): void {
    for (const p of this.particles) p.el.remove();
    this.particles = [];
  }

  private spawn(f: Flow, st: { pick: (n: number) => number; n: number }, back: boolean, ids?: string[]): Particle | null {
    const route = ids ?? expandRoute(f.route, st.pick);
    const pts = this.routePts(back ? [...route].reverse() : route);
    if (pts.length < 2) return null;
    const kind = back ? f.bounce! : f.pattern ? f.pattern[st.n % f.pattern.length] : f.kind;
    if (!back) st.n++;
    const def = this.course.flowKinds[kind] ?? { hue: 'sand', shape: 'dot', label: kind };
    const g = el('g', `pkt pkt--${def.shape}`);
    g.dataset.kind = kind;
    g.style.setProperty('--pk', `var(--h-${def.hue}-pk)`);
    g.innerHTML = def.shape === 'square' ? '<rect x="-4.6" y="-4.6" width="9.2" height="9.2" rx="2.2"/>'
      : def.shape === 'diamond' ? '<path d="M0-6 6 0 0 6-6 0z"/>'
        : `<circle r="${def.shape === 'ring' ? 4.6 : 5}"/>`;
    (g as SVGGElement & { __route?: string[] }).__route = route;
    this.L.flows.appendChild(g);
    const p: Particle = { el: g, pts, len: polyLen(pts), d: 0, speed: (f.speed ?? 3) * 62, flow: f, back };
    this.particles.push(p);
    return p;
  }

  private placeParticle(p: Particle): void {
    const q = pointAt(p.pts, p.d);
    const edge = Math.min(p.d, p.len - p.d);
    p.el.setAttribute('transform', `translate(${q[0].toFixed(1)} ${q[1].toFixed(1)})`);
    p.el.style.opacity = edge < 16 ? String(clamp(edge / 16, 0, 1)) : '';
  }

  private frame(dt: number): void {
    // 移動中は線を端点に追従させる
    if (performance.now() < this.busyUntil) this.updateLinks();
    if (!this.flowsLive || this.paused || this.reduced()) return;
    const sec = dt / 1000;
    for (const f of this.scene?.flows ?? []) {
      const st = this.flowState.get(f.id);
      if (!st) continue;
      st.acc += f.rate * sec;
      while (st.acc >= 1) { st.acc -= 1; if (this.particles.length < 90) this.spawn(f, st, false); }
    }
    for (const p of [...this.particles]) {
      p.d += p.speed * sec;
      if (p.d < p.len) { this.placeParticle(p); continue; }
      const end = p.pts[p.pts.length - 1];
      const route = (p.el as SVGGElement & { __route?: string[] }).__route;
      p.el.remove();
      this.particles.splice(this.particles.indexOf(p), 1);
      if (p.flow.bounce && !p.back) this.spawn(p.flow, this.flowState.get(p.flow.id)!, true, route);
      else if ((p.flow.end ?? 'none') !== 'none') this.fx(end, p.flow.end as 'pop' | 'burst');
    }
  }

  private fx(at: Pt, kind: 'pop' | 'burst'): void {
    const g = el('g', `fx fx--${kind}`);
    g.setAttribute('transform', `translate(${at[0].toFixed(1)} ${at[1].toFixed(1)})`);
    g.innerHTML = kind === 'pop' ? '<circle r="6"/>' : '<circle r="7"/><path d="m-3-3 6 6M3-3l-6 6"/>';
    this.L.fx.appendChild(g);
    this.tl.add(0, 460, ease.out, (t) => { g.style.opacity = String(1 - t); (g.firstChild as SVGElement).setAttribute('r', String(lerp(6, 17, t))); }, () => g.remove());
  }

  /** 変化した場所に一瞬だけ光を当てる（どこを見ればよいかを示す）。 */
  private spot(at: Pt, sh: Shape): void {
    const c = el('ellipse', 'fx-spot');
    const cx = at[0] + (sh.bounds[0] + sh.bounds[2]) / 2, cy = at[1] + (sh.bounds[1] + sh.bounds[3]) / 2;
    const rx = (sh.bounds[2] - sh.bounds[0]) / 2 + 10, ry = (sh.bounds[3] - sh.bounds[1]) / 2 + 8;
    c.setAttribute('cx', cx.toFixed(1)); c.setAttribute('cy', cy.toFixed(1));
    this.L.zones.appendChild(c);
    this.tl.add(0, 1100, ease.out, (t) => {
      c.setAttribute('rx', (rx * lerp(0.8, 1.15, t)).toFixed(1));
      c.setAttribute('ry', (ry * lerp(0.8, 1.15, t)).toFixed(1));
      c.style.opacity = String(Math.sin(Math.PI * t));
    }, () => c.remove());
  }
}
