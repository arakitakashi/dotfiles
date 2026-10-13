"""<dd> 内の <pre> がインライン化されて崩れた箇所（`tok`` ``tok`` ...）をコードブロックに復元するテンプレート。

現在の extract_chapter.js では発生しないが、旧抽出や他サイトで `` `` が出た場合に使う。
使い方: FIXES に (開始マーカー, 終了マーカー or None, 復元コード) を追記して
       python3 -I fix_dd.py <対象md> ...
トークンは全て残っているので、改行とインデントを人手で復元して登録する。
"""
import sys
from pathlib import Path

FIXES: list[tuple[str, str | None, str]] = [
    # 例:
    # ("`const`` ``COMPOSITOR_SHADER``", "If the file doesn", "const COMPOSITOR_SHADER: &str =\n    include_str!(\"../resources/compositor.glsl\");"),
]


def fix_text(text: str) -> tuple[str, int]:
    out: list[str] = []
    n = 0
    for ln in text.split("\n"):
        hit = False
        for start, end, code in FIXES:
            i = ln.find(start)
            if i < 0:
                continue
            before = ln[:i].rstrip()
            after = "" if end is None else ln[ln.find(end, i):].strip() if ln.find(end, i) >= 0 else ""
            if end is not None and ln.find(end, i) < 0:
                continue
            out.extend([before, "", "```\n" + code + "\n```"])
            if after:
                out.extend(["", after])
            n += 1
            hit = True
            break
        if not hit:
            out.append(ln)
    return "\n".join(out), n


for p in sys.argv[1:]:
    path = Path(p)
    new, n = fix_text(path.read_text(encoding="utf-8"))
    if n:
        path.write_text(new, encoding="utf-8")
    print(f"{path.name}: {n} 箇所修正")
