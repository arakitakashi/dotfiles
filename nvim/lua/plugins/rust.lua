return {
  -- Conform.nvim: フォーマッター設定
  {
    "stevearc/conform.nvim",
    opts = function(_, opts)
      opts.formatters_by_ft = opts.formatters_by_ft or {}
      opts.formatters_by_ft.rust = { "rustfmt" }
      
      -- 保存時自動フォーマット
      opts.format_on_save = {
        timeout_ms = 500,
        lsp_fallback = true,
      }
      
      return opts
    end,
  },

  -- Rustaceanvim: Rust LSP設定
  {
    "mrcjkb/rustaceanvim",
    version = "^5",
    lazy = false,
    opts = {
      server = {
        on_attach = function(client, bufnr)
          -- 必要に応じて追加設定
        end,
        default_settings = {
          ["rust-analyzer"] = {
            cargo = {
              allFeatures = true,
              loadOutDirsFromCheck = true,
              runBuildScripts = true,
            },
            checkOnSave = {
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