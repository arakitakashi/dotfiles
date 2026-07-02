require("config.options")
-- Ubuntu ではプラグインを使わない最小構成（外部プロセスを起動しない判定）
if vim.uv.os_uname().version:match("Ubuntu") then
  require("config.keymaps")
else
  require("config.lazy")
  vim.api.nvim_create_autocmd("User", {
    pattern = "VeryLazy",
    callback = function()
      require("config.autocmds")
      require("config.keymaps")
    end,
  })
end
