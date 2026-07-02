return {
  "mrcjkb/haskell-tools.nvim",
  ft = { "haskell", "lhaskell", "cabal", "cabalproject" },
  -- config だと LazyVim haskell extra の config（telescope "ht" 拡張のロード）を
  -- 置き換えてしまうため、公式推奨どおり init で vim.g.haskell_tools を設定する
  init = function()
    vim.g.haskell_tools = {
      hls = {
        settings = {
          haskell = {
            plugin = {
              importLens = {
                globalOn = false,
                codeLensOn = false,
                codeActionsOn = false,
              },
            },
          },
        },
      },
    }
  end,
}
