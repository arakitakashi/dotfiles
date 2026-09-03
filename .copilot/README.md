# Copilot CLI 設定（compact 対策）

Claude Code の compact 対策（`dotfiles/.claude/` の compact-prep skill + hook 群）を
GitHub Copilot CLI へ移植したもの。2026-07-05 に v1.0.68 で実機検証済み。

## 設計（Claude Code 版との違い）

Copilot CLI には PostCompact 相当のイベントがなく、`userPromptSubmitted` /
`postToolUse` hook の出力でモデルに指示を注入する経路は使えない
（postToolUse の additionalContext は届くが、モデルが「ツール出力に埋め込まれた
不正な指示」として拒否することを実機で確認済み）。

そのため「圧縮後に注入」ではなく「圧縮前に退避 + 恒常指示で復旧」の構成を取る:

1. **preCompact hook**（`hooks/compact-recovery.json` → `scripts/precompact-save-state.sh`）
   - 手動 `/compact` と自動圧縮の両方で発火する（trigger フィールドで区別可）
   - 圧縮前の raw transcript を `~/.copilot/compact-backups/` へ退避（14日保持）。
     Claude Code では不可能な「非可逆圧縮への保険」がこれで効く
   - cwd に `.copilot-compact-state.md` を書き、復旧の入口にする
2. **グローバル恒常指示**（`copilot-instructions.md`）
   - `~/.copilot/copilot-instructions.md` が全セッションの custom instructions
     として読まれる（実機カナリアテストで確認。`~/.copilot/AGENTS.md` は読まれない）
   - custom instructions は圧縮の影響を受けないため、「圧縮を検知したら state file
     を読め」の指示が唯一の信頼された復旧経路になる

Claude Code 版の 60% 通知に相当するものは不要（自動圧縮でも preCompact が
発火するので、退避が hook で常に保証される）。

## symlink 構成

```
~/.copilot/hooks                   -> ~/dotfiles/.copilot/hooks
~/.copilot/copilot-instructions.md -> ~/dotfiles/.copilot/copilot-instructions.md
```

`~/.copilot/` 自体はランタイム状態（session-state/ 等）を含むため symlink しない。

## 注意

- `.copilot-compact-state.md` が作業リポジトリの cwd に生成される。
  グローバル gitignore（`git config core.excludesFile`）への追加を推奨
- リポジトリレベル hook（`.github/hooks/`）は非対話モードでは発火しない
  （信頼確認が必要）。本設定はユーザーレベルなので影響なし
