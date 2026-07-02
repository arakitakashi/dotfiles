return {
  "folke/snacks.nvim",
  ---@type snacks.Config
  opts = {
    picker = {
      hidden = true,
      ignored = true,
      layouts = {
        sidebar = {
          layout = {
            width = 30,
            min_width = 30,
          },
        },
      },
    },
  },
}
