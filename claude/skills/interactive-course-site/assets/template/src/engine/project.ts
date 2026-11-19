export type Projection = 'iso' | 'flat';
export type Pt = [number, number];

/**
 * グリッド 1 単位の画面上の大きさ（px）。座標は [列, 行] で、どちらの投影でも右が列+、下が行+。
 * iso は床の菱形（104×52）の頂点に乗る。列と行を同じだけ動かすと、線が床の目に沿う。
 */
export function unitSize(p: Projection): Pt {
  return p === 'iso' ? [104, 52] : [172, 112];
}

export function project(at: Pt, p: Projection): Pt {
  const [ux, uy] = unitSize(p);
  return [at[0] * ux, at[1] * uy];
}
