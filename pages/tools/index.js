const { searchTools, groupTools, markToolsHubSeen, openToolItem, getToolById } = require('../../utils/toolsConfig')
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
    const id = e.currentTarget.dataset.id
    openToolItem(getToolById(id) || {
      page: e.currentTarget.dataset.page,
      miniProgramAppId: e.currentTarget.dataset.appid
    })
  },

  onShareAppMessage() {
    return getToolsHubShareAppMessage()
  },

  onShareTimeline() {
    return getToolsHubShareTimeline()
  }
})
