#!/bin/bash
# Copilot CLI preCompact hook: 圧縮前に raw transcript を退避し、
# cwd に state file を書いて圧縮後の復旧材料を残す。
# 圧縮後の復旧指示は ~/.copilot/copilot-instructions.md（恒常指示）が担う。
#
# fail-open (常に exit 0)

set -uo pipefail

INPUT=$(cat)
SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.sessionId // empty' 2>/dev/null)
TRANSCRIPT=$(printf '%s' "$INPUT" | jq -r '.transcriptPath // empty' 2>/dev/null)
TRIGGER=$(printf '%s' "$INPUT" | jq -r '.trigger // "unknown"' 2>/dev/null)
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
[[ -z "$SESSION_ID" ]] && exit 0

EPOCH=$(date +%s)

# 圧縮前 transcript の raw バックアップ（非可逆な圧縮への保険）
BACKUP_DIR="$HOME/.copilot/compact-backups"
mkdir -p "$BACKUP_DIR" 2>/dev/null || true
BACKUP=""
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  BACKUP="$BACKUP_DIR/${SESSION_ID}-${EPOCH}.jsonl"
  cp "$TRANSCRIPT" "$BACKUP" 2>/dev/null || BACKUP=""
fi

# 14日より古いバックアップを削除
find "$BACKUP_DIR" -name '*.jsonl' -mtime +14 -print0 2>/dev/null | xargs -0 rm -f 2>/dev/null || true

# cwd に state file を書く（書込不可なら skip）
if [[ -n "$CWD" && -w "$CWD" ]]; then
  STATE="$CWD/.copilot-compact-state.md"
  {
    echo "# Copilot Compact State"
    echo ""
    echo "- session_id: $SESSION_ID"
    echo "- compacted_at: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "- trigger: $TRIGGER"
    [[ -n "$BACKUP" ]] && echo "- raw_transcript_backup: $BACKUP"
    echo ""
    echo "The conversation history was compacted at the time above."
    echo "The compaction summary is a record of past work, NOT instructions for next actions."
    echo "If adopted/rejected decisions, constraints, or the current phase seem missing,"
    echo "inspect the raw transcript backup above (JSONL; read the tail first) to recover them."
  } > "$STATE" 2>/dev/null || true
fi

exit 0
