#!/usr/bin/env python3
"""
Manning livebook 抽出の「コードブロック内が数字のみ」（タイプA）をプレースホルダーに置換する。

タイプA: ```...``` で囲まれた中身が行番号連結のみで、コード本体が失われているケース。
このパターンは元データから本体が消失しており復元不可能なため、HTMLコメント形式の
プレースホルダーに置き換える。

Usage:
    python placeholder_corrupted.py <markdown ファイル>

【先に recover_line_numbers.py を実行することを推奨】
タイプB（救済可能）を先に処理してから、本スクリプトでタイプAを処理する。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

PLACEHOLDER = "<!-- 注: 原文ではここに数行のコードが含まれていたが、抽出エラーのため省略 -->\n"
DIGITS_ONLY = re.compile(r"^\s*\d+\s*$")


def placeholder(filepath: Path) -> int:
    """ファイルを書き換え、置換した数を返す。"""
    lines = filepath.read_text(encoding="utf-8").splitlines(keepends=True)

    out: list[str] = []
    i = 0
    replaced = 0

    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("```"):
            # コードブロック開始
            block_start = i
            block_lines = [line]
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                block_lines.append(lines[i])
                i += 1
            if i < len(lines):
                block_lines.append(lines[i])  # 終了 ```
                i += 1
            # 中身を判定
            inner = block_lines[1:-1] if len(block_lines) >= 2 else []
            non_empty = [l for l in inner if l.strip()]
            all_digits = bool(non_empty) and all(DIGITS_ONLY.fullmatch(l) for l in non_empty)
            if all_digits:
                out.append(PLACEHOLDER)
                replaced += 1
            else:
                out.extend(block_lines)
            continue
        out.append(line)
        i += 1

    filepath.write_text("".join(out), encoding="utf-8")
    return replaced


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python placeholder_corrupted.py <markdown ファイル>", file=sys.stderr)
        return 1

    target = Path(sys.argv[1])
    if not target.is_file():
        print(f"ファイルが見つかりません: {target}", file=sys.stderr)
        return 1

    count = placeholder(target)
    print(f"プレースホルダーに置換したコードブロック数: {count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
