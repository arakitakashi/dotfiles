# 内容のスキーマと雛形の構成

型定義の正本は `src/types.ts`（コメントつき）。ここは全体像と、書くときに迷いやすい点の早見表。

## 雛形の構成

```
index.html
src/
  main.ts                 起動
  types.ts                内容の型（正本）
  tones.ts                指標の閾値の部品（below / above / exactly / within / plain）
  validate.ts             内容の検証規則
  content/
    course.ts             コース定義: 役割・粒子・指標・用語集・モジュール  ← 書き換える
    lessons/<id>.ts       レッスン 1 本 = 1 ファイル                      ← 書き足す
  engine/                 図のエンジン（原則さわらない）
    stage.ts              シーンの切り替え、カメラ、粒子
    entities.ts           エンティティの描画
    diff.ts tween.ts flows.ts project.ts icons.ts
  ui/                     画面（原則さわらない）
    app.ts                骨組み、ルーティング、解説カード、キーボード
    palette.ts pages.ts   検索、チートシート・用語集
    progress.ts search.ts richtext.ts i18n.ts
  styles/
    tokens.css            書体・寸法・モーション
    themes.css            配色（テーマ 3 種 × ライト・ダーク、役割色）
    app.css stage.css     部品のスタイル
    fonts.css             Web フォントの定義（遅延読み込み）
scripts/
  validate-content.mjs    内容と配色の検証
  capture-steps.mjs       全ステップの撮影
  smoke.mjs               実ブラウザでの通し確認
tests/                    エンジン・画面ロジック・検証規則の単体テスト
```

書き換えるのは `content/` と、必要に応じて `styles/themes.css`・`engine/icons.ts`・`ui/i18n.ts`。
エンジンと画面は、題材に合わない点があったときだけ、理由を持って変える。

## URL

| URL | 表示 |
|---|---|
| `#/<lesson-id>/<step>` | レッスンのステップ（step は 1 始まり）。すべてのステップが共有できる URL を持つ |
| `#/` | 前回の続き。初回は最初のレッスン。入口のページは挟まない |
| `#/~cheatsheet` | チートシート（recap の要点から自動生成） |
| `#/~glossary/<用語>` | 用語集（`Course.glossary` と本文の `==用語==` から自動生成） |

## Course

```ts
export const course: Course = {
  id: 'js-runtime',              // 進捗の保存キーになる。公開後は変えない
  title: 'JavaScript の{実行モデル}', // {} の中に蛍光ペンが付く
  tagline: '…',
  lang: 'ja',
  theme: 'paper',                // 'paper' | 'slate' | 'studio'
  projection: 'iso',             // 'iso' | 'flat'
  roles: { main: { hue: 'blue', icon: 'cpu', name: 'メインスレッド' }, … },
  flowKinds: { task: { label: 'タスク', hue: 'amber', shape: 'square' }, … },
  metrics: { frame: { label: 'フレーム時間', icon: 'window', unit: 'ms', tone: below(16.7, 50) }, … },
  glossary: { イベントループ: '定義を 1〜2 文で。', … },
  modules: [{ id: 'runtime', title: '実行のしくみ', hue: 'blue', lessons: [eventLoop] }],
};
```

- `metrics[].tone` は値を受け取って `'good' | 'warn' | 'bad' | 'neutral'` を返す関数。`src/tones.ts` の部品を使う: `below(良の上限, 注意の上限)`、`above(良の下限, 注意の下限)`、`exactly(目標, 許容)`、`within(下限, 上限)`、`plain`（色を付けない）
- 粒子の `shape` は `dot` / `square` / `diamond` / `ring`。色だけでなく形でも区別できるようにする（色覚の違いへの配慮）
- アイコン名は `src/engine/icons.ts` にあるもの。足りなければ同じ書式（24×24、線画）で足す

## Lesson

```ts
export const eventLoop: Lesson = {
  id: 'event-loop',     // URL になる。英数字とハイフン
  title: 'イベントループ',
  summary: '問い・逆説・対比の 1 文。',
  minutes: 12,
  level: 'beginner',    // 'beginner' | 'intermediate' | 'advanced'
  metrics: ['frame', 'delay', 'waiting'],   // HUD に出す 3〜5 個
  legend: ['click', 'task', 'frame'],       // 凡例の並び順（流れている種類だけが表示される）
  goals: [{ text: 'タスクキューとイベントループの規則', step: 3 }, …],
  steps: [ … ],
};
```

