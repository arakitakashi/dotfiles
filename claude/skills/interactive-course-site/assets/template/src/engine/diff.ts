import type { Entity, Link, Scene } from '../types';

export interface SceneDiff {
  enter: Entity[];
  exit: Entity[];
  /** 位置が変わった（次の状態の Entity） */
  moved: Entity[];
  /** 位置以外が変わった（次の状態の Entity） */
  changed: Entity[];
  same: Entity[];
  linkEnter: Link[];
  linkExit: Link[];
  linkChanged: Link[];
  /** 読者が追うべき変化の数。1 ステップ 1〜3 が目安（検証スクリプトが使う） */
  count: number;
}

export const linkKey = (l: Link): string => `${l.from}>${l.to}`;

const withoutAt = (e: Entity): string => {
  const { at: _at, ...rest } = e;
  return JSON.stringify(rest);
};

export function diffScenes(prev: Scene | null, next: Scene): SceneDiff {
  const before = new Map((prev?.entities ?? []).map((e) => [e.id, e]));
  const after = new Map(next.entities.map((e) => [e.id, e]));
  const d: SceneDiff = {
    enter: [], exit: [], moved: [], changed: [], same: [],
    linkEnter: [], linkExit: [], linkChanged: [], count: 0,
  };

  for (const e of next.entities) {
    const p = before.get(e.id);
    if (!p) { d.enter.push(e); continue; }
    const moved = p.at[0] !== e.at[0] || p.at[1] !== e.at[1];
    const changed = withoutAt(p) !== withoutAt(e);
    if (moved) d.moved.push(e);
    if (changed) d.changed.push(e);
    if (!moved && !changed) d.same.push(e);
  }
  for (const e of prev?.entities ?? []) if (!after.has(e.id)) d.exit.push(e);

  const lb = new Map((prev?.links ?? []).map((l) => [linkKey(l), l]));
  const la = new Map((next.links ?? []).map((l) => [linkKey(l), l]));
  for (const [k, l] of la) {
    const p = lb.get(k);
    if (!p) d.linkEnter.push(l);
    else if (JSON.stringify(p) !== JSON.stringify(l)) d.linkChanged.push(l);
  }
  for (const [k, l] of lb) if (!la.has(k)) d.linkExit.push(l);

  const touched = new Set([...d.moved, ...d.changed].map((e) => e.id));
  d.count = d.enter.length + d.exit.length + touched.size
    + d.linkEnter.length + d.linkExit.length + d.linkChanged.length;
  return d;
}
