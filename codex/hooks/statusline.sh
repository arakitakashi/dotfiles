#!/bin/bash
# statusline: モデル名 / ディレクトリ / context 使用率を表示する。
# 使用率が閾値を超えたら compact-warn marker を書き、
# UserPromptSubmit hook (userpromptsubmit-compact-prep-reminder.sh) が
# /compact-prep の提案を context に注入する。
#
# fail-open: 解析に失敗しても最低限の文字列を出して exit 0

set -uo pipefail

input=$(cat)

model=$(printf '%s' "$input" | jq -r '.model.display_name // "Claude"' 2>/dev/null)
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)
session_id=$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null)
pct=$(printf '%s' "$input" | jq -r '.context_window.used_percentage // 0' 2>/dev/null)
win=$(printf '%s' "$input" | jq -r '.context_window.context_window_size // 0' 2>/dev/null)

int_pct=${pct%.*}
int_pct=${int_pct:-0}

# context ウィンドウサイズの短縮表示 (1000000 -> 1M, 200000 -> 200K)
win_label=""
if [ "$win" -ge 1000000 ] 2>/dev/null; then
  win_label="$((win / 1000000))M"
elif [ "$win" -gt 0 ] 2>/dev/null; then
  win_label="$((win / 1000))K"
fi

# 閾値超で compact-prep 警告 marker を書く（cooldown 中でなければ）
COMPACT_WARN_THRESHOLD=60
if [ -n "$session_id" ] && [ "$int_pct" -ge "$COMPACT_WARN_THRESHOLD" ] 2>/dev/null; then
  _warn_dir="${TMPDIR:-/tmp}/claude-compact-warned"
  if [ ! -f "$_warn_dir/$session_id" ]; then
    _ctx_warn_dir="${TMPDIR:-/tmp}/claude-compact-warn"
    mkdir -p "$_ctx_warn_dir" 2>/dev/null || true
    printf '%s\n' "$int_pct" > "$_ctx_warn_dir/$session_id" 2>/dev/null || true
  fi
fi

# 表示: 60% 以上で警告マークを付ける
ctx_part="ctx:${int_pct}%"
[ -n "$win_label" ] && ctx_part="ctx:${int_pct}%/${win_label}"
if [ "$int_pct" -ge "$COMPACT_WARN_THRESHOLD" ] 2>/dev/null; then
  ctx_part="⚠ ${ctx_part} → /compact-prep"
fi

dir_part=""
[ -n "$cwd" ] && dir_part=" 📁 ${cwd##*/}"

printf '[%s]%s | %s\n' "$model" "$dir_part" "$ctx_part"
exit 0
