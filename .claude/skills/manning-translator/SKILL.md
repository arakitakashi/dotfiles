---
name: manning-translator
description: Manning Publications の MEAP / livebook から抽出された技術書原文（英語）を日本語に翻訳する。Manning固有の抽出エラー（行番号連結、コードブロック欠落、##### Figure/Listing ラベル）の検出・救済・正規化を含む。Manning本、livebook、MEAP本、liveBook由来のmarkdown原文を翻訳する場合に使用する。汎用の技術書翻訳は book-translator を使う。
---

# Manning Translator - Manning livebook 翻訳スキル

Manning Publications の livebook (MEAP 含む) から抽出された markdown 原文を日本語に翻訳するための専用スキル。汎用の翻訳ワークフローは [book-translator](../book-translator/SKILL.md) を踏襲し、Manning固有の抽出パターンへの対応と装飾要素の正規化を追加する。

## このスキルが必要な理由

Manning livebook の HTML→markdown 抽出には、以下の固有問題が頻発する:

1. **コードブロック欠落（タイプA）**: コードブロック内が行番号連結（例: `1234567891011121314`）のみ。コード本体が完全欠落。
2. **コードブロック未マーク（タイプB）**: 行番号がインライン文字列、その後に生コードが続くが ` ``` ` で囲まれていない。コード本体は残っており救済可能。
3. **装飾要素のH5化**: `Figure 1.1`, `Listing 1.1`, `NOTE` などのラベルが `<h5>` として抽出され、目次（Obsidianアウトライン等）を破綻させる。
4. **livebook UI 残骸**: `livebook features: highlight, annotate, and bookmark` のような閲覧UI文言が混入。
5. **章マーカー**: `chapter one`, `MEAP v1` のような行が章の前後に挿入されている。

これらをすべて book-translator で扱うとルールが肥大化するため、Manning専用スキルとして分離。

## ワークフロー

book-translator のワークフローを基本とし、以下のManning固有ステップを追加する。

### Step 0. Manning原文かを判定

以下のいずれかが該当すれば Manning livebook の抽出物:

```bash
FILE="<原文ファイル>"
grep -c "livebook features:" "$FILE"
grep -c "liveBook Discussion Forum" "$FILE"
grep -c "livebook.manning.com" "$FILE"
grep -cE "^##### (Listing|Figure|Table|NOTE|TIP|WARNING) " "$FILE"
grep -cE "^chapter (one|two|three|four|five|six|seven|eight|nine|ten)$" "$FILE"
```

該当しなければ汎用 book-translator を使う。

### Step 1. 翻訳前の整形（重要・必須）

**翻訳前にソースを正規化する。** 翻訳後に修正するより、整形済みソースを翻訳した方が品質が高く、Agent指示も単純になる。

#### 1.1 ソース品質検査

`scripts/check_source.sh` を実行:

```bash
bash /Users/arakitakashi/.claude/skills/manning-translator/scripts/check_source.sh "<原文ファイル>"
```

出力例:
```
=== Manning ソース品質検査 ===
タイプA（コードブロック内が数字のみ・救済不可）: 73 個
タイプB（行番号+生コード・救済可能）: 39 個
##### 装飾ラベル: 188 個
livebook UI 残骸: 14 個
```

#### 1.2 タイプB（救済可能なコード）の救済

`scripts/recover_line_numbers.py` を実行:

```bash
uv run python /Users/arakitakashi/.claude/skills/manning-translator/scripts/recover_line_numbers.py "<原文ファイル>"
```

行番号インライン文字列を除去し、後続の生コードを ` ``` ` で囲んでコードブロック化する。出力に救済件数が表示される。

#### 1.3 タイプA（救済不可なコード）の処理方針確認

タイプAが見つかった場合、ユーザーに以下のいずれかを確認:

1. **再抽出**: livebook からコードを正しい方法で再取得（推奨。手間はかかるが完全）
2. **プレースホルダー化**: `<!-- 注: 原文ではここに数行のコードが含まれていたが、抽出エラーのため省略 -->` を埋め込んで翻訳を進める
3. **文脈再構築**: 翻訳後にClaudeに前後の説明文から等価コードを生成させる（過去事例: コミット a3522f7 「抽出エラーで失われたコード31箇所を文脈に基づき再構築」）

選択2の場合、`scripts/placeholder_corrupted.py` を実行:

```bash
uv run python /Users/arakitakashi/.claude/skills/manning-translator/scripts/placeholder_corrupted.py "<原文ファイル>"
```

### Step 2〜8. 翻訳と検証

book-translator のワークフロー Step 2〜8 をそのまま実施。ただし、Agent指示には以下の Manning 固有ルールを必ず含める（`references/manning-rules.md` 参照）。

### Step 9. Manning固有レビュー

通常レビュー（book-translator Step 7）に加え、以下を実施:

#### 9.1 装飾ラベルが H5 ではなく bold になっているか

```bash
# H5 が残っているとアウトライン破綻
grep -c "^##### " "$FILE"  # 0 が理想。残るのは本文小見出しのみ
grep -cE "^\*\*(リスト|図|表|注記|ヒント|警告)" "$FILE"  # bold 化された装飾ラベル数
```

万一H5が残っていれば一括変換:

```bash
sed -i.bak \
  -e 's|^##### リスト \(.*\)$|**リスト \1**|g' \
  -e 's|^##### 図\(.*\)$|**図\1**|g' \
  -e 's|^##### 表\(.*\)$|**表\1**|g' \
  -e 's|^##### 注記$|**注記**|g' \
  -e 's|^##### ヒント$|**ヒント**|g' \
  -e 's|^##### 警告$|**警告**|g' \
  "$FILE"
rm -f "${FILE}.bak"
```

#### 9.2 livebook UI 残骸の処理

```bash
grep -n "livebook features:" "$FILE"
grep -n "liveBook Discussion Forum" "$FILE"
```

これらはManning livebookのインタラクティブ機能案内であり、翻訳本としては不要。残すか削除するかは原則として残す（原文忠実性のため）が、ユーザーが希望すれば一括削除可能。

#### 9.3 残存するコード破損

```bash
COLLAPSED=$(awk '/^```/{c++; if(c%2==1){inblock=1; next} else {inblock=0; next}} inblock && /^[[:space:]]*[0-9]+[[:space:]]*$/' "$FILE" | wc -l)
echo "残存破損行: $COLLAPSED （0であるべき）"
```

## Manning固有ルール

詳細は `references/manning-rules.md` を参照。要点:

- **装飾ラベル**: `##### Listing/Figure/Table/NOTE/TIP/WARNING` → bold `**...**`
- **章マーカー**: `chapter one` `chapter two` 等の行はそのまま残す（翻訳しない）
- **MEAP表記**: `MEAP v1` などはそのまま残す
- **livebook URL**: liveBook内リンク (`https://livebook.manning.com/...`) は機能しないので削除可能だが、翻訳忠実性のため通常は残す
- **本文中の Listing/Figure 参照**: 「リスト 1.1」「図1.1」と訳す（数字とラベルの間のスペース有無は Manning 原文に合わせる）

## スクリプト一覧

| スクリプト | 目的 |
|---|---|
| `scripts/check_source.sh` | ソース品質検査（タイプA/B、装飾ラベル、UI残骸を集計） |
| `scripts/recover_line_numbers.py` | タイプB救済（行番号+生コード → コードブロック化） |
| `scripts/placeholder_corrupted.py` | タイプAをプレースホルダー化 |
| `scripts/normalize_labels.sh` | H5装飾ラベルを bold に一括変換 |
