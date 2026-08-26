const { searchTools, groupTools, markToolsHubSeen } = require('../../utils/toolsConfig')
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
    groups: groupTools()
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
      groups: groupTools(searchTools(keyword))
    })
  },

  onClearSearch() {
    this.setData({
      keyword: '',
      groups: groupTools()
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
