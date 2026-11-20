// テスト専用の固定データ。src/content/ を自分の題材に書き換えても、テストはこのコースに対して回り続ける。
import type { Course } from '../../src/types';
import { below } from '../../src/tones';
import { eventLoop } from './event-loop';

/**
 * コース定義。題材の「記号体系」（役割の色・アイコン、粒子の種類、指標）をここで固定する。
 * レッスンは役割名で参照するだけなので、図の見た目がレッスン間でぶれない。
 */
export const course: Course = {
  id: 'js-runtime',
  title: 'JavaScript の{実行モデル}',
  tagline: '1 本のスレッドが、なぜ同時にたくさんのことをさばけるのか。',
  lang: 'ja',
  theme: 'paper',
  projection: 'iso',

  roles: {
    user: { hue: 'sand', icon: 'cursor', name: 'ユーザー' },
    main: { hue: 'blue', icon: 'cpu', name: 'メインスレッド' },
    render: { hue: 'rose', icon: 'window', name: '描画' },
    webapi: { hue: 'green', icon: 'timer', name: 'Web API' },
    worker: { hue: 'slate', icon: 'cpu', name: 'Worker' },
    stack: { hue: 'violet', icon: 'layers', name: 'コールスタック' },
    taskq: { hue: 'amber', icon: 'queue', name: 'タスクキュー' },
    microq: { hue: 'teal', icon: 'zap', name: 'マイクロタスクキュー' },
  },

  flowKinds: {
    click: { label: 'ユーザーの操作', hue: 'sand', shape: 'dot' },
    blocked: { label: '待たされた操作', hue: 'red', shape: 'dot' },
    task: { label: 'タスク', hue: 'amber', shape: 'square' },
    micro: { label: 'マイクロタスク', hue: 'teal', shape: 'diamond' },
    frame: { label: '描画', hue: 'rose', shape: 'ring' },
  },

  metrics: {
    frame: { label: 'フレーム時間', icon: 'window', unit: 'ms', tone: below(16.7, 50) },
    delay: { label: '操作への応答', icon: 'cursor', unit: 'ms', tone: below(100, 300) },
    waiting: { label: '待ちタスク', icon: 'queue', tone: below(1, 2) },
    total: { label: '全体の完了', icon: 'clock', unit: 'ms', tone: below(3200, 4000) },
  },

  glossary: {
    メインスレッド: 'ページの JavaScript の実行と画面の描画を受け持つ、1 本きりの実行の流れ。ここがふさがると、操作にも描画にも応じられなくなる。',
    タスクキュー: 'クリックやタイマーのコールバックなど、実行を待つ仕事が並ぶ列。イベントループが先頭から 1 つずつ取り出す。',
    イベントループ: 'コールスタックが空になるたびに、キューから次の仕事を取り出して実行する繰り返しのしくみ。',
    コールスタック: 'いま実行中の関数と、その呼び出し元が積まれる場所。空になるまで次のタスクは始まらない。',
    'Web API': 'タイマー・通信・イベントの待ち受けなど、ブラウザが JavaScript の外で提供する機能。待ち時間はメインスレッドを使わずに過ぎる。',
    マイクロタスクキュー: 'Promise の then や await の続きが入る優先の列。タスクが 1 つ終わるたびに、空になるまですべて実行される。',
    ロングタスク: 'メインスレッドを 50 ms を超えて占有する仕事。操作の遅れとして体感される目安になっている。',
    'Web Worker': 'メインスレッドとは別のスレッドで JavaScript を動かすしくみ。DOM には触れず、メッセージでデータを受け渡す。',
  },

  modules: [
    { id: 'runtime', title: '実行のしくみ', hue: 'blue', lessons: [eventLoop] },
  ],
};
