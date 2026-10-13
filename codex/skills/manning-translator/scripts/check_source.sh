#!/usr/bin/env bash
# Manning livebook 原文の品質検査
# Usage: bash check_source.sh <ファイルパス>

set -uo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <markdown ファイル>" >&2
  exit 1
fi

FILE="$1"
if [ ! -f "$FILE" ]; then
  echo "ファイルが見つかりません: $FILE" >&2
  exit 1
fi

# grep -c は0件マッチでもexit 1を返すので、結果を変数に取り、改行を除去する
count() {
  local result
  result=$(grep -cE "$1" "$FILE" 2>/dev/null) || result=0
  echo "${result:-0}" | head -1
}

echo "=== Manning ソース品質検査: $(basename "$FILE") ==="
echo ""

# 基本情報
echo "総行数: $(wc -l < "$FILE")"
echo ""

# Manning であるかの判定
echo "--- Manning 由来の判定指標 ---"
echo "livebook features 出現: $(count 'livebook features:')"
echo "liveBook Discussion Forum 出現: $(count 'liveBook Discussion Forum')"
echo "livebook.manning.com URL: $(count 'livebook\.manning\.com')"
echo "##### Listing/Figure/Table 装飾: $(count '^##### (Listing|Figure|Table|NOTE|TIP|WARNING) ')"
echo "「chapter one/two/...」行: $(count '^chapter (one|two|three|four|five|six|seven|eight|nine|ten)$')"
echo "MEAP 表記: $(count '^MEAP v[0-9]+$')"
echo ""

# コードブロック関連
echo "--- コードブロック検査 ---"
TOTAL_BLOCKS=$(count '^```')
echo "コードブロック開始/終了マーカー数: $TOTAL_BLOCKS (ブロック数: $((TOTAL_BLOCKS / 2)))"

TYPE_A=$(awk '
  /^```/{
    c++
    if(c%2==1){in_block=1; line_count=0; only_digits=1; next}
    else {if(in_block && only_digits && line_count>0) count++; in_block=0; next}
  }
  in_block{
    line_count++
    if(!match($0, /^[[:space:]]*[0-9]+[[:space:]]*$/)) only_digits=0
  }
  END{print count+0}
' "$FILE")
echo "タイプA（コードブロック内が数字のみ・救済不可）: $TYPE_A 個"

TYPE_B=$(count '^`[[:space:]]*[0-9]+([[:space:]]+[0-9]+)+[[:space:]]*`')
echo "タイプB（行番号+生コード・救済可能）: $TYPE_B 個"
echo ""

# 装飾ラベル
echo "--- 装飾ラベル ---"
echo "##### Listing N.N: $(count '^##### Listing ')"
echo "##### Figure N.N: $(count '^##### Figure ')"
echo "##### Table N.N: $(count '^##### Table ')"
echo "##### NOTE/TIP/WARNING: $(count '^##### (NOTE|TIP|WARNING)$')"
echo ""

# 構造
echo "--- 構造 ---"
echo "H1 見出し: $(count '^# ')"
echo "H2 見出し: $(count '^## ')"
echo "H3 見出し: $(count '^### ')"
echo "H5 見出し: $(count '^##### ')"
echo "画像: $(count '!\[')"
echo ""

# 推奨アクション
echo "--- 推奨アクション ---"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "$TYPE_B" -gt 0 ]; then
  echo "1. タイプBのコード救済を実行:"
  echo "   uv run python $SCRIPT_DIR/recover_line_numbers.py \"$FILE\""
fi
if [ "$TYPE_A" -gt 0 ]; then
  echo "2. タイプAをプレースホルダー化:"
  echo "   uv run python $SCRIPT_DIR/placeholder_corrupted.py \"$FILE\""
  echo "   （または再抽出・文脈再構築を検討）"
fi
HAS_H5=$(count '^##### (Listing|Figure|Table|NOTE|TIP|WARNING|リスト|図|表|注記|ヒント|警告)')
if [ "$HAS_H5" -gt 0 ]; then
  echo "3. 装飾ラベルを bold に変換:"
  echo "   bash $SCRIPT_DIR/normalize_labels.sh \"$FILE\""
fi
