const { TOOLS } = require('../../utils/toolsConfig')
const { getThemeId, applyThemeChrome } = require('../../utils/theme')
const {
  enableShareMenu,
  getToolsHubShareAppMessage,
  getToolsHubShareTimeline
} = require('../../utils/share')

Page({
  data: {
    theme: getThemeId(),
    tools: TOOLS
  },

  onLoad() {
    enableShareMenu()
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
  },

  onShareAppMessage() {
    return getToolsHubShareAppMessage()
  },

  onShareTimeline() {
    return getToolsHubShareTimeline()
  }
})
