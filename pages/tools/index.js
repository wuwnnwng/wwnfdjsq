const { searchTools, groupTools, markToolsHubSeen, toggleFavoriteTool } = require('../../utils/toolsConfig')
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
    const keyword = this.data.keyword
    this.setData({
      theme,
      groups: groupTools(keyword ? searchTools(keyword) : undefined)
    })
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

  onToggleFavorite(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const result = toggleFavoriteTool(id)
    if (!result.ok) {
      wx.showToast({ title: result.message || '收藏失败', icon: 'none' })
      return
    }
    const keyword = this.data.keyword
    this.setData({
      groups: groupTools(keyword ? searchTools(keyword) : undefined)
    })
    wx.showToast({
      title: result.favorited ? '已收藏到首页' : '已取消收藏',
      icon: 'none'
    })
  },

  onShareAppMessage() {
    return getToolsHubShareAppMessage()
  },

  onShareTimeline() {
    return getToolsHubShareTimeline()
  }
})
