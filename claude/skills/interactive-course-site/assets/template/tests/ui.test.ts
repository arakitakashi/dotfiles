import { describe, expect, it } from 'vitest';
import { plain, rich, termsIn } from '../src/ui/richtext';
import { emptyProgress, isLessonDone, markStep, recordAnswer, courseStats } from '../src/ui/progress';
import { buildIndex, search } from '../src/ui/search';
import type { Course, Lesson } from '../src/types';

describe('richtext', () => {
  it('HTML を無害化する', () => {
    expect(rich('<img src=x onerror=1> & "q"')).toBe('&lt;img src=x onerror=1&gt; &amp; &quot;q&quot;');
  });
  it('太字・コード・強調を変換する', () => {
    expect(rich('**重要** な `setTimeout` と *強調*')).toBe('<b>重要</b> な <code>setTimeout</code> と <em>強調</em>');
  });
  it('用語は用語集へのリンクになる', () => {
    expect(rich('==タスクキュー== に並ぶ')).toBe('<a class="term" href="#/~glossary/%E3%82%BF%E3%82%B9%E3%82%AF%E3%82%AD%E3%83%A5%E3%83%BC">タスクキュー</a> に並ぶ');
  });
  it('レッスンへのリンクを変換する', () => {
    expect(rich('[[event-loop#3|前のステップ]]')).toBe('<a class="xref" href="#/event-loop/3">前のステップ</a>');
    expect(rich('[[event-loop|イベントループ]]')).toBe('<a class="xref" href="#/event-loop/1">イベントループ</a>');
  });
  it('コードの中は変換しない', () => {
    expect(rich('`a ** b ** c`')).toBe('<code>a ** b ** c</code>');
  });
  it('plain は記法を取り除く', () => {
    expect(plain('**重要** な ==用語== と [[x#2|リンク]] と `code`')).toBe('重要 な 用語 と リンク と code');
  });
  it('termsIn は用語を列挙する', () => {
    expect(termsIn('==A== と ==B== と ==A==')).toEqual(['A', 'B']);
  });
});

const lesson = (id: string, n: number, predictAt: number[] = []): Lesson => ({
  id, title: id, summary: '', minutes: 5, level: 'beginner', metrics: [], legend: [], goals: [],
  steps: Array.from({ length: n }, (_, i) => ({
    short: `s${i}`, chapter: 'technique' as const, title: `${id} step ${i + 1}`, body: ['本文 ==用語==', 'b'],
    metrics: {}, scene: { entities: [] }, alt: '',
    ...(predictAt.includes(i) ? { predict: { question: 'q', options: ['a', 'b'], answer: 1, explain: 'e' } } : {}),
  })),
});

describe('progress', () => {
  it('最終ステップに着くまでは完了しない', () => {
    const l = lesson('a', 3);
    let p = emptyProgress();
    p = markStep(p, l, 1);
    expect(isLessonDone(p, l)).toBe(false);
    p = markStep(p, l, 2);
    expect(isLessonDone(p, l)).toBe(true);
  });
  it('予測問題に答えていなければ完了しない', () => {
    const l = lesson('a', 3, [1]);
    let p = markStep(markStep(emptyProgress(), l, 1), l, 2);
    expect(isLessonDone(p, l)).toBe(false);
    p = recordAnswer(p, l.id, 1, 0);
    expect(isLessonDone(p, l)).toBe(true);
  });
  it('最初の回答を記録し、あとから上書きしない', () => {
    let p = recordAnswer(emptyProgress(), 'a', 1, 0);
    p = recordAnswer(p, 'a', 1, 1);
    expect(p.answers['a:1']).toBe(0);
  });
  it('到達ステップは戻っても減らない', () => {
    const l = lesson('a', 5);
    let p = markStep(emptyProgress(), l, 3);
    p = markStep(p, l, 1);
    expect(p.reached.a).toBe(3);
    expect(p.last).toEqual({ lesson: 'a', step: 1 });
  });
  it('コース全体の集計', () => {
    const a = lesson('a', 2, [1]), b = lesson('b', 2);
    const course = { modules: [{ id: 'm', title: 'M', hue: 'blue', lessons: [a, b] }] } as unknown as Course;
    let p = markStep(emptyProgress(), a, 1);
    p = recordAnswer(p, 'a', 1, 1);
    const s = courseStats(p, course);
    expect(s).toMatchObject({ lessons: 2, done: 1, predicts: 1, correct: 1 });
  });
});

describe('search', () => {
  const course = {
    modules: [{ id: 'm', title: '基礎', hue: 'blue', lessons: [lesson('event-loop', 3), lesson('rendering', 2)] }],
    glossary: { 用語: '説明に使う言葉。', マイクロタスク: 'Promise の後続処理。' },
  } as unknown as Course;
  const idx = buildIndex(course);

  it('レッスン名はステップより上に来る', () => {
    const r = search(idx, 'event-loop');
    expect(r[0]).toMatchObject({ type: 'lesson', lesson: 'event-loop' });
    expect(r.some((x) => x.type === 'step')).toBe(true);
  });
  it('用語集を検索できる', () => {
    const r = search(idx, 'マイクロ');
    expect(r[0]).toMatchObject({ type: 'term', title: 'マイクロタスク' });
  });
  it('複数語はすべて含むものだけ', () => {
    expect(search(idx, 'rendering step 2').every((x) => x.lesson === 'rendering')).toBe(true);
    expect(search(idx, 'rendering zzz')).toEqual([]);
  });
  it('空の問い合わせは空を返す', () => expect(search(idx, '  ')).toEqual([]));
});
