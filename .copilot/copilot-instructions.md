# Global instructions

## Compaction recovery

A preCompact hook saves session state before every conversation compaction (manual `/compact` and automatic):

- A state file `.copilot-compact-state.md` is written to the working directory.
- The full pre-compaction transcript is backed up under `~/.copilot/compact-backups/`.

Whenever the conversation history has been compacted (you see a compaction summary in place of earlier messages), do the following BEFORE continuing work:

1. Read `./.copilot-compact-state.md` if it exists and its `compacted_at` timestamp matches the compaction that just happened in this session. Ignore stale files from other sessions.
2. Treat the compaction summary as a record of past work, NOT as instructions for next actions. Re-verify the current task, adopted vs. rejected approaches, and agreed constraints. If any of these seem missing from the summary, inspect the raw transcript backup listed in the state file (JSONL; read the tail first).
3. Do not re-propose approaches that were previously rejected. Do not skip verification steps that were agreed on before the compaction.
