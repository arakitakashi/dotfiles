# Manning livebook 固有ルール

book-translator の `translation-rules.md` に加えて、Manning livebook 抽出原文に適用する追加ルール。

## 装飾ラベルの bold 変換

Manning livebook は `Figure 1.1`, `Listing 1.1`, `Table 1.1`, `NOTE`, `TIP`, `WARNING` を `<h5>` として出力する。これを markdown に抽出すると `##### Figure 1.1` となり、Obsidian等のアウトラインを破綻させる。

**ルール: 装飾ラベルはすべて bold 表記に変換する。**

| 原文 | 翻訳 |
|---|---|
| `##### Listing 1.1 caption` | `**リスト 1.1 caption**` |
| `##### Figure 1.1 caption` | `**図1.1 caption**` |
| `##### Table 1.1 caption` | `**表1.1 caption**` |
| `##### NOTE` | `**注記**` |
| `##### TIP` | `**ヒント**` |
| `##### WARNING` | `**警告**` |

H5 (`#####`) は **章本文の小見出しのみ** に使用。装飾ラベルには使わない。

注: Manning原文では `Listing` と数字の間にスペースあり、`Figure` `Table` はスペースなしのことが多い。翻訳でも原文に従う:
- `Listing 1.1` → `リスト 1.1` (スペースあり)
- `Figure 1.1` → `図1.1` (スペースなし)
- `Table 1.1` → `表1.1` (スペースなし)

## コード抽出エラーへの対処

Manning livebook 抽出には2種類の失敗パターンがある。

### タイプA: コード本体欠落（救済不可）

コードブロック内が行番号の連結数字のみ:

````
```
1234567891011121314
```
````

これは抽出時点でコード本体が失われている。以下に置換する:

```html
<!-- 注: 原文ではここに数行のコードが含まれていたが、抽出エラーのため省略 -->
```

連続数字をそのまま翻訳結果に残してはいけない（読者にとって無意味なノイズ）。

### タイプB: コードブロックマーカー欠落（救済可能）

行番号がインライン文字列、その後に生コードが続く:

```
**リスト 1.4 `hello-world.js`**

`   1  2  3  4  5  6  7  8  9  10  11  12  13  14  15   `class HelloWorld extends HTMLElement {
  constructor() {
    super();
    ...
  }
}
```

これは ` ``` ` マーカーが付与されなかっただけで、コード本体は残っている。`scripts/recover_line_numbers.py` で救済する。救済後:

````
**リスト 1.4 `hello-world.js`**

```
class HelloWorld extends HTMLElement {
  constructor() {
    super();
    ...
  }
}
```
````

## livebook UI 残骸

livebook の閲覧者向けUI文言が抽出されることがある:

```
livebook features:  
**highlight, annotate, and bookmark**

テキストを選択するだけで、自動的にハイライトすることができます。

Disable quick notes and highlights?
```

これらは翻訳本としては不要だが、原則として削除しない（原文忠実性）。ユーザーが希望した場合のみ一括削除する。

## 章構造の取り扱い

### 章マーカー行

Manning では章タイトルの前後に以下の行が出現することがある:

```
chapter one

MEAP v1

# Why web components?
```

これらは翻訳しない（そのまま残す）。`MEAP vN` は MEAP のバージョン番号なので維持。

### 章タイトル翻訳

`# Why web components?` のような原文をそのまま残してはいけない。「第N章」形式に変換する:

```
chapter one

MEAP v1

# 第1章 Webコンポーネントはなぜ必要か？
```

### 本章で扱う内容

各章冒頭の `### This chapter covers` は `### 本章で扱う内容` と訳す。

## liveBook 内リンク

本文中に頻出する内部リンクは原文のまま残す（読者がオンライン版を参照する場合に有用）:

```
リスト [1.2](https://livebook.manning.com/book/web-component-development-with-modern-libraries-and-tooling/chapter-1/v-1#radio-group-html) に示されているように…
```

URL自体は翻訳せず、リンクテキスト（数字部分）のみそのまま。

## サイドバー・ディスカッションフォーラム

```
Please be sure to post any questions, comments, or suggestions you have about the book in the [liveBook Discussion Forum](...).
```

「[liveBook Discussion Forum](URL)」のリンクテキストは「[liveBook Discussion Forum](URL)」のまま残し、英語固有名詞として扱う。

## 訳語の Manning 慣例

| 英語 | 推奨日本語 |
|---|---|
| livebook | livebook（原語のまま） |
| MEAP | MEAP（原語のまま、初出時に「Manning Early Access Program」と補足可） |
| Manning | Manning（原語のまま） |
| chapter | 章（本文中）、第N章（タイトル） |
| section | セクション（または節） |

## Agent指示テンプレート（Manning 拡張）

book-translator の Agent テンプレートに以下を追加する:

```
【Manning固有ルール】
- ##### Listing N.N caption → **リスト N.N caption**
- ##### Figure N.N caption → **図N.N caption**
- ##### Table N.N caption → **表N.N caption**
- ##### NOTE → **注記**
- ##### TIP → **ヒント**
- ##### WARNING → **警告**
- 「chapter one」「MEAP v1」のような行はそのまま残す
- livebook features: ブロックは翻訳して残す
- liveBook URL（https://livebook.manning.com/...）は原文のまま残す
- コードブロック内に「1234567891011」のような連続数字しかない場合は <!-- 注: 原文ではここに数行のコードが含まれていたが、抽出エラーのため省略 --> に置換
```
