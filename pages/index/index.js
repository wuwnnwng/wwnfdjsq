const {
  enableShareMenu,
  getShareAppMessage,
  getShareTimeline,
  consumeShareEnter
} = require('../../utils/share')
const {
  getThemeId,
  getTheme,
  setThemeId,
  applyThemeChrome,
  THEME_LIST
} = require('../../utils/theme')
const {
  searchTools,
  groupTools,
  getFeaturedToolPages,
  flattenFeaturedToolIds,
  getFavoriteToolsKey,
  toggleFavoriteTool,
  openToolItem,
  getToolById,
  getHomeRandomTool,
  markToolsHubSeen
} = require('../../utils/toolsConfig')

Page({
  data: {
    theme: getThemeId(),
    themeList: THEME_LIST,
    themeFading: false,
    keyword: '',
    groups: groupTools(),
    featuredToolPages: getFeaturedToolPages(),
    toolsIndicator: getTheme(getThemeId()).principal,
    toolsSwiperCurrent: 0,
    toolsSwiperAutoplay: true,
    toolsSwiperKeys: [0]
  },

  onLoad() {
    if (consumeShareEnter('pages/index/index')) return
    enableShareMenu()
    this._favoriteToolsKey = getFavoriteToolsKey()
    this._featuredPagesKey = flattenFeaturedToolIds(this.data.featuredToolPages)
    this.applyTheme(getThemeId())
  },

  onShow() {
    if (consumeShareEnter('pages/index/index')) return
    markToolsHubSeen()
    this.applyTheme(getThemeId())
    const favoriteToolsKey = getFavoriteToolsKey()
    const featuredToolPages = getFeaturedToolPages()
    const pagesKey = flattenFeaturedToolIds(featuredToolPages)
    const keyword = this.data.keyword
    const patch = {
      groups: groupTools(keyword ? searchTools(keyword) : undefined)
    }
    if (pagesKey !== this._featuredPagesKey) {
      this._featuredPagesKey = pagesKey
      patch.featuredToolPages = featuredToolPages
    }
    if (favoriteToolsKey !== this._favoriteToolsKey) {
      this._favoriteToolsKey = favoriteToolsKey
      patch.toolsSwiperCurrent = 0
      patch.toolsSwiperKeys = [(this.data.toolsSwiperKeys[0] || 0) + 1]
    }
    if (!this.data.toolsSwiperAutoplay) {
      patch.toolsSwiperAutoplay = true
    }
    this.setData(patch)
  },

  onHide() {
    if (this.data.toolsSwiperAutoplay) {
      this.setData({ toolsSwiperAutoplay: false })
    }
  },

  onUnload() {
    if (this._themeFadeTimer) {
      clearTimeout(this._themeFadeTimer)
      this._themeFadeTimer = null
    }
  },

  applyTheme(themeId) {
    const theme = setThemeId(themeId)
    const palette = getTheme(theme)
    if (theme !== this.data.theme || this.data.toolsIndicator !== palette.principal) {
      this.setData({
        theme,
        toolsIndicator: palette.principal
      })
    }
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
      const palette = getTheme(next)
      this.setData({
        theme: next,
        toolsIndicator: palette.principal,
        themeFading: false
      })
      applyThemeChrome(next)
      this._themeFadeTimer = setTimeout(() => {
        this._themeSwitching = false
        this._themeFadeTimer = null
      }, 300)
    }, 300)
  },

  onFeaturedSwiperChange(e) {
    const current = e.detail && e.detail.current
    const source = e.detail && e.detail.source
    if (typeof current !== 'number' || current === this.data.toolsSwiperCurrent) return
    if (source && source !== 'autoplay' && source !== 'touch') return
    this.setData({ toolsSwiperCurrent: current })
  },

  onOpenFeaturedTool(e) {
    const id = e.currentTarget.dataset.id
    if (id === 'random') {
      openToolItem(getHomeRandomTool())
      return
    }
    const appId = e.currentTarget.dataset.appid
    const page = e.currentTarget.dataset.page
    openToolItem({
      id,
      page,
      miniProgramAppId: appId
    })
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

  onToggleFavorite(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const result = toggleFavoriteTool(id)
    if (!result.ok) {
      wx.showToast({ title: result.message || '收藏失败', icon: 'none' })
      return
    }
    const keyword = this.data.keyword
    const featuredToolPages = getFeaturedToolPages()
    this._favoriteToolsKey = getFavoriteToolsKey()
    this._featuredPagesKey = flattenFeaturedToolIds(featuredToolPages)
    this.setData({
      groups: groupTools(keyword ? searchTools(keyword) : undefined),
      featuredToolPages,
      toolsSwiperCurrent: 0,
      toolsSwiperKeys: [(this.data.toolsSwiperKeys[0] || 0) + 1]
    })
    wx.showToast({
      title: result.favorited ? '已收藏到轮播' : '已取消收藏',
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
