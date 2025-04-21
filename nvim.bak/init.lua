local opts = { noremap = true, silent = true}

-- VSCode
if vim.g.vscode then

else
vim.opt.relativenumber = true

-- Indentation
vim.opt.shiftround = true
vim.opt.shiftwidth = 4

-- Status line {{{
vim.opt.statusline = "%f%= %l/%L"
-- }}}

-- 折りたたみ設定 {{{
vim.opt.foldmethod = 'marker'  -- マーカー方式の折りたたみを使用
vim.opt.foldmarker = '{{{,}}}'  -- 折りたたみマーカーを設定
vim.opt.foldenable = true  -- 折りたたみを有効化
vim.opt.foldlevelstart = 0  -- ファイルを開いたときに全ての折りたたみを閉じる
-- }}}

-- Leader keys
vim.g.mapleader = ","
vim.g.maplocalleader = "\\"
vim.keymap.set("n", "\\", ",", opts)

-- Normal mode with jk
vim.keymap.set("i", "jk", "<Esc>", opts)
vim.keymap.set("i", "<Esc>", "<nop>", opts)

-- Disable arrow keys
for _, mode in ipairs({"n", "i"}) do
  for _, key in ipairs({"<Up>", "<Down>", "<Left>", "<Right>"}) do
    vim.keymap.set(mode, key, "<nop>", opts)
  end
end

-- Filetype settings
vim.cmd("filetype plugin on")
vim.cmd("filetype indent on")


-- Custom mappings
vim.keymap.set("n", "-", "ddp", opts)
vim.keymap.set("n", "+", "ddkP", opts)
vim.keymap.set("n", "H", "0", opts)
vim.keymap.set("n", "L", "$", opts)
vim.keymap.set("n", "/", "/\\v", opts)
vim.keymap.set("v", "<leader>c", [["*y]], opts)
vim.keymap.set("n", "<leader>ac", [[gg"*yG]], opts)

-- Edit and source init.lua
vim.keymap.set("n", "<Leader>ev", ":vsplit ~/.config/nvim/init.lua<CR>", opts)
vim.keymap.set('n', '<Leader>sv', 
":luafile ~/.config/nvim/init.lua<CR>"
, opts)

-- Toggle case of a word
vim.keymap.set("n", "<C-u>", "viwg~", opts)
vim.keymap.set("i", "<C-u>", "<Esc>viwg~ea", opts)

-- Surround word or selection with quotes/brackets
local surround_map = {
  ['"'] = '"',
  ["'"] = "'",
  ['{'] = '}',
  ['['] = ']',
  ['('] = ')'
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
  end
})
--- }}}

-- Python {{{
vim.api.nvim_create_autocmd("FileType", {
  pattern = "python",
  callback = function()
    vim.keymap.set("n", "<localleader>c", "I#<ESC>", { buffer = true })
  end
})
--- }}}

-- HTML {{{ 
vim.api.nvim_create_autocmd({"BufNewFile", "BufRead"}, {
  pattern = "*.html",
  callback = function()
    vim.opt_local.wrap = false
  end
})
--- }}}
--- }}}

-- grep
vim.keymap.set("n", "<leader>g", function()
    local word = vim.fn.expand("<cWORD>")
    vim.cmd("silent grep! -F " .. vim.fn.shellescape(word) .. " .")
    vim.cmd("copen")
end, {silent = true, desc = "Grep current word"})

vim.keymap.set("n", "<leader>n", [[<cmd>cnext<cr>]], {desc = "Next quickfix item"})
vim.keymap.set("n", "<leader>p", [[<cmd>cprevious<cr>]], {desc = "Previous quickfix item"})

end

