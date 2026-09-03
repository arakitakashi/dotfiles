# Neovim 設定

[LazyVim](https://github.com/LazyVim/LazyVim) ベースの個人設定。
プラグインのバージョンは `lazy-lock.json` で固定している。

## 主なカスタマイズ

- **tmux 連携**: vim-tmux-navigator で `<C-h/j/k/l>` によるペイン移動を tmux と統一
  （`<C-\>` は toggleterm に割当）
- **toggleterm**: `<C-\>` でターミナルをトグル
- **Haskell**: haskell-tools.nvim（LazyVim extra + `vim.g.haskell_tools` の追加設定）、
  Haskell バッファ限定のキーマップ（hoogle 検索・REPL・型シグネチャ挿入）
- **Rust**: rustaceanvim + clippy（LazyVim rust extra を `default_settings` で拡張）
- **snacks.nvim**: picker のサイドバー幅、hidden/ignored ファイルの表示
- **Ubuntu 分岐**: `init.lua` は Ubuntu ではプラグインなしの最小構成で起動する
