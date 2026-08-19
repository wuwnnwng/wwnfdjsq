const { TOOLS } = require('../../utils/toolsConfig')
const { getThemeId, applyThemeChrome } = require('../../utils/theme')

Page({
  data: {
    theme: getThemeId(),
    tools: TOOLS
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onOpenTool(e) {
    const page = e.currentTarget.dataset.page
    if (!page) return
    wx.navigateTo({ url: page })
  }
})
