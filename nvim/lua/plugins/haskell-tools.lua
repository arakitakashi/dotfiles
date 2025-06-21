return {
  "mrcjkb/haskell-tools.nvim",
  version = "^3",
  ft = { "haskell", "lhaskell", "cabal", "cabalproject" },
  config = function()
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
