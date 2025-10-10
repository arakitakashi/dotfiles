export LANG=en_US.UTF-8

# Disable OSC sequences in tmux
if [[ -n "$TMUX" ]]; then
  export TERM=screen-256color
  # Prevent zsh from querying terminal colors
  unset zle_bracketed_paste
  PROMPT_EOL_MARK=''
fi

# Disable terminal color queries globally
typeset -g POWERLEVEL9K_TERM_SHELL_INTEGRATION=false

# general alias
alias pn="pnpm"
# nvim
alias vi="nvim"
alias vin="nvim -u NONE"
alias view="nvim -R" 

# tmux
if [[ -z "$TMUX_PANE" && -z "$VSCODE_INJECTION" && "$TEAM_PROGRAM" != "vscode" ]]; then
  session_name="${USER}-$(date +%s)"
  tmux new-session -A -s "$session_name"
fi

# # Add git branch if its present to PS1
# parse_git_branch() {
#  git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/(\1)/'
# }
# if [ "$color_prompt" = yes ]; then
#  PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[01;31m\]$(parse_git_branch)\[\033[00m\]\$ '
# else
#  PS1='${debian_chroot:+($debian_chroot)}\u@\h:\w$(parse_git_branch)\$ '
# fi

PS1='[%n] %~ $ '
export PATH=$PATH:~/.bin

# pnpm
export PNPM_HOME="/Users/arakitakashi/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end

[ -f "/Users/arakitakashi/.ghcup/env" ] && . "/Users/arakitakashi/.ghcup/env" # ghcup-envexport PATH="/Users/arakitakashi/.local/bin:$PATH"

if command -v stack >/dev/null 2>&1; then
  export PATH="/Users/arakitakashi/.stack/programs/aarch64-osx/ghc-9.6.6/bin:$PATH"
  export PATH="/Users/arakitakashi/.local/bin:$PATH"
  export PATH=$(stack path --local-bin):$PATH
fi

export PATH=/usr/local/mysql/bin:$PATH
export PATH=$PATH:/opt/homebrew/Cellar/postgresql@17/17.5/bin
export PATH=$HOME/go/bin:$PATH
eval "$(~/.local/bin/mise activate zsh)"
