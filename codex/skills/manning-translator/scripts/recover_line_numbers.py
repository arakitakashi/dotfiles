#!/usr/bin/env python3
"""
Manning livebook 抽出の「行番号+生コード」パターンを救済する。

抽出時にコードブロックの ``` マーカーが付与されず、行番号がインライン文字列
（バッククォート1つで囲まれた `   1  2  3  ...  N   `）として残り、その直後に
生コードが続いているケースに対処する。

Usage:
    python recover_line_numbers.py <markdown ファイル>

実行後、行番号文字列を除去し、後続のコードを ``` で囲んでコードブロック化する。
コードの終わり判定は、空行 + 構造要素または日本語段落を境界とする。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

# 行番号+コード開始のパターン: `   1  2  3  ...  N   `<コード>
LINENUM_RE = re.compile(r"^`\s*\d+(\s+\d+)+\s*`(.*)$")


def is_code_end_boundary(line: str) -> bool:
    """この行が出現したらコードブロックは終わったと判定する。"""
    s = line.strip()
    if not s:
        return False
    # 構造要素（ラベル/見出し/livebook UI/画像/HTMLコメント）
    if s.startswith("**リスト ") or s.startswith("**図") or s.startswith("**表"):
        return True
    if s.startswith("**注記") or s.startswith("**ヒント") or s.startswith("**警告"):
        return True
    if s.startswith("## ") or s.startswith("### ") or s.startswith("# "):
        return True
    if s.startswith("livebook features:"):
        return True
    if s.startswith("![") or s.startswith("<!--"):
        return True
    # 日本語文字（ひらがな・カタカナ・漢字）を含む段落
    if re.search(r"[぀-ゟ゠-ヿ一-鿿]", s):
        return True
    return False


def recover(filepath: Path) -> int:
    """ファイルを書き換え、救済した数を返す。"""
    lines = filepath.read_text(encoding="utf-8").splitlines(keepends=True)

    out: list[str] = []
    i = 0
    recovered = 0

    while i < len(lines):
        m = LINENUM_RE.match(lines[i])
        if m:
            # 行番号文字列の後ろにある最初のコード行
            first_code = m.group(2).rstrip() + "\n"
            code_lines: list[str] = [first_code] if first_code.strip() else []
            j = i + 1
            # コードの終わりを探す
            while j < len(lines):
                cur = lines[j]
                if cur.strip() == "":
                    # 空行: 後続の非空行が境界か確認
                    k = j + 1
                    while k < len(lines) and lines[k].strip() == "":
                        k += 1
                    if k < len(lines) and is_code_end_boundary(lines[k]):
                        break
                    code_lines.append(cur)
                    j += 1
                else:
                    if is_code_end_boundary(cur):
                        break
                    code_lines.append(cur)
                    j += 1
            # 末尾の空行を削除
            while code_lines and code_lines[-1].strip() == "":
                code_lines.pop()
            # コードブロックとして出力
            out.append("```\n")
            out.extend(code_lines)
            out.append("```\n")
            recovered += 1
            i = j
            continue
        out.append(lines[i])
        i += 1

    filepath.write_text("".join(out), encoding="utf-8")
    return recovered


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python recover_line_numbers.py <markdown ファイル>", file=sys.stderr)
        return 1

    target = Path(sys.argv[1])
    if not target.is_file():
        print(f"ファイルが見つかりません: {target}", file=sys.stderr)
        return 1

    before_blocks = sum(1 for line in target.read_text(encoding="utf-8").splitlines() if line.startswith("```")) // 2
    count = recover(target)
    after_blocks = sum(1 for line in target.read_text(encoding="utf-8").splitlines() if line.startswith("```")) // 2

    print(f"救済したコードブロック数: {count}")
    print(f"コードブロック総数: {before_blocks} → {after_blocks}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