## Step

```ts
{
  short: '列に並ぶ',            // タイムラインの名前
  chapter: 'technique',         // setup | problem | solution | technique | tradeoff | insight | recap
  title: '仕事は 1 列に並んで待っている',
  body: ['第 1 段落（何が起きたか）', '第 2 段落（なぜ・だから何か）'],
  callout: { kind: 'insight', text: '…' },   // insight | tip | warn | next
  changes: ['+ タスクキュー', '~ 応答 8 ms → 3,000 ms'],
  metrics: { frame: 3000, delay: 3000, waiting: 3 },   // Lesson.metrics の全キー。未計測は null
  alt: '図が見えない読者への説明。',
  scene: { entities: [...], links: [...], flows: [...] },

  // 任意
  predict: { question: '…', options: ['A', 'B', 'C'], answer: 1, explain: '…' },
  knobs: [{ id: 'chunk', label: '1 かたまりの長さ', min: 5, max: 200, step: 5, value: 50, unit: ' ms' }],
  sceneFor: (v) => scene({ … v.chunk … }),
  metricsFor: (v) => ({ frame: v.chunk }),
  takeaways: ['recap 用の要点。4〜5 個'],
  table: [['', '案 A', '案 B'], ['観点', '…', '…']],   // 1 行目が見出し。2・3 列目に色が付く
}
```

- `knobs` を使うときも `scene` と `metrics` は必要（初期値での状態。検証と撮影に使われる）
- `predict` は最初のステップには置けない

## Scene

```ts
{
  entities: [
    { id: 'main', kind: 'block', at: [2, 1], role: 'main', label: 'メイン', sub: 'スレッド', gauge: 0.12 },
    { id: 'db', kind: 'store', at: [4, 2], role: 'db', label: '注文 DB' },
    { id: 'user', kind: 'actor', at: [0, 0], role: 'user', label: '利用者', count: '1,000 人' },
    { id: 'az', kind: 'zone', at: [1.5, -1], size: [6, 4], role: 'zone', label: '東京' },
    { id: 'q', kind: 'queue', at: [3, 4], role: 'queue', label: '待ち行列', items: ['a', 'b'], capacity: 4 },
    { id: 'p', kind: 'panel', at: [6, 3], role: 'ledger', label: '内訳', head: ['項目', '時間'], rows: [['DNS', '20 ms'], ['遅い問い合わせ', '900 ms', 'bad'], ['合計', '920 ms']], total: true },
  ],
  links: [{ from: 'user', to: 'main', label: 'クリック' }, { from: 'main', to: 'db', style: 'dashed', via: [[3, 3]] }],
  flows: [{ id: 'req', route: ['user', 'lb', ['s1', 's2'], 'db'], kind: 'req', rate: 1.2, pick: 'rr', bounce: 'res' }],
  camera: { focus: ['main', 'db'] },   // 省略時は全体が収まるように合わせる
}
```

- 粒子は、`route` の隣り合う 2 つの間にリンクがあればその線に沿って流れ、なければ直線で飛ぶ
- `flows[].id` はレッスン内で意味の同じ流れに同じ id を付ける
- 種類ごとの項目と描かれ方は `scene-design.md`、全項目は `src/types.ts`

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run validate` | 内容と配色の検証（`--strict` で警告も失敗にする） |
| `npm test` | 単体テスト |
| `npm run capture -- <オプション>` | 全ステップの撮影（`captures/` に保存） |
| `npm run smoke` | 実ブラウザでの通し確認 |
| `npm run check` | 検証 → テスト → ビルド → 通し確認 |
| `npm run build` | `dist/` に静的サイトを出力。任意の静的ホスティングに置ける |

## 画面の文言・言語

- 画面の文言は `src/ui/i18n.ts`。日本語と英語がある。他の言語は同じ形で足し、`strings()` の分岐に加える
- `Course.lang` で切り替わる。本文の分量の検査も、言語に応じて文字数か語数かを切り替える
- 右から左へ書く言語（`ar` `he` `fa` `ur`）では、`<html dir="rtl">` が自動で付き、← → キーの向きも反転する

## テストと内容の関係

- 単体テスト（`npm test`）は `tests/fixtures/` の固定データに対して回る。`src/content/` を書き換えてもテストは影響を受けない
- 自分の内容を検査するのは `npm run validate`（型と分量）、`npm run capture`（見た目）、`npm run smoke`（操作）
