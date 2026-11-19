import type { Tone } from './types';

/**
 * 指標の閾値（値 → 良・注意・悪）を作る部品。Course.metrics の tone に渡す。
 * 題材によって「良い」の形は違う。小さいほど良い（応答時間）、大きいほど良い（的中率）、
 * 0 であるべき（貸借の差・取りこぼし）、範囲に収まるべき（温度・在庫）など、合うものを選ぶ。
 */

/** 小さいほど良い。good 以下なら良、warn 以下なら注意、それを超えたら悪。 */
export const below = (good: number, warn: number) => (v: number): Tone => (v <= good ? 'good' : v <= warn ? 'warn' : 'bad');

/** 大きいほど良い。good 以上なら良、warn 以上なら注意、それ未満は悪。 */
export const above = (good: number, warn: number) => (v: number): Tone => (v >= good ? 'good' : v >= warn ? 'warn' : 'bad');

/** ぴったり target であるべき（不変条件）。tolerance 以内のずれは注意、それ以上は悪。 */
export const exactly = (target = 0, tolerance = 0) => (v: number): Tone => {
  const d = Math.abs(v - target);
  return d === 0 ? 'good' : d <= tolerance ? 'warn' : 'bad';
};

/** 範囲 [lo, hi] に収まるべき。margin だけはみ出したところまでは注意。 */
export const within = (lo: number, hi: number, margin = 0) => (v: number): Tone =>
  v >= lo && v <= hi ? 'good' : v >= lo - margin && v <= hi + margin ? 'warn' : 'bad';

/** 良し悪しのない量（単に見せたい数）。色を付けない。 */
export const plain = (): Tone => 'neutral';
