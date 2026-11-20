/**
 * コンテンツの型定義。レッスンは「データ」であり、画面やアニメーションのコードを含まない。
 * 各ステップは図の「完全な状態」(Scene) を宣言し、エンジンが前ステップとの差分を補間する。
 */

/** ステップの物語上の役割。タイムラインの点とバッジの色になる。 */
export type Chapter =
  | 'setup' // 壊れる前の平穏な状態を見せる
  | 'problem' // 症状・破綻を見せる
  | 'solution' // 問題を直す構造の変更
  | 'technique' // 仕組みを 1 つ足す・詳しく見る
  | 'tradeoff' // 選択肢の比較と代償
  | 'insight' // 一般化・名前を与える
  | 'recap'; // まとめ

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Tone = 'good' | 'warn' | 'bad' | 'neutral';
/** 役割色。意味は Course.roles で題材ごとに割り当てる。 */
export type Hue = 'sand' | 'green' | 'blue' | 'violet' | 'amber' | 'red' | 'teal' | 'rose' | 'slate';

export interface Course {
  id: string;
  /** サイト名。2 語目以降を蛍光ペンで強調したいときは `{}` で囲む。例: 'Event {Loop}' */
  title: string;
  tagline: string;
  lang: string;
  /** styles/themes.css のプリセット名 */
  theme: 'paper' | 'slate' | 'studio';
  /** 図の投影法。iso = 等角のジオラマ、flat = 平面の構成図 */
  projection: 'iso' | 'flat';
  modules: Module[];
  /** 指標の定義。レッスンはキーで参照する */
  metrics: Record<string, MetricDef>;
  /** エンティティの役割 → 色とアイコン。図の記号体系をコース全体で固定する */
  roles: Record<string, RoleDef>;
  /** 図を流れる粒子の種類。凡例に出る */
  flowKinds: Record<string, FlowKindDef>;
  /** 用語集。本文の ==用語== はここに定義が必要（検証スクリプトが確認する） */
  glossary: Record<string, string>;
  /** 題材固有の図形。Entity.kind = 'custom' から名前で参照する */
  renderers?: Record<string, CustomRenderer>;
}

export interface Module {
  id: string;
  title: string;
  hue: Hue;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  /** 1 文のフック。定義ではなく、問い・逆説・対比で書く */
  summary: string;
  minutes: number;
  level: Level;
  /** HUD に常時出す指標のキー（3〜5 個） */
  metrics: string[];
  /** 凡例に出す粒子の種類 */
  legend: string[];
  /** 学習目標。step（1 始まり）に到達するとチェックが点く */
  goals: Goal[];
  steps: Step[];
}

export interface Goal {
  text: string;
  step: number;
}

export interface Step {
  /** タイムライン用の短いラベル（全角 9 字 / 英 3 語まで） */
  short: string;
  chapter: Chapter;
  /** 見出し。名詞の定義ではなく、状況・問い・命令で書く */
  title: string;
  /** 本文。原則 2 段落（何が起きたか / なぜ・だから何か）。記法は ui/richtext.ts を参照 */
  body: string[];
  callout?: Callout;
  /** 前ステップからの差分。'+ 追加' / '~ 変更' / '- 削除' の形で書く */
  changes?: string[];
  /** このステップ時点の指標値。null は未計測（「—」表示） */
  metrics: Record<string, number | string | null>;
  scene: Scene;
  /** 図の代替テキスト。図が見えない読者にこのステップの状態を 1〜2 文で伝える */
  alt: string;
  /**
   * 予測問題。「結果を見せるステップ」に置く。答えを選ぶまで、図は 1 つ前の状態で止まり、本文も隠れ、
   * 「次へ」と → キーでは先へ進めない（タイムラインや URL で別のステップへ飛ぶことはできる）。
   */
  predict?: Predict;
  /** 読者が動かせるパラメータ。指定時は sceneFor / metricsFor で値に応じた状態を返す */
  knobs?: Knob[];
  sceneFor?: (values: Record<string, number>) => Scene;
  metricsFor?: (values: Record<string, number>) => Record<string, number | string | null>;
  /** recap 用の要点（4〜5 個）。チートシートに自動で載る */
  takeaways?: string[];
  /** 比較表・決定表。1 行目が見出し */
  table?: string[][];
}

export interface Callout {
  /** insight = 1 文の教訓 / tip = 実在の製品・補足 / warn = 誤解と落とし穴 / next = 次レッスンへの問い */
  kind: 'insight' | 'tip' | 'warn' | 'next';
  text: string;
}

export interface Predict {
  question: string;
  options: string[];
  /** 正解の添字（0 始まり） */
  answer: number;
  /** 答え合わせの 1〜2 文。正誤どちらでも読んで意味が通るように書く */
  explain: string;
}

export interface Knob {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  /**
   * 値の見せ方（省略時は「値 + unit」）。段階の名前を出したいとき（1 → '弱'）や、
   * 桁をまたぐ量を対数で動かしたいとき（つまみは指数にして、ここと sceneFor で 10 ** v に直す）に使う。
   */
  format?: (value: number) => string;
}

export interface MetricDef {
  label: string;
  icon?: string;
  unit?: string;
  /** 桁区切りや小数の整形が要るとき */
  format?: (v: number) => string;
  /** 値 → 状態色。閾値は必須（数値に良し悪しの手触りを与えるため） */
  tone: (v: number) => Tone;
}

export interface RoleDef {
  hue: Hue;
  icon?: string;
  /** 凡例や検索に出す呼び名 */
  name?: string;
}

