/** 登場時の行き過ぎ量。大きいほど弾む */
const OVERSHOOT = 1.5;

/** モーションの語彙。ここにない easing や duration を場当たりで足さない。 */
export const ease = {
  inOut: (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number): number => 1 - Math.pow(1 - t, 3),
  /** 少し行き過ぎて戻る。登場に使う */
  back: (t: number): number => 1 + (OVERSHOOT + 1) * Math.pow(t - 1, 3) + OVERSHOOT * Math.pow(t - 1, 2),
};

/** 振り付けの時間割（ms）。退場 → 移動 → 登場 → 線 の順に重ねる。 */
export const T = {
  exit: 380,
  move: 760,
  enter: 620,
  stagger: 110,
  draw: 520,
  zoom: 340,
  count: 700,
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

interface Job {
  start: number;
  dur: number;
  ease: (t: number) => number;
  tick: (v: number) => void;
  done?: () => void;
}

/** requestAnimationFrame 1 本で全トゥイーンを回す小さなスケジューラ。 */
export class Timeline {
  private jobs = new Set<Job>();
  private raf = 0;
  private listeners = new Set<(now: number, dt: number) => void>();
  private last = 0;
  /** true のとき全トゥイーンを即座に終端へ進める（prefers-reduced-motion） */
  instant = false;

  add(delay: number, dur: number, easing: (t: number) => number, tick: (v: number) => void, done?: () => void): void {
    if (this.instant || (dur <= 0 && delay <= 0)) { tick(1); done?.(); return; }
    this.jobs.add({ start: performance.now() + delay, dur, ease: easing, tick, done });
    this.kick();
  }

  /** 毎フレーム呼ばれる処理（粒子の更新など）を登録する */
  onFrame(fn: (now: number, dt: number) => void): () => void {
    this.listeners.add(fn);
    this.kick();
    return () => this.listeners.delete(fn);
  }

  /** 進行中のトゥイーンをすべて終端まで進めて捨てる */
  flush(): void {
    // done の中で新しいジョブが足されることがあるので、空になるまで回す
    for (let guard = 0; this.jobs.size && guard < 8; guard++) {
      const batch = [...this.jobs];
      this.jobs.clear();
      for (const j of batch) { j.tick(1); j.done?.(); }
    }
    this.jobs.clear();
  }

  private kick(): void {
    if (this.raf || typeof requestAnimationFrame === 'undefined') return;
    this.last = performance.now();
    const loop = (now: number): void => {
      const dt = Math.min(64, now - this.last);
      this.last = now;
      for (const j of [...this.jobs]) {
        const t = (now - j.start) / Math.max(j.dur, 1);
        if (t < 0) continue;
        j.tick(j.ease(clamp(t, 0, 1)));
        if (t >= 1) { this.jobs.delete(j); j.done?.(); }
      }
      for (const fn of this.listeners) fn(now, dt);
      this.raf = this.jobs.size || this.listeners.size ? requestAnimationFrame(loop) : 0;
    };
    this.raf = requestAnimationFrame(loop);
  }
}
