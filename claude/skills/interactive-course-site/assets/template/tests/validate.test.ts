import { describe, expect, it } from 'vitest';
import { course } from './fixtures/course';
import { contrast, validateCourse, type Issue } from '../src/validate';
import type { Course, Lesson, Step } from '../src/types';

/**
 * 固定データ（tests/fixtures）のコースを複製し、1 か所だけ壊して検証する。
 * 実際の内容（src/content）は、テストではなく `npm run validate` が検査する。
 */
function broken(mutate: (lesson: Lesson, course: Course) => void): Issue[] {
  const c: Course = { ...course, modules: course.modules.map((m) => ({ ...m, lessons: m.lessons.map((l) => ({ ...l, goals: l.goals.map((g) => ({ ...g })), steps: l.steps.map((s) => ({ ...s })) })) })) };
  mutate(c.modules[0].lessons[0], c);
  return validateCourse(c);
}
const errors = (issues: Issue[]): string[] => issues.filter((i) => i.level === 'error').map((i) => i.rule);
const warns = (issues: Issue[]): string[] => issues.filter((i) => i.level === 'warn').map((i) => i.rule);

describe('validateCourse', () => {
  it('固定データのコースはエラーも警告もない', () => {
    expect(validateCourse(course)).toEqual([]);
  });

  it('最初のステップは準備か問題でなければならない', () => {
    expect(errors(broken((l) => { l.steps[0].chapter = 'technique'; }))).toContain('first-step');
  });

  it('最後は recap で、要点か表が要る', () => {
    expect(errors(broken((l) => { l.steps[l.steps.length - 1].chapter = 'insight'; }))).toContain('recap');
    expect(errors(broken((l) => { delete l.steps[l.steps.length - 1].takeaways; }))).toContain('recap');
  });

  it('解決の前に問題がなければならない', () => {
    expect(errors(broken((l) => { l.steps[1].chapter = 'solution'; }))).toContain('problem-first');
  });

  it('定義のない用語を拾う', () => {
    expect(errors(broken((l) => { l.steps[2].body = ['==未定義の用語== を使った段落です。これは検証で落ちるはず。', l.steps[2].body[1]]; }))).toContain('glossary');
  });

  it('存在しないレッスンへのリンクを拾う', () => {
    expect(errors(broken((l) => { l.steps[2].body = ['[[no-such-lesson#2|別のレッスン]] を参照してください。これは検証で落ちるはずです。', l.steps[2].body[1]]; }))).toContain('xref');
  });

  it('学習目標のステップ番号が範囲外', () => {
    expect(errors(broken((l) => { l.goals[0].step = 99; }))).toContain('goal-step');
  });

  it('リンクや粒子が存在しない id を指している', () => {
    expect(errors(broken((l) => { l.steps[0].scene = { ...l.steps[0].scene, links: [{ from: 'main', to: 'ghost' }] }; }))).toContain('scene-ref');
    expect(errors(broken((l) => { l.steps[0].scene = { ...l.steps[0].scene, flows: [{ id: 'f', route: ['main', 'nowhere'], kind: 'click', rate: 1 }] }; }))).toContain('scene-ref');
  });

  it('未定義の役割・粒子の種類・指標', () => {
    expect(errors(broken((l) => { l.steps[0].scene = { ...l.steps[0].scene, entities: [...l.steps[0].scene.entities, { id: 'x', kind: 'block', at: [9, 9], role: 'nope', label: 'X' }] }; }))).toContain('vocabulary');
    expect(errors(broken((l) => { l.metrics = [...l.metrics, 'nope']; }))).toContain('vocabulary');
  });

  it('指標の値が抜けている', () => {
    expect(errors(broken((l) => { l.steps[3].metrics = { frame: 5 }; }))).toContain('metrics');
  });

  it('予測問題の不備', () => {
    const p = { question: 'q', options: ['a', 'b'], answer: 5, explain: 'e' };
    expect(errors(broken((l) => { l.steps[4].predict = p; }))).toContain('predict');
    expect(errors(broken((l) => { l.steps[0].predict = { ...p, answer: 0 }; }))).toContain('predict');
  });

  it('差分の書式', () => {
    expect(errors(broken((l) => { l.steps[1].changes = ['何かが変わった']; }))).toContain('changes');
  });

  it('本文の分量は警告になる', () => {
    const long = 'とても長い段落です。'.repeat(30);
    expect(warns(broken((l) => { l.steps[1].body = [long, long]; }))).toContain('body-length');
    expect(warns(broken((l) => { l.steps[1].body = ['短い段落がひとつだけあるステップです。これは警告になります。']; }))).toContain('body-shape');
  });

  it('図が変わらないステップ・変わりすぎるステップは警告になる', () => {
    expect(warns(broken((l) => { l.steps[2] = { ...l.steps[2], scene: l.steps[1].scene } as Step; }))).toContain('scene-diff');
  });

  it('大きすぎる図を警告する', () => {
    const w = warns(broken((l) => {
      const s = l.steps[0].scene;
      l.steps[0].scene = { ...s, entities: [...s.entities, { id: 'far', kind: 'block', at: [30, 0], role: 'main', label: '遠い' }] };
    }));
    expect(w).toContain('scene-size');
  });

  it('図形の重なりを警告する', () => {
    const w = warns(broken((l) => {
      const s = l.steps[0].scene;
      l.steps[0].scene = { ...s, entities: [...s.entities, { id: 'dup', kind: 'block', at: [2.1, 0.9], role: 'main', label: '重なり' }] };
    }));
    expect(w).toContain('overlap');
  });
});

describe('contrast', () => {
  it('白と黒は 21:1', () => expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 0));
  it('同じ色は 1:1', () => expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5));
});
