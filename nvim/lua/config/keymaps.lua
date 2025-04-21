local keymap = vim.keymap.set
local opts = { noremap = true, silent = true }

-- Common
keymap("i", "jk", "<ESC>", opts)
keymap("t", "jk", "<C-\\><C-n>")

-- Edit and source keymap.lua
keymap("n", "<Leader>ev", ":vsplit ~/.config/nvim/lua/config/keymaps.lua", opts)
keymap("n", "<Leader>sv", ":luafile ~/.config/nvim/lua/config/keymaps.lua", opts)

-- Edit
keymap("n", "-", "ddp", opts)
keymap("n", "+", "ddkP", opts)
keymap("n", "H", "0", opts)
keymap("n", "L", "$", opts)
keymap("n", "/", "/\\v", opts)
keymap("v", "<leader>c", [["*y]], opts)
keymap("n", "<leader>ac", [[gg"*yG]], opts)

-- Surround word or selection with quotes/brackets
local surround_map = {
  ['"'] = '"',
  ["'"] = "'",
  ["{"] = "}",
  ["["] = "]",
  ["("] = ")",
}

for key, closing in pairs(surround_map) do
  local opening = key
  -- Normal mode
  vim.keymap.set("n", "<Leader>" .. key, "viw<Esc>a" .. closing .. "<Esc>bi" .. opening .. "<Esc>lel", opts)
  -- Visual mode
  vim.keymap.set("v", "<Leader>" .. key, "<Esc>`>a" .. closing .. "<Esc>`<i" .. opening .. "<Esc>", opts)
end

-- Specific Language Settings {{{
-- JavaScript {{{
vim.api.nvim_create_autocmd("FileType", {
  pattern = "javascript",
  callback = function()
    vim.keymap.set("n", "<localleader>c", "I//<ESC>", { buffer = true })
  end,
})
--- }}}

-- Python {{{
vim.api.nvim_create_autocmd("FileType", {
  pattern = "python",
  callback = function()
    vim.keymap.set("n", "<localleader>c", "I#<ESC>", { buffer = true })
  end,
})
--- }}}

-- HTML {{{
vim.api.nvim_create_autocmd({ "BufNewFile", "BufRead" }, {
  pattern = "*.html",
  callback = function()
    vim.opt_local.wrap = false
  end,
})
--- }}}
--- }}}

-- grep
vim.keymap.set("n", "<leader>g", function()
  local word = vim.fn.expand("<cWORD>")
  vim.cmd("silent grep! -F " .. vim.fn.shellescape(word) .. " .")
  vim.cmd("copen")
end, { silent = true, desc = "Grep current word" })

vim.keymap.set("n", "<leader>n", [[<cmd>cnext<cr>]], { desc = "Next quickfix item" })
vim.keymap.set("n", "<leader>p", [[<cmd>cprevious<cr>]], { desc = "Previous quickfix item" })
