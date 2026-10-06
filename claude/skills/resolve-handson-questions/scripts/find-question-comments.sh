#!/usr/bin/env bash
# 指定ディレクトリ以下の全 Markdown から、フェンスコードブロック外の // コメント行を列挙する。
# 出力形式: <ファイルパス>:<行番号>:<行内容>
# ヒットなしなら出力なし・exit 0。誤検知（プロトコル相対 URL 等）の最終選別は呼び出し側で行う。
set -euo pipefail

root="${1:?使い方: find-question-comments.sh <検索対象ディレクトリ>}"

find "$root" -type f -name '*.md' -print0 | sort -z | while IFS= read -r -d '' f; do
  awk '
    /^[[:space:]]*(```|~~~)/ { fence = !fence; next }
    !fence && /^[[:space:]]*\/\// { printf "%s:%d:%s\n", FILENAME, FNR, $0 }
  ' "$f"
done
