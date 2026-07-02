return {
  -- Conform.nvim: フォーマッター設定
  -- 保存時フォーマットは LazyVim の autoformat が担うため format_on_save は設定しない
  {
    "stevearc/conform.nvim",
    opts = function(_, opts)
      opts.formatters_by_ft = opts.formatters_by_ft or {}
      opts.formatters_by_ft.rust = { "rustfmt" }
      return opts
    end,
  },

  -- Rustaceanvim: Rust LSP設定
  -- on_attach は定義しない（LazyVim rust extra のキーマップを潰さないため）
  {
    "mrcjkb/rustaceanvim",
    lazy = false,
    opts = {
      server = {
        default_settings = {
          ["rust-analyzer"] = {
            cargo = {
              allFeatures = true,
              buildScripts = { enable = true },
            },
            check = {
              allFeatures = true,
              command = "clippy",
              extraArgs = { "--no-deps" },
            },
            procMacro = {
              enable = true,
              ignored = {
                ["async-trait"] = { "async_trait" },
                ["napi-derive"] = { "napi" },
                ["async-recursion"] = { "async_recursion" },
              },
            },
          },
        },
      },
    },
  },
}

