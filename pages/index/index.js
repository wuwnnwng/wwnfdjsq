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
  openToolItem,
  getToolById,
  markToolsHubSeen
} = require('../../utils/toolsConfig')

Page({
  data: {
    theme: getThemeId(),
    themeList: THEME_LIST,
    themeFading: false,
    keyword: '',
    groups: groupTools()
  },

  onLoad() {
    if (consumeShareEnter('pages/index/index')) return
    enableShareMenu()
    this.applyTheme(getThemeId())
  },

  onShow() {
    if (consumeShareEnter('pages/index/index')) return
    markToolsHubSeen()
    this.applyTheme(getThemeId())
    const keyword = this.data.keyword
    this.setData({
      groups: groupTools(keyword ? searchTools(keyword) : undefined)
    })
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
    return getShareAppMessage()
  },

  onShareTimeline() {
    return getShareTimeline()
  }
})
