// テスト専用の固定データ（src/content/lessons/event-loop.ts の写し）。
import type { Entity, Flow, Lesson, Link, Scene } from '../../src/types';

/**
 * 図のヘルパー。ステップ間で共通の配置をここにまとめ、各ステップは「何が違うか」だけを渡す。
 * こうしておくと、同じ物が同じ id・同じ位置に居続けるので、エンジンが差分だけを動かせる。
 */
interface Opts {
  mainLoad?: number;
  mainHot?: boolean;
  mainPill?: string;
  renderOff?: boolean;
  stack?: string[];
  tasks?: string[];
  micros?: string[];
  microsHot?: boolean;
  webapi?: string;
  worker?: boolean;
  out?: string[];
  loop?: boolean;
  flows?: Flow[];
}

function scene(o: Opts): Scene {
  // 配置の方針: 上段は「人 → メインスレッド → 外の世界」、下段は「待っている仕事」。
  // 仕事は下の列から、メインスレッド直下のスタックへ上がってくる。
  const e: Entity[] = [
    { id: 'user', kind: 'actor', at: [0, 0], role: 'user', label: 'ユーザー' },
    { id: 'main', kind: 'block', at: [2, 0.9], role: 'main', label: 'メイン', sub: 'スレッド', gauge: o.mainLoad ?? 0.12, gaugeLabel: o.mainPill, state: o.mainHot ? 'hot' : 'ok' },
    { id: 'render', kind: 'block', at: [4.2, -0.5], role: 'render', label: '描画', sub: '60 回 / 秒', state: o.renderOff ? 'dim' : 'ok' },
  ];
  const l: Link[] = [{ from: 'main', to: 'render', label: '描き直す', style: o.renderOff ? 'off' : 'solid' }];

  if (o.stack) {
    e.push({ id: 'stack', kind: 'queue', layout: 'stack', at: [2, 2.7], role: 'stack', label: 'スタック', items: o.stack, capacity: 2 });
    l.push({ from: 'main', to: 'stack', style: 'dashed', plain: true });
  }
  if (o.tasks) {
    e.push({ id: 'taskq', kind: 'queue', at: [0.2, 4.8], role: 'taskq', label: 'タスクキュー', sub: '先頭 →', items: o.tasks, capacity: 3 });
    l.push({ from: 'user', to: 'taskq', label: 'クリック' }, { from: 'taskq', to: 'stack', label: '空いたら 1 つ' });
  } else {
    l.push({ from: 'user', to: 'main', label: 'クリック' });
  }
  if (o.webapi) {
    e.push({ id: 'webapi', kind: 'block', at: [4.2, 2.3], role: 'webapi', label: 'Web API', pill: o.webapi });
    l.push({ from: 'main', to: 'webapi', label: '預ける' }, { from: 'webapi', to: 'taskq', via: [[2.6, 3.85]] });
  }
  if (o.micros) {
    e.push({ id: 'microq', kind: 'queue', at: [4.6, 5.0], role: 'microq', label: 'マイクロタスクキュー', sub: '優先', items: o.micros, capacity: 3, state: o.microsHot ? 'hot' : 'ok' });
    l.push({ from: 'microq', to: 'stack', label: '先に全部' });
  }
  if (o.worker) {
    e.push({ id: 'worker', kind: 'block', at: [6.3, 0.9], role: 'worker', label: 'Worker', sub: '別スレッド', gauge: 0.92, gaugeLabel: 'sortRows()' });
    l.push({ from: 'main', to: 'worker', label: 'postMessage' });
  }
  if (o.out) e.push({ id: 'out', kind: 'panel', at: [6.2, 3.4], label: '出力', lines: o.out });
  if (o.loop) {
    e.push({
      id: 'loop', kind: 'panel', at: [6.75, 3.1], label: 'イベントループの 1 周',
      rows: [['1. いまのタスク', '1 つ'], ['2. マイクロタスク', '空になるまで'], ['3. 描画', '必要なら'], ['4. 次のタスク', '1 つ']],
    });
  }
  return { entities: e, links: l, flows: o.flows };
}

const clicks = (rate = 0.8): Flow => ({ id: 'clicks', route: ['user', 'taskq', 'stack'], kind: 'click', rate, end: 'pop' });
const frames = (rate = 1.4): Flow => ({ id: 'frames', route: ['main', 'render'], kind: 'frame', rate, speed: 2.4 });