export interface FlowKindDef {
  label: string;
  hue: Hue;
  shape: 'dot' | 'square' | 'ring' | 'diamond';
}

/* ───────── シーン ───────── */

export interface Scene {
  entities: Entity[];
  links?: Link[];
  flows?: Flow[];
  /** 省略時は全体が収まるように自動で合わせる */
  camera?: { focus?: string[]; pad?: number };
}

export type EntityState = 'ok' | 'hot' | 'down' | 'dim' | 'ghost' | 'focus';

interface EntityBase {
  /** ステップをまたいで同じ id なら同じ物として補間される */
  id: string;
  /**
   * グリッド座標 [列, 行]。右が列+、下が行+。0.5 刻みで置ける。
   * iso では列と行を同じだけ動かした位置（[0,0] → [2,2] や [2,-2]）に置くと、線が床の目に沿って見える。
   */
  at: [number, number];
  role?: string;
  label?: string;
  sub?: string;
  state?: EntityState;
}

export interface BlockEntity extends EntityBase {
  kind: 'block' | 'store';
  /** 0〜1。上に小さなメーターを出す */
  gauge?: number;
  gaugeLabel?: string;
  /** 横に出すピル型ラベル */
  pill?: string;
  /** 小さな状態タグ（'DOWN' など） */
  tag?: string;
  size?: number;
}

export interface ActorEntity extends EntityBase {
  kind: 'actor';
  /** 群衆として見せる人数ラベル（'1,000 人' など） */
  count?: string;
  pill?: string;
}

export interface ZoneEntity extends EntityBase {
  kind: 'zone';
  /**
   * 領域の大きさ。flat では [列数, 行数] の矩形で at は左上。
   * iso では床の目に沿った平行四辺形で、[右下方向の長さ, 左下方向の長さ]（単位は半マス）、at は奥の角。
   */
  size: [number, number];
}

export interface QueueEntity extends EntityBase {
  kind: 'queue';
  /** 並んでいる要素。文字列がそのままラベルになる */
  items: string[];
  capacity?: number;
  /** stack = 縦に積む（コールスタックなど）。既定は横に並べる */
  layout?: 'row' | 'stack';
  /** 要素の色。items と同じ添字。省略時は role の色 */
  itemHues?: Hue[];
}

export interface PanelEntity extends EntityBase {
  kind: 'panel';
  /**
   * [左, 右, 状態色?] の行。状態色は行全体（左右とも）に付く。最後の行を合計として強調するなら total: true。
   * role を付けると、見出しの帯がその役割の色になる。
   */
  rows?: [string, string, Tone?][];
  /** rows の列見出し [左, 右]（「借方 / 貸方」「項目 / 時間」など）。データ行と区別して描かれる */
  head?: [string, string];
  /** 等幅で見せる行（コード・式） */
  lines?: string[];
  /** 0〜1 の棒 */
  bars?: [string, number, Tone?][];
  total?: boolean;
  /** 強調する lines の添字 */
  mark?: number[];
}

export interface NoteEntity extends EntityBase {
  kind: 'note';
  tone?: Tone;
}

export interface CustomEntity extends EntityBase {
  kind: 'custom';
  renderer: string;
  props?: Record<string, unknown>;
}

export type Entity =
  | BlockEntity
  | ActorEntity
  | ZoneEntity
  | QueueEntity
  | PanelEntity
  | NoteEntity
  | CustomEntity;

export interface Link {
  from: string;
  to: string;
  /** solid = 通常 / dashed = 非同期・任意 / off = 今は使われない / beat = 定期的な確認 / cut = 切断 */
  style?: 'solid' | 'dashed' | 'off' | 'beat' | 'cut';
  label?: string;
  /** 途中で通るグリッド座標（折れ線にしたいとき） */
  via?: [number, number][];
  /** 矢印なしの関連 */
  plain?: boolean;
}

export interface Flow {
  id: string;
  /**
   * 通過するエンティティ id の列。配列を入れるとそこで分岐する。
   * 例: ['users', 'lb', ['s1', 's2', 's3'], 'db']
   */
  route: (string | string[])[];
  kind: string;
  /** 1 秒あたりの粒子数 */
  rate: number;
  /** 分岐の選び方。rr = 順番 / 数値配列 = 重み */
  pick?: 'rr' | number[];
  /** kind を順に切り替えるパターン（'req','req','heavy' など） */
  pattern?: string[];
  /** 終点で折り返す。値は戻りの kind */
  bounce?: string;
  /** 終点での演出 */
  end?: 'pop' | 'burst' | 'none';
  /** グリッド単位 / 秒。既定 3 */
  speed?: number;
}

/* ───────── カスタム描画 ───────── */

export interface RenderCtx {
  /** グリッド座標 → 画面座標（エンティティ原点からの相対 px） */
  project: (x: number, y: number) => [number, number];
  projection: 'iso' | 'flat';
  esc: (s: string) => string;
  icon: (name: string, x: number, y: number, size?: number) => string;
  pill: (text: string, x: number, y: number, opts?: { icon?: string; tone?: Tone; small?: boolean }) => string;
}

export interface CustomRenderer {
  /** エンティティ原点 (0,0) を基準にした SVG 文字列を返す。色は CSS 変数 (--h-blue-top など) を使う */
  draw: (entity: CustomEntity, ctx: RenderCtx) => string;
  /** カメラ合わせ用の大きさ（px）。[左, 上, 右, 下] */
  bounds: (entity: CustomEntity) => [number, number, number, number];
  /** リンクが接続する縁（px）。数値なら円、[横, 縦] なら矩形（横長・縦長の図形に使う） */
  radius?: number | [number, number];
}
