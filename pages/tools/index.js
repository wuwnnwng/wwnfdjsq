const { TOOLS, searchTools, markToolsHubSeen } = require('../../utils/toolsConfig')
const { getThemeId, applyThemeChrome } = require('../../utils/theme')
const {
  enableShareMenu,
  getToolsHubShareAppMessage,
  getToolsHubShareTimeline
} = require('../../utils/share')

Page({
  data: {
    theme: getThemeId(),
    keyword: '',
    tools: TOOLS
  },

  onLoad() {
    enableShareMenu()
  },

  onShow() {
    markToolsHubSeen()
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onSearch(e) {
    const keyword = (e.detail && e.detail.value) || ''
    this.setData({
      keyword,
      tools: searchTools(keyword)
    })
  },

  onClearSearch() {
    this.setData({
      keyword: '',
      tools: TOOLS
    })
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
