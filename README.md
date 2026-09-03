# dotfiles

macOS 用の個人設定ファイル群。`install.sh` が各設定をこのリポジトリへの
シンボリックリンクとして配置する。

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
| `.claude/` | Claude Code のユーザーレベル設定・スキル・フック | `~/.claude/` |

## 設計メモ

- **Ghostty と tmux のマウス**: `ghostty/config` は `mouse-reporting = false`（F2 でトグル可能）。
  tmux 側の `mouse on` は他ターミナルで使うための設定で、Ghostty 上では意図的に無効。
- **`.claude/settings.json` の `skipDangerousModePermissionPrompt: true`**:
  `--dangerously-skip-permissions` 起動時の確認を省略する**危険側の設定**。
  このリポジトリを参考にする場合は各自の判断で外すこと。
- **ランタイム状態は追跡しない**: `lazygit/state.yml`・Zed の prompts DB などは
  `.gitignore` 済み。Claude Code が `settings.json` に書き込む一時キー
  （`model`・`feedbackSurveyState` 等）はコミット前に取り除く。
- **Anthropic 配布スキル（pptx/xlsx）**: ライセンス上再配布不可のため
  `.gitignore` 済み（ローカル利用のみ）。
