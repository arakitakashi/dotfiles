"""extract_code_blocks.js で取得したコードを、1トークン欠損のコードブロックに差し込む。

使い方: python3 -I fill_code.py <対象md> <code_ch01.txt> <code_ch02.txt> ...
- 対象 md のコードブロック（1行だけのもの）を出現順に、ページ由来ブロックの先頭行と照合して置換する
- 先頭トークン一致（`fn` ↔ `fn main() {`）または先頭行一致、コメント行どうしの一致を採用
- 箇条書き内のインデント付きフェンスはインデントを保って差し込む
- 表の上付き文字欠落（`28−1` → `2^8−1`、`1038` → `10^38`）も修正する
原文ファイルに実行する（既に翻訳ファイルがあればそれにも実行できる）。
"""
import re
import sys
from pathlib import Path

BLOCK_RE = re.compile(r"⟦CODE (\d+)⟧(.*?)⟦/CODE⟧", re.S)


def load_blocks(paths: list[str]) -> list[str]:
    blocks: list[str] = []
    for p in paths:
        text = Path(p).read_text(encoding="utf-8")
        for m in BLOCK_RE.finditer(text):
            body = m.group(2).strip("\n")
            lines = body.split("⏎") if "⏎" in body else body.split("\n")
            blocks.append("\n".join(ln.replace("␣", " ") for ln in lines))
    return blocks


def first_token(line: str) -> str:
    s = line.strip().split()
    return s[0] if s else ""


def matches(stub: str, web_first_line: str) -> bool:
    a, b = stub.strip(), web_first_line.strip()
    if a == b or (a.startswith("//") and b.startswith("//")):
        return True
    return a == first_token(b) or a == b[: len(a)]


def fix_table_line(ln: str) -> str:
    ln = re.sub(r"(?<![\^\d])2(7|8|15|16|31|32|63|64|127|128)(?=−1)", r"2^\1", ln)
    ln = re.sub(r"−2(7|15|31|63|127)(?= )", r"−2^\1", ln)
    return re.sub(r"(×\s?)10(38|308)\b", r"\g<1>10^\2", ln)


def main() -> None:
    target = Path(sys.argv[1])
    blocks = load_blocks(sys.argv[2:])
    lines = target.read_text(encoding="utf-8").split("\n")
    fence = re.compile(r"^(\s*)```")
    out: list[str] = []
    i = wi = replaced = 0
    skipped: list[int] = []
    unmatched: list[int] = []
    while i < len(lines):
        m = fence.match(lines[i])
        if not m:
            out.append(fix_table_line(lines[i]) if lines[i].startswith("|") else lines[i])
            i += 1
            continue
        indent = m.group(1)
        j = i + 1
        body: list[str] = []
        while j < len(lines) and not fence.match(lines[j]):
            body.append(lines[j])
            j += 1
        stub = "\n".join(body).strip()
        found = next((k for k in range(wi, min(len(blocks), wi + 12)) if matches(stub, blocks[k].split("\n")[0])), None)
        out.append(lines[i])
        if found is not None and "\n" not in stub:
            skipped.extend(range(wi, found))
            out.extend(indent + cl if cl else "" for cl in blocks[found].split("\n"))
            wi = found + 1
            replaced += 1
        else:
            unmatched.append(i + 1)
            out.extend(body)
        out.append(lines[j] if j < len(lines) else "```")
        i = j + 1
    target.write_text("\n".join(out), encoding="utf-8")
    print(f"{target.name}: web blocks={len(blocks)} replaced={replaced} skipped_web={skipped} unmatched_md_lines={unmatched} remaining_web={list(range(wi, len(blocks)))}")


if __name__ == "__main__":
    main()
