import { describe, expect, it } from 'vitest';
import { diffScenes, linkKey } from '../src/engine/diff';
import { project, unitSize } from '../src/engine/project';
import { ease, lerp } from '../src/engine/tween';
import { expandRoute, makeRng, pickBranch } from '../src/engine/flows';
import type { Scene } from '../src/types';

const a: Scene = {
  entities: [
    { id: 'u', kind: 'actor', at: [0, 0], label: 'User' },
    { id: 's', kind: 'block', at: [3, 0], label: 'Server', gauge: 0.3 },
  ],
  links: [{ from: 'u', to: 's' }],
};

describe('diffScenes', () => {
  it('最初のシーンはすべて enter になる', () => {
    const d = diffScenes(null, a);
    expect(d.enter.map((e) => e.id)).toEqual(['u', 's']);
    expect(d.exit).toEqual([]);
    expect(d.linkEnter.map(linkKey)).toEqual(['u>s']);
  });

  it('同じ id は移動と変更に分類される', () => {
    const b: Scene = {
      entities: [
        { id: 'u', kind: 'actor', at: [0, 0], label: 'User' },
        { id: 's', kind: 'block', at: [3, 1], label: 'Server', gauge: 0.9 },
        { id: 'd', kind: 'store', at: [6, 1], label: 'DB' },
      ],
      links: [{ from: 'u', to: 's' }, { from: 's', to: 'd' }],
    };
    const d = diffScenes(a, b);
    expect(d.enter.map((e) => e.id)).toEqual(['d']);
    expect(d.moved.map((e) => e.id)).toEqual(['s']);
    expect(d.changed.map((e) => e.id)).toEqual(['s']);
    expect(d.same.map((e) => e.id)).toEqual(['u']);
    expect(d.linkEnter.map(linkKey)).toEqual(['s>d']);
    expect(d.linkExit).toEqual([]);
  });

  it('消えた要素とリンクは exit になる', () => {
    const b: Scene = { entities: [{ id: 'u', kind: 'actor', at: [0, 0], label: 'User' }] };
    const d = diffScenes(a, b);
    expect(d.exit.map((e) => e.id)).toEqual(['s']);
    expect(d.linkExit.map(linkKey)).toEqual(['u>s']);
  });

  it('リンクの style や label の変更は linkChanged になる', () => {
    const b: Scene = { ...a, links: [{ from: 'u', to: 's', style: 'cut' }] };
    const d = diffScenes(a, b);
    expect(d.linkChanged.map(linkKey)).toEqual(['u>s']);
  });

  it('変化の数を数えられる', () => {
    const b: Scene = { ...a, links: [{ from: 'u', to: 's', style: 'cut' }] };
    expect(diffScenes(a, b).count).toBe(1);
    expect(diffScenes(a, a).count).toBe(0);
  });
});

describe('project', () => {
  it('iso は床の菱形（2:1）の頂点に乗る', () => {
    const [ux, uy] = unitSize('iso');
    expect(ux).toBe(uy * 2);
    expect(project([1, 1], 'iso')).toEqual([ux, uy]);
    expect(project([0.5, -0.5], 'iso')).toEqual([ux / 2, -uy / 2]);
  });
  it('flat は列と行をそのまま拡大する', () => {
    const [ux, uy] = unitSize('flat');
    expect(project([2, 3], 'flat')).toEqual([2 * ux, 3 * uy]);
  });
});

describe('tween', () => {
  it('ease は 0 と 1 を保つ', () => {
    for (const k of ['inOut', 'out', 'back'] as const) {
      expect(ease[k](0)).toBeCloseTo(0);
      expect(ease[k](1)).toBeCloseTo(1);
    }
  });
  it('back は途中で 1 を超える', () => {
    expect(Math.max(...[0.6, 0.7, 0.8, 0.9].map(ease.back))).toBeGreaterThan(1);
  });
  it('lerp', () => expect(lerp(10, 20, 0.25)).toBe(12.5));
});

describe('flows', () => {
  it('分岐のない経路はそのまま展開される', () => {
    expect(expandRoute(['a', 'b', 'c'], () => 0)).toEqual(['a', 'b', 'c']);
  });
  it('rr は順番に選ぶ', () => {
    const pick = pickBranch('rr', makeRng(1));
    const got = [0, 1, 2, 3].map(() => expandRoute(['a', ['x', 'y', 'z']], pick)[1]);
    expect(got).toEqual(['x', 'y', 'z', 'x']);
  });
  it('重みが 0 の枝は選ばれない', () => {
    const pick = pickBranch([1, 0], makeRng(7));
    const got = new Set(Array.from({ length: 30 }, () => expandRoute(['a', ['x', 'y']], pick)[1]));
    expect([...got]).toEqual(['x']);
  });
  it('乱数は種が同じなら再現する', () => {
    const r1 = makeRng(42);
    const r2 = makeRng(42);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });
});
