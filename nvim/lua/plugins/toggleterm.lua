return {
  {
    "akinsho/toggleterm.nvim",
    version = "*",
    lazy = true,
    cmd = { "ToggleTerm" },
    keys = {
      {
        "<leader>Tf",
        function()
          local count = vim.v.count1
          require("toggleterm").toggle(count, 0, LazyVim.root.get(), "float")
        end,
        desc = "ToggleTerm (float root_dir)",
      },
      {
        "<D-j>",
        function()
          local count = vim.v.count1
          require("toggleterm").toggle(count, 15, vim.fn.getcwd(), "horizontal")
        end,
        desc = "ToggleTerm (horizontal current_dir)",
      },
      {
        "<D-k>",
        function()
          local count = vim.v.count1
          require("toggleterm").toggle(count, vim.o.columns * 0.4, vim.fn.getcwd(), "vertical")
        end,
        desc = "ToggleTerm (vertical root_dir)",
      },
      {
        "<leader>Th",
        function()
          local count = vim.v.count1
          require("toggleterm").toggle(count, 15, LazyVim.root.get(), "horizontal")
        end,
        desc = "ToggleTerm (horizontal root_dir)",
      },
      {
        "<leader>Tv",
        function()
          local count = vim.v.count1
          require("toggleterm").toggle(count, vim.o.columns * 0.4, LazyVim.root.get(), "vertical")
        end,
        desc = "ToggleTerm (vertical root_dir)",
      },
      {
        "<leader>Tn",
        "<cmd>ToggleTermSetName<cr>",
        desc = "Set term name",
      },
      {
        "<leader>Ts",
        "<cmd>TermSelect<cr>",
        desc = "Select term",
      },
      {
        "<leader>Tt",
        function()
          require("toggleterm").toggle(1, 100, LazyVim.root.get(), "tab")
        end,
        desc = "ToggleTerm (tab root_dir)",
      },
      {
        "<leader>TT",
        function()
          require("toggleterm").toggle(1, 100, vim.fn.getcwd(), "tab")
        end,
        desc = "ToggleTerm (tab cwd_dir)",
      },
    },
    opts = {
      size = function(term)
        if term.direction == "horizontal" then
          return 15
        elseif term.direction == "vertical" then
          return vim.o.columns * 0.4
        end
      end,
      open_mapping = [[<c-\>]],
      hide_numbers = true,
      shade_terminals = true,
      start_in_insert = true,
      insert_mappings = true, -- whether or not the open mapping applies in insert mode
      terminal_mappings = true, -- whether or not the open mapping applies in the opened terminals
      persist_size = true,
      direction = "horizontal",
      close_on_exit = true, -- close the terminal window when the process exits
    },
  },
}
