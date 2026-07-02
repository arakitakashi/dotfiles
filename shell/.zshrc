export LANG=en_US.UTF-8

# Disable OSC sequences in tmux
if [[ -n "$TMUX" ]]; then
  export TERM=tmux-256color
  # Prevent zsh from querying terminal colors
  unset zle_bracketed_paste
  PROMPT_EOL_MARK=''
fi

# general alias
alias pn="pnpm"
# nvim
alias vi="nvim"
alias vin="nvim -u NONE"
alias view="nvim -R"
# cc はシステムの C コンパイラを隠すため cl を使う
alias cl="claude --dangerously-skip-permissions"
alias gw="git worktree"

# tmux: main セッションに接続（なければ作成）
if command -v tmux >/dev/null 2>&1 \
  && [[ -z "$TMUX_PANE" && -z "$VSCODE_INJECTION" && "$TEAM_PROGRAM" != "vscode" ]]; then
  tmux new-session -A -s main
fi

PS1='[%n] %~ $ '
export PATH=$PATH:~/.bin

# pnpm
export PNPM_HOME="$HOME/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end

# ghcup-env
[ -f "$HOME/.ghcup/env" ] && . "$HOME/.ghcup/env"
export PATH="$HOME/.local/bin:$PATH"

if command -v stack >/dev/null 2>&1; then
  export PATH="$HOME/.stack/programs/aarch64-osx/ghc-9.6.6/bin:$PATH"
  export PATH=$(stack path --local-bin):$PATH
fi

export PATH=/usr/local/mysql/bin:$PATH
# opt/ 配下は brew が管理するバージョン非依存のシンボリックリンク
export PATH=$PATH:/opt/homebrew/opt/postgresql@17/bin
export PATH=$HOME/go/bin:$PATH
eval "$(~/.local/bin/mise activate zsh)"

# bun completions
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# The next line updates PATH for the Google Cloud SDK.
if [ -f "$HOME/google-cloud-sdk/path.zsh.inc" ]; then . "$HOME/google-cloud-sdk/path.zsh.inc"; fi

# The next line enables shell command completion for gcloud.
if [ -f "$HOME/google-cloud-sdk/completion.zsh.inc" ]; then . "$HOME/google-cloud-sdk/completion.zsh.inc"; fi
