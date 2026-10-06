---
description: Obsidian vault ノートの frontmatter・内部リンク・構造の規約。vault 配下の .md を編集するときのみ適用する。
paths:
  - "**/obsidian_vault/**/*.md"
---

# Obsidian vault ノート規約

このルールは Obsidian vault 配下の Markdown を作成・編集するときのみロードされる
（パス限定なので他プロジェクトのセッションには影響しない）。

## frontmatter
- frontmatter を付ける場合は必ず `---` で正しく開閉する。壊れた frontmatter を残さない。
- 新規ノートには `tags`（リスト）を付ける。日付フィールドは**既存ノートの慣例に合わせる**:
  - `00 Permanent Notes`（Zettelkasten）: `id`（タイムスタンプ）と `date`
  - それ以外のフォルダ: `created`
- 既存ノートを編集するときは、そのノートの既存スキーマを尊重し、勝手に別形式へ変換しない。

## 内部リンク
- 他ノート参照は `[[ノート名]]` 形式を使う。リンク先ノートが実在することを basename で確認する。
- リンク切れを新たに作らない。

## 構造
- 見出し階層を飛ばさない（h1 → h2 → h3 の順に下げる）。
- 本文を途中で切らない。

> 事後の独立検証は `vault-note-reviewer` サブエージェントが担う。
> 本ルールは**書き込み時の先回り**を目的とし、両者で二重化する。
