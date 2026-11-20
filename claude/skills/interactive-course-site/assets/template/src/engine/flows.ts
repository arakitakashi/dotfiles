import type { Flow } from '../types';

/** 種つきの乱数（mulberry32）。リプレイで同じ流れを再現するために使う。 */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 分岐の選び方を「枝の数 → 添字」の関数にする。 */
export function pickBranch(pick: Flow['pick'], rng: () => number): (n: number) => number {
  if (Array.isArray(pick)) {
    return (n) => {
      const w = pick.slice(0, n);
      const total = w.reduce((a, b) => a + b, 0);
      if (total <= 0) return 0;
      let r = rng() * total;
      for (let i = 0; i < w.length; i++) {
        r -= w[i];
        if (r < 0) return i;
      }
      return w.length - 1;
    };
  }
  let i = 0;
  return (n) => i++ % n;
}

/** 分岐を含む経路を、1 粒子が実際に通る id の列に展開する。 */
export function expandRoute(route: Flow['route'], pick: (n: number) => number): string[] {
  return route.map((hop) => (Array.isArray(hop) ? hop[pick(hop.length)] : hop));
}
