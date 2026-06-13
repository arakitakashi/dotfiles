#!/usr/bin/env python3
"""PostToolUse フック: Write/Edit された .py を ruff で自動整形する。

研究レポートの原則「例外なく毎回起こすべき動作はフックで決定論的に強制する」の実装。
pyproject.toml を持つプロジェクト内の .py 編集時のみ発火し、それ以外は何もしない（非ブロッキング）。
失敗してもツール実行を妨げない（常に exit 0）。
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0  # 入力が壊れていても処理を妨げない

    tool_input = data.get("tool_input") or {}
    file_path = tool_input.get("file_path")
    if not file_path or not str(file_path).endswith(".py"):
        return 0

    target = Path(file_path)
    if not target.exists():
        return 0

    # pyproject.toml を持つプロジェクトルートを上方向に探索
    root = next(
        (d for d in [target, *target.parents] if (d / "pyproject.toml").exists()),
        None,
    )
    if root is None or shutil.which("uv") is None:
        return 0  # uv プロジェクトでなければ何もしない

    for args in (["ruff", "format", str(target)], ["ruff", "check", "--fix", str(target)]):
        try:
            subprocess.run(
                ["uv", "run", *args],
                cwd=root,
                capture_output=True,
                timeout=60,
            )
        except (subprocess.SubprocessError, OSError):
            pass  # 整形は best-effort。失敗しても作業を止めない

    return 0


if __name__ == "__main__":
    sys.exit(main())
