import type { Chapter, Level } from '../types';

const ja = {
  skip: '本文へ移動',
  learn: '学ぶ', cheatsheet: 'チートシート', glossary: '用語集',
  course: 'コース', lessons: 'レッスン', lesson: 'レッスン', step: 'ステップ', steps: 'ステップ', min: '分',
  searchPlaceholder: 'レッスンと用語を検索…', searchLabel: '検索', searchEmpty: 'に一致するものはありません', searchTry: '単語ひとつで試すか、次のどれかを:',
  navMove: '移動', navOpen: '開く', navClose: '閉じる',
  back: '戻る', next: '次へ', nextLesson: '次のレッスン', finish: 'コース完了',
  replay: '再生', pause: '一時停止', resume: '再開', fit: '全体表示', zoomIn: '拡大', zoomOut: '縮小',
  inThisLesson: 'このレッスン', youllLearn: '学べること', changed: '変わったこと',
  progress: '進捗', predictScore: '予測の正答',
  insight: 'ポイント', tip: '知っておくと便利', warn: '注意', nextUp: '次は',
  predict: '予測してみよう', predictHint: '選ぶと図が動いて答えがわかります', correct: '正解', incorrect: '惜しい', yourAnswer: 'あなたの答え',
  knobs: '動かしてみよう',
  themeDark: 'ダークテーマに切り替え', themeLight: 'ライトテーマに切り替え', menu: 'メニュー',
  hintStep: 'ステップ', hintReplay: '再生', hintPause: '一時停止',
  takeaways: '要点', seeLesson: 'レッスンを開く', appearsIn: '登場するステップ',
  cheatsheetLead: '各レッスンの要点を 1 か所に集めました。復習や、思い出したいときの入口に使ってください。',
  glossaryLead: '本文で蛍光ペンの付いた用語の一覧です。',
  answerFirst: '先に予測を選んでください',
  done: '完了',
} as const;

const en: Record<keyof typeof ja, string> = {
  skip: 'Skip to content',
  learn: 'Learn', cheatsheet: 'Cheatsheet', glossary: 'Glossary',
  course: 'Course', lessons: 'lessons', lesson: 'Lesson', step: 'Step', steps: 'steps', min: 'min',
  searchPlaceholder: 'Search lessons and terms…', searchLabel: 'Search', searchEmpty: 'has no matches', searchTry: 'Try a single word, or one of these:',
  navMove: 'move', navOpen: 'open', navClose: 'close',
  back: 'Back', next: 'Next', nextLesson: 'Next lesson', finish: 'Course complete',
  replay: 'Replay', pause: 'Pause', resume: 'Resume', fit: 'Fit', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
  inThisLesson: 'In this lesson', youllLearn: 'You’ll learn', changed: 'What changed',
  progress: 'Progress', predictScore: 'Predictions right',
  insight: 'Key point', tip: 'Good to know', warn: 'Watch out', nextUp: 'Up next',
  predict: 'Predict first', predictHint: 'Pick one — the diagram will play out the answer', correct: 'Correct', incorrect: 'Not quite', yourAnswer: 'Your answer',
  knobs: 'Try it',
  themeDark: 'Switch to dark theme', themeLight: 'Switch to light theme', menu: 'Menu',
  hintStep: 'step', hintReplay: 'replay', hintPause: 'pause',
  takeaways: 'Takeaways', seeLesson: 'Open lesson', appearsIn: 'Appears in',
  cheatsheetLead: 'The takeaways of every lesson in one place, for review.',
  glossaryLead: 'Every highlighted term in the course.',
  answerFirst: 'Pick a prediction first',
  done: 'Done',
};

export type Strings = Record<keyof typeof ja, string>;
export const strings = (lang: string): Strings => (lang.startsWith('ja') ? ja : en);

const chapters: Record<string, Record<Chapter, string>> = {
  ja: { setup: '準備', problem: '問題', solution: '解決', technique: 'しくみ', tradeoff: 'トレードオフ', insight: '洞察', recap: 'まとめ' },
  en: { setup: 'Setup', problem: 'Problem', solution: 'Solution', technique: 'Technique', tradeoff: 'Trade-off', insight: 'Insight', recap: 'Recap' },
};
const levels: Record<string, Record<Level, string>> = {
  ja: { beginner: '初級', intermediate: '中級', advanced: '上級' },
  en: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
};
export const chapterLabel = (lang: string, c: Chapter): string => (chapters[lang.startsWith('ja') ? 'ja' : 'en'])[c];
export const levelLabel = (lang: string, l: Level): string => (levels[lang.startsWith('ja') ? 'ja' : 'en'])[l];
