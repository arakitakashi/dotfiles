#!/usr/bin/env bash
# dotfiles セットアップスクリプト（冪等・macOS 用）
# 各設定ファイルをこのリポジトリへのシンボリックリンクとして配置する
set -euo pipefail

DOTFILES="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

link() {
  local src="$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  if [ -e "$dest" ] && [ ! -L "$dest" ]; then
    echo "SKIP: $dest は実ファイルとして存在します（手動で退避してください）"
    return
  fi
  ln -sfn "$src" "$dest"
  echo "LINK: $dest -> $src"
}

# zsh
link "$DOTFILES/shell/.zshrc" "$HOME/.zshrc"

# tmux
link "$DOTFILES/tmux/.tmux.conf" "$HOME/.tmux.conf"
link "$DOTFILES/tmux/.tmux.mac.conf" "$HOME/.tmux.mac.conf"
link "$DOTFILES/tmux/.tmux" "$HOME/.tmux"
# tpm はリポジトリに含めない（実行時に clone する）
if [ ! -d "$DOTFILES/tmux/.tmux/plugins/tpm" ]; then
  git clone https://github.com/tmux-plugins/tpm "$DOTFILES/tmux/.tmux/plugins/tpm"
fi

# Neovim
link "$DOTFILES/nvim" "$HOME/.config/nvim"

# Ghostty（macOS は Application Support 配下を読む）
link "$DOTFILES/ghostty/config" "$HOME/Library/Application Support/com.mitchellh.ghostty/config"

# lazygit（state.yml はランタイム状態のため .gitignore 済み）
link "$DOTFILES/lazygit" "$HOME/Library/Application Support/lazygit"

# VS Code
link "$DOTFILES/vscode/settings.json" "$HOME/Library/Application Support/Code/User/settings.json"
link "$DOTFILES/vscode/keybindings.json" "$HOME/Library/Application Support/Code/User/keybindings.json"

# Zed
link "$DOTFILES/zed/settings.json" "$HOME/.config/zed/settings.json"
link "$DOTFILES/zed/keymap.json" "$HOME/.config/zed/keymap.json"

# Claude Code（ユーザーレベル設定）
link "$DOTFILES/.claude/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
link "$DOTFILES/.claude/settings.json" "$HOME/.claude/settings.json"
link "$DOTFILES/.claude/rules" "$HOME/.claude/rules"
link "$DOTFILES/.claude/skills" "$HOME/.claude/skills"
link "$DOTFILES/.claude/agents" "$HOME/.claude/agents"
link "$DOTFILES/.claude/hooks" "$HOME/.claude/hooks"

echo "完了"
