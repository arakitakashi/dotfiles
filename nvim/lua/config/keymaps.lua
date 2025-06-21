local keymap = vim.keymap.set
local opts = { noremap = true, silent = true }

-- Common
keymap("i", "jk", "<ESC>", opts)
keymap("t", "jk", "<C-\\><C-n>")

-- Edit and source keymap.lua
keymap("n", "<Leader>km", ":vsplit ~/.config/nvim/lua/config/keymaps.lua<CR>", opts)
keymap("n", "<Leader>sk", ":luafile ~/.config/nvim/lua/config/keymaps.lua<CR>", opts)

-- Edit
keymap("n", "-", "ddp", opts)
keymap("n", "+", "ddkP", opts)
keymap("n", "/", "/\\v", opts)
keymap("v", "<leader>c", [["*y]], opts)
keymap("n", "<leader>ac", [[gg"*yG]], opts)
keymap("i", "<C-f>", "<Right>")

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

--- Haskell {{{
vim.api.nvim_create_autocmd("FileType", {
  pattern = "haskell",
  callback = function()
    -- haskell-tools
    local ht = require("haskell-tools")
    vim.keymap.set("n", "<leader>hs", ht.hoogle.hoogle_signature, opts)
    vim.keymap.set("n", "<leader>rr", ht.repl.toggle, opts)
    vim.keymap.set("n", "<leader>rq", ht.repl.quit, opts)
    -- set function
    vim.keymap.set("i", "<C-u>", function()
      local line = vim.api.nvim_get_current_line()
      local func_name = string.match(line, "^%s*(%w+)")

      if not func_name then
        vim.notify("関数名が見つかりません", vim.log.levels.ERROR)
        return
      end

      local current_line = vim.api.nvim_win_get_cursor(0)[1]
      vim.api.nvim_buf_set_lines(0, current_line - 1, current_line, false, {
        func_name .. " :: ",
        func_name .. " ",
      })

      vim.api.nvim_win_set_cursor(0, { current_line, #func_name + 4 })
    end, { buffer = true, desc = "Haskell function signature" })
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
