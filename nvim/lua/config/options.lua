vim.g.mapleader = " "
vim.g.maplocalleader = "\\"

local opt = vim.opt

opt.tabstop = 4

-- Folding {{{
vim.opt.foldmethod = "marker" -- マーカー方式の折りたたみを使用
vim.opt.foldmarker = "{{{,}}}" -- 折りたたみマーカーを設定
vim.opt.foldenable = true -- 折りたたみを有効化
vim.opt.foldlevelstart = 0 -- ファイルを開いたときに全ての折りたたみを閉じる
-- }}}
