const {
  enableShareMenu,
  getShareAppMessage,
  getShareTimeline,
  consumeShareEnter
} = require('../../utils/share')
const {
  getThemeId,
  setThemeId,
  applyThemeChrome,
  THEME_LIST
} = require('../../utils/theme')
const {
  searchTools,
  groupTools,
  getRecommendTools,
  toggleFavoriteTool,
  openToolItem,
  getToolById,
  markToolsHubSeen
} = require('../../utils/toolsConfig')

function splitGroups(groups) {
  const index = (groups || []).findIndex((group) => group.id === 'fun')
  if (index < 0) return { leadGroups: groups || [], restGroups: [] }
  return {
    leadGroups: groups.slice(0, index + 1),
    restGroups: groups.slice(index + 1)
  }
}

function buildHome(keyword) {
  const text = String(keyword || '')
  const groups = groupTools(text.trim() ? searchTools(text) : undefined)
  const split = splitGroups(groups)
  const searching = !!text.trim()
  return {
    keyword: text,
    recommendTools: searching ? [] : getRecommendTools(),
    leadGroups: split.leadGroups,
    restGroups: split.restGroups,
    showSplitBanner: split.restGroups.length > 0 && split.leadGroups.some((group) => group.id === 'fun')
  }
}

Page({
  data: {
    theme: getThemeId(),
    themeList: THEME_LIST,
    themeFading: false,
    keyword: '',
    recommendTools: getRecommendTools(),
    leadGroups: [],
    restGroups: [],
    showSplitBanner: false
  },

  onLoad() {
    if (consumeShareEnter('pages/index/index')) return
    enableShareMenu()
    this.applyTheme(getThemeId())
    this.setData(buildHome(''))
  },

  onShow() {
    if (consumeShareEnter('pages/index/index')) return
    markToolsHubSeen()
    this.applyTheme(getThemeId())
    this.setData(buildHome(this.data.keyword))
  },

  onUnload() {
    if (this._themeFadeTimer) {
      clearTimeout(this._themeFadeTimer)
      this._themeFadeTimer = null
    }
  },

  applyTheme(themeId) {
    const theme = setThemeId(themeId)
    if (theme !== this.data.theme) this.setData({ theme })
    applyThemeChrome(theme)
  },

  onThemeChange(e) {
    const theme = e.currentTarget.dataset.theme
    if (!theme || theme === this.data.theme || this._themeSwitching) return
    this._themeSwitching = true
    this.setData({ themeFading: true })
    if (this._themeFadeTimer) clearTimeout(this._themeFadeTimer)
    this._themeFadeTimer = setTimeout(() => {
      const next = setThemeId(theme)
      this.setData({
        theme: next,
        themeFading: false
      })
      applyThemeChrome(next)
      this._themeFadeTimer = setTimeout(() => {
        this._themeSwitching = false
        this._themeFadeTimer = null
      }, 300)
    }, 300)
  },

  onSearch(e) {
    const keyword = (e.detail && e.detail.value) || ''
    this.setData(buildHome(keyword))
  },

  onClearSearch() {
    this.setData(buildHome(''))
  },

  onOpenTool(e) {
    const id = e.currentTarget.dataset.id
    openToolItem(getToolById(id) || {
      page: e.currentTarget.dataset.page,
      miniProgramAppId: e.currentTarget.dataset.appid
    })
  },

  onToggleFavorite(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const result = toggleFavoriteTool(id)
    if (!result.ok) {
      wx.showToast({ title: result.message || '收藏失败', icon: 'none' })
      return
    }
    this.setData(buildHome(this.data.keyword))
    wx.showToast({
      title: result.favorited ? '已放到推荐最前' : '已取消收藏',
      icon: 'none'
    })
  },

  onShareAppMessage() {
    return getShareAppMessage()
  },

  onShareTimeline() {
    return getShareTimeline()
  }
})
