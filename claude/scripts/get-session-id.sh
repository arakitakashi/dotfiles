#!/bin/bash
# 現在の Claude Code session_id を出力する。
# Bash ツール環境に CLAUDE_CODE_SESSION_ID が注入されていることを利用する。
# 取得できない場合は何も出力せず exit 1（呼び出し側の Hard gate 用）。

set -uo pipefail

if [[ -n "${CLAUDE_CODE_SESSION_ID:-}" ]]; then
  printf '%s\n' "$CLAUDE_CODE_SESSION_ID"
  exit 0
fi

exit 1