const chunked = (v: Record<string, number>): Scene => scene({
  mainLoad: Math.min(1, v.chunk / 62),
  mainHot: v.chunk > 100,
  mainPill: `${v.chunk} ms ごと`,
  renderOff: v.chunk > 100,
  stack: ['chunk()'],
  tasks: ['chunk', 'click', 'chunk'],
  webapi: '続きを予約',
  flows: [clicks(), { id: 'chunks', route: ['main', 'webapi', 'taskq', 'stack'], kind: 'task', rate: Math.min(3.2, 110 / v.chunk) }, frames(Math.max(0.3, Math.min(1.6, 70 / v.chunk)))],
});

export const eventLoop: Lesson = {
  id: 'event-loop',
  title: 'イベントループ',
  summary: 'JavaScript は一度に 1 つのことしかできない。それなのに、なぜクリックもタイマーも通信も同時にさばけるのか。',
  minutes: 12,
  level: 'beginner',
  metrics: ['frame', 'delay', 'waiting', 'total'],
  legend: ['click', 'blocked', 'task', 'micro', 'frame'],
  goals: [
    { text: 'メインスレッドが 1 本であることの意味', step: 2 },
    { text: 'タスクキューとイベントループの規則', step: 3 },
    { text: '待ち時間をブラウザに預けるしくみ', step: 4 },
    { text: 'タスクとマイクロタスクの実行順', step: 6 },
    { text: '画面を固まらせない 2 つの方法と選び方', step: 9 },
  ],
  steps: [
    {
      short: 'すぐ反応',
      chapter: 'setup',
      title: 'クリックすると、すぐ反応する',
      body: [
        'ボタンを押すと、ブラウザはその仕事を ==メインスレッド== に渡します。JavaScript を実行し、画面を描き直すのは、このスレッド 1 本だけです。',
        'いまは仕事が軽く、1 回の処理は **4 ms** で終わります。画面は 1 秒に 60 回、つまり **16.7 ms** ごとに描き直せれば滑らかに見えるので、十分に間に合っています。',
      ],
      callout: { kind: 'insight', text: '1 フレームの持ち時間は **16.7 ms**。この数字が、このレッスン全体のものさしになります。' },
      metrics: { frame: 4, delay: 8, waiting: 0, total: null },
      alt: 'ユーザーのクリックがメインスレッドに届き、メインスレッドが画面を描き直している。負荷は 12%。',
      scene: scene({ flows: [{ id: 'clicks', route: ['user', 'main'], kind: 'click', rate: 0.8, end: 'pop' }, frames()] }),
    },
    {
      short: '画面が固まる',
      chapter: 'problem',
      title: '重い処理を 1 つ入れると、画面が固まる',
      body: [
        '一覧を並べ替える `sortRows()` を追加しました。10 万行あり、終わるまで **3 秒** かかります。そのあいだ、メインスレッドはこの関数にかかりきりです。',
        'クリックしても反応がなく、スクロールも止まります。壊れたわけではありません。先に始めた仕事が終わるまで、次の仕事に手を付けられないだけです。',
      ],
      callout: { kind: 'warn', text: '問題は処理の遅さそのものより、**途中で手を離せない**ことです。JavaScript の関数は、始まったら終わるまで割り込まれません。' },
      changes: ['+ `sortRows()`（3 秒かかる）', '~ フレーム時間 4 ms → 3,000 ms', '~ クリックに応答できない'],
      metrics: { frame: 3000, delay: 3000, waiting: 3, total: 3000 },
      alt: 'メインスレッドが sortRows の実行で負荷 100% になり、描画への線が止まっている。クリックは届いても処理されない。',
      scene: scene({
        mainLoad: 1, mainHot: true, mainPill: 'sortRows()', renderOff: true,
        flows: [{ id: 'clicks', route: ['user', 'main'], kind: 'blocked', rate: 1.3, end: 'burst' }],
      }),
    },
    {
      short: '列に並ぶ',
      chapter: 'technique',
      title: '仕事は 1 列に並んで待っている',
      body: [
        '待たされたクリックは、消えたわけではありません。ブラウザは届いた仕事を ==タスクキュー== に並べ、メインスレッドの手が空くたびに先頭から 1 つ渡します。この繰り返しが ==イベントループ== です。',
        'いま実行中の関数は ==コールスタック== に積まれています。スタックが空になるまで、キューの先頭は動けません。',
      ],
      callout: { kind: 'insight', text: 'イベントループの規則は 1 つだけです。「スタックが空になったら、キューから次を 1 つ取る」。' },
      changes: ['+ コールスタック（`sortRows()` が居座っている）', '+ タスクキュー（クリック 3 件が待機）'],
      metrics: { frame: 3000, delay: 3000, waiting: 3, total: 3000 },
      alt: 'コールスタックに sortRows が積まれ、タスクキューにクリックが 3 件並んで待っている。',
      scene: scene({
        mainLoad: 1, mainHot: true, mainPill: 'sortRows()', renderOff: true,
        stack: ['sortRows()'], tasks: ['click', 'click', 'click'],
        flows: [{ id: 'clicks', route: ['user', 'taskq'], kind: 'blocked', rate: 1.1 }],
      }),
    },
    {
      short: 'ブラウザに預ける',
      chapter: 'solution',
      title: '待つだけの仕事は、ブラウザに預ける',
      body: [
        '3 秒たったら通知を出したいとします。ループで時間をつぶせば、また画面が固まります。代わりに `setTimeout` で、ブラウザに「3 秒後にこの関数を呼んで」と預けます。',
        '時間を計るのはブラウザの ==Web API== で、メインスレッドではありません。預けた瞬間に関数は終わり、スタックは空になります。3 秒後、コールバックがタスクキューの後ろに並びます。',
      ],
      callout: { kind: 'tip', text: '通信の `fetch` も、クリックの待ち受けも同じしくみです。待ち時間はすべてブラウザの側で過ぎていきます。' },
      changes: ['+ Web API（タイマー）', '- スタックに居座る処理', '~ フレーム時間 3,000 ms → 5 ms'],
      metrics: { frame: 5, delay: 12, waiting: 1, total: null },
      alt: 'メインスレッドがタイマーを Web API に預け、スタックは空になった。3 秒後にコールバックがタスクキューに並ぶ。描画は再開している。',
      scene: scene({
        mainLoad: 0.15, stack: [], tasks: ['click'], webapi: 'タイマー 3 秒',
        flows: [clicks(), { id: 'timer', route: ['main', 'webapi', 'taskq', 'stack'], kind: 'task', rate: 0.4 }, frames()],
      }),
    },
    {
      short: '0 ms の罠',
      chapter: 'problem',
      title: '0 ミリ秒後は「いますぐ」ではない',
      predict: {
        question: '`log("A"); setTimeout(() => log("B"), 0); log("C");` はどの順で出力されるでしょう？',
        options: ['A → B → C', 'A → C → B', 'B → A → C'],
        answer: 1,
        explain: 'タイマーのコールバックは、待ち時間が 0 でもいったんタスクキューに並びます。いま走っているコードが終わるまで、順番は回ってきません。',
      },
      body: [
        '`setTimeout(fn, 0)` は「いますぐ実行」ではありません。「いまの仕事が終わったら、列の後ろに並べて」という意味です。だから `C` が先に出ます。',
        'キューに先客がいれば、さらにその後ろです。指定した時間は「最短でも」であって、「ちょうど」ではありません。',
      ],
      callout: { kind: 'warn', text: 'タイマーの時間は精度の約束ではありません。メインスレッドが 200 ms ふさがっていれば、10 ms のタイマーも 200 ms 遅れます。' },
      changes: ['+ 出力の順番（A → C → B）', '~ `B` はタスクキューで待ってから実行される'],
      metrics: { frame: 5, delay: 12, waiting: 1, total: null },
      alt: 'コード 3 行のうち log("C") が先に実行され、setTimeout のコールバック B はタスクキューで待っている。出力は A、C、B の順。',
      scene: scene({
        mainLoad: 0.2, stack: ['log("C")'], tasks: ['B'], webapi: 'タイマー 0 ms',
        out: ['A', 'C', 'B'],
        flows: [{ id: 'timer', route: ['main', 'webapi', 'taskq', 'stack'], kind: 'task', rate: 0.5 }, frames()],
      }),
    },
    {
      short: '優先の列',
      chapter: 'technique',
      title: 'Promise は列に割り込む',
      predict: {
        question: '`setTimeout(() => log("B"), 0); Promise.resolve().then(() => log("C")); log("D");` の出力順は？',
        options: ['B → C → D', 'D → B → C', 'D → C → B'],
        answer: 2,
        explain: '`then` のコールバックはマイクロタスクキューに入ります。いまのタスクが終わった直後、次のタスクより先に実行されます。',
      },
      body: [
        '列は 1 本ではありません。`Promise` の `then` や `await` の続きは ==マイクロタスクキュー== に入ります。こちらは優先の列で、スタックが空になるたびに、**空になるまで全部**実行されます。',
        'タスクキューの `B` に順番が来るのは、マイクロタスクがなくなってからです。',
      ],
      callout: { kind: 'insight', text: '1 周の順番は「いまのタスク → マイクロタスクを全部 → 必要なら描画 → 次のタスクを 1 つ」。' },
      changes: ['+ マイクロタスクキュー（`C` が入る）', '~ 出力は D → C → B'],
      metrics: { frame: 5, delay: 12, waiting: 1, total: null },
      alt: 'マイクロタスクキューに C、タスクキューに B がある。メインスレッドは D を実行したあと、先にマイクロタスクの C を取り出す。',
      scene: scene({
        mainLoad: 0.2, stack: ['log("D")'], tasks: ['B'], micros: ['C'], webapi: 'タイマー 0 ms',
        out: ['D', 'C', 'B'],
        flows: [{ id: 'micro', route: ['microq', 'stack'], kind: 'micro', rate: 0.9 }, { id: 'timer', route: ['taskq', 'stack'], kind: 'task', rate: 0.35 }, frames()],
      }),
    },
    {
      short: '尽きない列',
      chapter: 'problem',
      title: 'Case: マイクロタスクが描画を止める',
      body: [
        'マイクロタスクの中で、次のマイクロタスクを登録し続けるコードがあります。列が空にならないので、イベントループは次へ進めません。',
        '描画もクリックも、マイクロタスクが尽きるのを待ち続けます。無限ループと同じ固まり方ですが、非同期の書き方に見えるぶん、原因に気づきにくくなります。',
      ],
      callout: { kind: 'warn', text: '「`await` を入れたから画面は固まらない」は誤解です。`await` の続きはマイクロタスクで、描画の機会をはさみません。' },
      changes: ['~ マイクロタスクが増え続ける', '~ フレーム時間 5 ms → 5,000 ms 以上', '~ 待ちタスク 1 → 3'],
      metrics: { frame: 5000, delay: 5000, waiting: 3, total: null },
      alt: 'マイクロタスクキューが満杯のまま減らず、メインスレッドは負荷 100%。描画への線は止まり、タスクキューにクリックがたまっている。',
      scene: scene({
        mainLoad: 1, mainHot: true, renderOff: true, stack: ['next()'], tasks: ['B', 'click', 'click'],
        micros: ['next()', 'next()', 'next()', 'next()'], microsHot: true, webapi: 'タイマー 0 ms',
        flows: [{ id: 'micro', route: ['microq', 'stack'], kind: 'micro', rate: 3.2, speed: 4 }, { id: 'clicks', route: ['user', 'taskq'], kind: 'blocked', rate: 0.9 }],
      }),
    },
    {
      short: '仕事を刻む',
      chapter: 'solution',
      title: '重い仕事を刻んで、合間に描画させる',
      body: [
        '最初の `sortRows()` に戻ります。3 秒の仕事を小さく刻み、1 かたまり終わるごとに、続きを `setTimeout` で**タスクとして**並べ直します。タスクとタスクの合間には、描画とクリックが割り込めます。',
        'つまみで 1 かたまりの長さを変えてみてください。短いほど画面は滑らかになりますが、並べ直す手間が増えて、全体が終わるまでの時間は延びます。',
      ],
      knobs: [{ id: 'chunk', label: '1 かたまりの長さ', min: 5, max: 200, step: 5, value: 50, unit: ' ms' }],
      sceneFor: chunked,
      metricsFor: (v) => ({ frame: v.chunk, delay: v.chunk + 4, total: Math.round(3000 * (1 + 4 / v.chunk)) }),
      callout: { kind: 'tip', text: '目安は 1 かたまり **50 ms 以内**。これを超える仕事は ==ロングタスク== と呼ばれ、操作の遅れとして体感されます。' },
      changes: ['+ 仕事を刻んで並べ直す', '~ フレーム時間 3,000 ms → 50 ms', '~ 全体の完了 3,000 ms → 3,240 ms'],
      metrics: { frame: 50, delay: 54, waiting: 1, total: 3240 },
      alt: '刻んだ仕事 chunk が Web API 経由でタスクキューに戻り、クリックと交互に並んでいる。メインスレッドが 1 つずつ処理し、合間に描画が行われている。',
      scene: chunked({ chunk: 50 }),
    },
    {
      short: '別スレッド',
      chapter: 'tradeoff',
      title: 'それでも重いなら、別のスレッドへ',
      body: [
        '刻んでも、計算そのものはメインスレッドの時間を使います。==Web Worker== は別のスレッドで JavaScript を動かすしくみで、重い計算を丸ごと任せられます。メインスレッドは描画と操作に専念できます。',
        '代わりに制約があります。Worker は画面（DOM）に触れません。データはメッセージで受け渡し、そのたびにコピーの手間がかかります。',
      ],
      table: [
        ['', '刻む', 'Worker に渡す'],
        ['画面の滑らかさ', 'かたまりの長さ次第', '影響なし'],
        ['DOM の操作', 'できる', 'できない'],
        ['データの受け渡し', '不要', 'コピーが必要'],
        ['向いている仕事', '画面を少しずつ更新', '純粋な計算'],
      ],
      callout: { kind: 'insight', text: '選ぶ基準は「その仕事は画面に触るか」。触るなら刻む、触らないなら渡す。' },
      changes: ['+ Web Worker（別スレッド）', '- 刻んだタスクと、その予約', '~ フレーム時間 50 ms → 4 ms'],
      metrics: { frame: 4, delay: 8, waiting: 0, total: 3100 },
      alt: 'Worker が別スレッドで sortRows を計算している。メインスレッドの負荷は 10% で、描画とクリックに応答している。',
      scene: scene({
        mainLoad: 0.1, stack: [], tasks: ['click'], worker: true,
        flows: [clicks(), { id: 'msg', route: ['main', 'worker'], kind: 'task', rate: 0.5, bounce: 'task' }, frames()],
      }),
    },
    {
      short: 'まとめ',
      chapter: 'recap',
      title: '1 本のスレッドを、空けておく',
      body: [
        'メインスレッドは 1 本で、仕事は 1 つずつしか進みません。それでも多くのことを同時にさばけるのは、待ち時間をブラウザに預け、仕事を列に並べて順に片づけているからです。',
        '画面が固まる原因は、いつも 2 つのどちらかです。**1 つの仕事が長すぎる**か、**マイクロタスクが尽きない**か。',
      ],
      takeaways: [
        'JavaScript の実行と描画は**メインスレッド 1 本**で行われ、関数は終わるまで割り込まれない',
        '**イベントループ**は、スタックが空になるたびにキューから次の仕事を 1 つ取り出す',
        '待ち時間は **Web API** の側で過ぎる。`setTimeout(fn, 0)` は「列の後ろに並べる」という意味',
        '**マイクロタスク**はタスクより先に、空になるまで実行される。尽きなければ描画も止まる',
        '長い仕事は **50 ms 以内に刻む**か、画面に触らないなら **Worker に渡す**',
      ],
      callout: { kind: 'tip', text: '身近なページで確かめてみましょう。開発者ツールの Performance でページの操作を記録すると、ロングタスクに印が付きます。' },
      metrics: { frame: 4, delay: 8, waiting: 0, total: 3100 },
      alt: 'ユーザー、メインスレッド、描画、Web API、Worker、2 本のキューがそろった全体図。イベントループの 1 周の順番が表にまとまっている。',
      scene: scene({
        mainLoad: 0.12, stack: [], tasks: ['click'], micros: [], webapi: 'タイマー・通信', worker: true, loop: true,
        flows: [clicks(), { id: 'timer', route: ['main', 'webapi', 'taskq'], kind: 'task', rate: 0.35 }, { id: 'msg', route: ['main', 'worker'], kind: 'task', rate: 0.4, bounce: 'task' }, frames()],
      }),
    },
  ],
};
