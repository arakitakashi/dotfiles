require("config.options")
if vim.fn.has("unix") == 1 and vim.fn.system("uname -a"):match("Ubuntu") then
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
