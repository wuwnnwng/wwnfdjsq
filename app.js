const { checkLocalVersion, checkMiniProgramUpdate } = require('./utils/version')
const { getThemeId } = require('./utils/theme')
const { rememberShareLanding, rewriteShareLaunchRoute } = require('./utils/share')
const { bindPageAds } = require('./utils/ads')

if (!Page.__wwnWrapped) {
  const originalPage = Page
  Page = function (config) {
    const options = config || {}
    bindPageAds(options)
    const originalOnLoad = options.onLoad
    options.onLoad = function (query) {
      try {
        rememberShareLanding(this.route)
      } catch (e) {}
      if (typeof originalOnLoad === 'function') {
        return originalOnLoad.call(this, query)
      }
    }
    return originalPage(options)
  }
  Page.__wwnWrapped = true
}

if (typeof wx.onBeforeAppRoute === 'function' && !wx.__wwnBeforeAppRoute) {
  wx.__wwnBeforeAppRoute = true
  wx.onBeforeAppRoute((res) => {
    try {
      rewriteShareLaunchRoute(res)
    } catch (e) {}
  })
}

App({
  globalData: {
    theme: 'forest',
    enterOptions: null
  },

  onLaunch(options) {
    this.globalData.enterOptions = options || null
    this.globalData.theme = getThemeId()

    const versionInfo = checkLocalVersion()
    if (versionInfo.upgraded) {
      console.log(
        `[version] 本地版本已从 ${versionInfo.from} 升级到 ${versionInfo.to}，已清理计算缓存并保留我的方案`
      )
    }

    // 正式版/体验版：自动检查微信后台是否有新版本包
    checkMiniProgramUpdate()
  },

  onShow(options) {
    if (options && (options.path || (options.query && Object.keys(options.query).length))) {
      this.globalData.enterOptions = options
    }
  }
})
