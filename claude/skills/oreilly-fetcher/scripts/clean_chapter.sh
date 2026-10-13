#!/usr/bin/env bash
# ダウンロードした章 markdown を整形し、統計を表示する。
# 使い方: clean_chapter.sh <ダウンロードした chNN.md> <出力先 chNN.md>
set -euo pipefail
IN="$1"; OUT="$2"
# 末尾の目次（## [Programming ...](...) 以降）を落とす
N=$(grep -n '^## \[.*\](https://learning.oreilly.com/library/view/' "$IN" | head -1 | cut -d: -f1 || true)
if [ -n "${N:-}" ]; then head -n $((N-1)) "$IN"; else cat "$IN"; fi \
  | grep -v '^!\[\](https://learning.oreilly.com/covers/' \
  | grep -vE '^(table of contents|close x)$' \
  | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}' > "$OUT"
echo "$(basename "$OUT"): $(wc -l < "$OUT") 行"
echo "  コードブロック: $(( $(grep -c '^[[:space:]]*```' "$OUT") / 2 ))"
echo "  図キャプション: $(grep -c '^###### ' "$OUT")  画像: $(grep -c '!\[' "$OUT")  テーブル: $(grep -c '^|---' "$OUT")  箇条書き: $(grep -c '^- ' "$OUT")"
echo "  崩れたインラインコード(\`\` \`\`): $(grep -c '`` ``' "$OUT")  1トークンのみのコードブロック: $(awk '/^[[:space:]]*```/{c++; if(c%2==1){getline a; getline b; if(b ~ /^[[:space:]]*```/ && a !~ / /) n++}} END{print n+0}' "$OUT")"
echo "  見出し:"; grep -nE '^#{1,2} ' "$OUT" | sed 's/^/    /'
