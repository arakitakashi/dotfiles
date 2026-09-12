# dotfiles

macOS 用のグローバルな個人設定を保管するリポジトリ。
`install.sh` が各設定をこのリポジトリへのシンボリックリンクとして配置する。
このリポジトリ専用のエージェント設定やスキルは置かない。

## セットアップ

```bash
git clone https://github.com/arakitakashi/dotfiles.git ~/dotfiles
~/dotfiles/install.sh
```

既存の実ファイルがある場所はスキップされるので、手動で退避してから再実行する。

## 構成

| ディレクトリ | 内容 | リンク先 |
|---|---|---|
| `shell/` | zsh 設定 | `~/.zshrc` |
| `tmux/` | tmux 設定（tpm は install.sh が clone） | `~/.tmux.conf` ほか |
| `nvim/` | Neovim 設定（LazyVim ベース） | `~/.config/nvim` |
| `ghostty/` | Ghostty 設定 | `~/Library/Application Support/com.mitchellh.ghostty/config` |
| `lazygit/` | lazygit 設定 | `~/Library/Application Support/lazygit` |
| `vscode/` | VS Code 設定・キーバインド | `~/Library/Application Support/Code/User/` |
| `zed/` | Zed 設定・キーマップ | `~/.config/zed/` |
| `claude/` | Claude Code のユーザーレベル設定・スキル・フック | `~/.claude/` |
| `codex/` | Codex のユーザーレベル設定・エージェント・フック・スキル | `~/.codex/` の設定項目、`~/.agents/skills`、`~/AGENTS.md` |

## Codex の設定管理

`codex/` は現在のユーザー設定を管理する。`~/.codex` は実ディレクトリのまま残し、
`AGENTS.md`、`config.toml`、`agents/`、`hooks/`、`hooks.json` を個別にリンクする。
個人スキルは `codex/skills/` を `~/.agents/skills` に、共通指示は
`codex/AGENTS.md` を `~/AGENTS.md` にもリンクする。

`config.toml` は現在のマシンの絶対パスやアプリが更新する設定を含む。
別のマシンへ導入するときはパスを確認する。API キーなどの秘密情報は保存しない。
認証情報、会話履歴、データベース、キャッシュ、配布プラグインは `~/.codex` に残す。
共通指示、エージェント、スキルはグローバル設定に集約する。
リポジトリ直下に `.claude/`、`.codex/`、`.agents/`、`AGENTS.md` は配置しない。
このリポジトリでの作業にも、ホームに配置したグローバル設定を使用する。

既存の実ファイルや実ディレクトリは `install.sh` が上書きせずスキップする。
初回は対象を退避してから実行する。再実行時はリンクのみを更新する。

設定の配置は [OpenAI の設定ガイド](https://learn.chatgpt.com/docs/config-file/config-basic)を参照。

## 設計メモ

- **Ghostty と tmux のマウス**: `ghostty/config` は `mouse-reporting = false`（F2 でトグル可能）。
  tmux 側の `mouse on` は他ターミナルで使うための設定で、Ghostty 上では意図的に無効。
- **`claude/settings.json` の `skipDangerousModePermissionPrompt: true`**:
  `--dangerously-skip-permissions` 起動時の確認を省略する**危険側の設定**。
  このリポジトリを参考にする場合は各自の判断で外すこと。
- **ランタイム状態は追跡しない**: `lazygit/state.yml`・Zed の prompts DB などは
  `.gitignore` 済み。Claude Code が `settings.json` に書き込む一時キー
  （`model`・`feedbackSurveyState` 等）はコミット前に取り除く。
- **Anthropic 配布スキル（pptx/xlsx）**: ライセンス上再配布不可のため
  `.gitignore` 済み（ローカル利用のみ）。
