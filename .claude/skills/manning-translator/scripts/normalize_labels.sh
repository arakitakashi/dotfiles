#!/usr/bin/env bash
# Manning livebook の ##### 装飾ラベル（Listing/Figure/Table/NOTE/TIP/WARNING）を
# bold (**...**) に一括変換する。
#
# 翻訳前（英語）でも翻訳後（日本語）でも実行可能。
#
# Usage: bash normalize_labels.sh <markdown ファイル>

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <markdown ファイル>" >&2
  exit 1
fi

FILE="$1"
if [ ! -f "$FILE" ]; then
  echo "ファイルが見つかりません: $FILE" >&2
  exit 1
fi

BEFORE=$(grep -c '^##### ' "$FILE" 2>/dev/null || echo 0)

sed -i.bak \
  -e 's|^##### Listing \(.*\)$|**リスト \1**|g' \
  -e 's|^##### Figure \(.*\)$|**図\1**|g' \
  -e 's|^##### Table \(.*\)$|**表\1**|g' \
  -e 's|^##### NOTE$|**注記**|g' \
  -e 's|^##### TIP$|**ヒント**|g' \
  -e 's|^##### WARNING$|**警告**|g' \
  -e 's|^##### Note$|**注記**|g' \
  -e 's|^##### Tip$|**ヒント**|g' \
  -e 's|^##### Warning$|**警告**|g' \
  -e 's|^##### 注意（NOTE）$|**注記**|g' \
  -e 's|^##### ヒント（TIP）$|**ヒント**|g' \
  -e 's|^##### 警告（WARNING）$|**警告**|g' \
  -e 's|^##### リスト \(.*\)$|**リスト \1**|g' \
  -e 's|^##### 図\(.*\)$|**図\1**|g' \
  -e 's|^##### 表\(.*\)$|**表\1**|g' \
  -e 's|^##### 注記$|**注記**|g' \
  -e 's|^##### ヒント$|**ヒント**|g' \
  -e 's|^##### 警告$|**警告**|g' \
  "$FILE"
rm -f "${FILE}.bak"

AFTER=$(grep -c '^##### ' "$FILE" 2>/dev/null || echo 0)
BOLD=$(grep -cE '^\*\*(リスト|図|表|注記|ヒント|警告)' "$FILE" 2>/dev/null || echo 0)

echo "H5見出し: $BEFORE → $AFTER（章本文の小見出しのみ残るはず）"
echo "Bold装飾ラベル: $BOLD"
