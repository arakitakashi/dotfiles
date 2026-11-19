import type { Course, Lesson } from '../types';

export interface Progress {
  /** レッスン id → 到達した最大のステップ添字（0 始まり） */
  reached: Record<string, number>;
  /** `${lessonId}:${stepIndex}` → 最初に選んだ選択肢 */
  answers: Record<string, number>;
  last: { lesson: string; step: number } | null;
}

export const emptyProgress = (): Progress => ({ reached: {}, answers: {}, last: null });

export function markStep(p: Progress, lesson: Lesson, step: number): Progress {
  return {
    ...p,
    reached: { ...p.reached, [lesson.id]: Math.max(p.reached[lesson.id] ?? 0, step) },
    last: { lesson: lesson.id, step },
  };
}

/** 予測は最初の回答だけを記録する（答えを見てからの選び直しで正答率を上げさせない）。 */
export function recordAnswer(p: Progress, lessonId: string, step: number, choice: number): Progress {
  const key = `${lessonId}:${step}`;
  return key in p.answers ? p : { ...p, answers: { ...p.answers, [key]: choice } };
}

/** 完了 = 最後まで到達し、かつ途中の予測問題にすべて答えた。読み飛ばしを完了にしない。 */
export function isLessonDone(p: Progress, lesson: Lesson): boolean {
  if ((p.reached[lesson.id] ?? -1) < lesson.steps.length - 1) return false;
  return lesson.steps.every((s, i) => !s.predict || `${lesson.id}:${i}` in p.answers);
}

export function courseStats(p: Progress, course: Course): { lessons: number; done: number; predicts: number; correct: number } {
  let lessons = 0, done = 0, predicts = 0, correct = 0;
  for (const m of course.modules) for (const l of m.lessons) {
    lessons++;
    if (isLessonDone(p, l)) done++;
    l.steps.forEach((s, i) => {
      const a = p.answers[`${l.id}:${i}`];
      if (s.predict && a != null) { predicts++; if (a === s.predict.answer) correct++; }
    });
  }
  return { lessons, done, predicts, correct };
}

/** localStorage は使えない環境（プライベートウィンドウ等）があるので、失敗しても動くようにする。 */
export function loadProgress(key: string): Progress {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...emptyProgress(), ...JSON.parse(raw) };
  } catch { /* 保存なしで続行 */ }
  return emptyProgress();
}

export function saveProgress(key: string, p: Progress): void {
  try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* 保存なしで続行 */ }
}
