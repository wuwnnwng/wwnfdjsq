/**
 * 流量主广告：Banner / 插屏 / 激励视频
 *
 * 页面调用方式：
 * - Banner：WXML 放 <ad-banner />（已在 app.json 全局注册）
 * - 插屏：指定页面进入后自动弹出，也可自行 createInterstitialAd + showInterstitialAd
 * - 激励：createRewardedAd 后用 unlockWithRewardedAd / showRewardedAd
 */

const AD_UNITS = {
  rewarded: 'adunit-9f40ccb3c8794921',
  interstitial: 'adunit-33f7a34759f42121',
  banner: 'adunit-a620656e31f21be1'
}

const INTERSTITIAL_ROUTES = {
  'pages/index/index': true,
  'pages/tools/mortgage/mortgage': true,
  'pages/tools/age/age': true,
  'pages/tools/tax/tax': true,
  'pages/tools/housetax/housetax': true,
  'packageTravel/pages/oilprice/oilprice': true,
  'packageTravel/pages/fuel/fuel': true
}

const INTERSTITIAL_DELAY_MS = 1200
const INTERSTITIAL_COOLDOWN_MS = 60 * 1000
const MIN_APP_AGE_MS = 2500

const appStartedAt = Date.now()
let lastInterstitialAt = 0

function normalizeRoute(route) {
  return String(route || '').replace(/^\//, '')
}

function getPageRoute(page) {
  return normalizeRoute((page && (page.route || page.__route__)) || '')
}

function hasApi(name) {
  return typeof wx !== 'undefined' && typeof wx[name] === 'function'
}

function destroyAd(ad) {
  try {
    if (ad && typeof ad.destroy === 'function') ad.destroy()
  } catch (e) {}
}

function createInterstitialAd() {
  if (!hasApi('createInterstitialAd')) return null
  try {
    const ad = wx.createInterstitialAd({ adUnitId: AD_UNITS.interstitial })
    if (ad && typeof ad.onError === 'function') {
      ad.onError(() => {})
    }
    return ad
  } catch (e) {
    return null
  }
}

function showInterstitialAd(ad) {
  if (!ad || typeof ad.show !== 'function') return Promise.resolve(false)
  return ad
    .show()
    .then(() => {
      lastInterstitialAt = Date.now()
      return true
    })
    .catch(() => false)
}

function cancelInterstitial(page) {
  if (!page || !page._interstitialTimer) return
  clearTimeout(page._interstitialTimer)
  page._interstitialTimer = null
}

function scheduleInterstitial(page) {
  cancelInterstitial(page)
  if (!page || !INTERSTITIAL_ROUTES[getPageRoute(page)] || !page._interstitialAd) return
  if (Date.now() - lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return

  const delay = Math.max(INTERSTITIAL_DELAY_MS, MIN_APP_AGE_MS - (Date.now() - appStartedAt))
  page._interstitialTimer = setTimeout(() => {
    page._interstitialTimer = null
    showInterstitialAd(page._interstitialAd)
  }, Math.max(0, delay))
}

function createRewardedAd() {
  if (!hasApi('createRewardedVideoAd')) return null
  try {
    const ad = wx.createRewardedVideoAd({ adUnitId: AD_UNITS.rewarded })
    if (ad && typeof ad.onError === 'function') {
      ad.onError(() => {})
    }
    return ad
  } catch (e) {
    return null
  }
}

function showRewardedAd(ad) {
  return new Promise((resolve) => {
    if (!ad || typeof ad.show !== 'function') {
      resolve({ granted: true, reason: 'fail' })
      return
    }

    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      try {
        if (typeof ad.offClose === 'function') ad.offClose(onClose)
      } catch (e) {}
      resolve(result)
    }

    const onClose = (res) => {
      finish({
        granted: !!(res && res.isEnded),
        reason: res && res.isEnded ? 'ended' : 'skip'
      })
    }

    try {
      if (typeof ad.offClose === 'function') ad.offClose(onClose)
    } catch (e) {}
    ad.onClose(onClose)

    const failOpen = () => finish({ granted: true, reason: 'fail' })
    ad.show()
      .catch(() => {
        if (typeof ad.load !== 'function') {
          failOpen()
          return Promise.reject()
        }
        return ad.load().then(() => ad.show())
      })
      .catch(failOpen)
  })
}

function hideLoadingQuietly() {
  try {
    wx.hideLoading()
  } catch (e) {}
}

function unlockWithRewardedAd(page, options) {
  if (page && page._rewardUnlocked) return Promise.resolve(true)

  const hint = (options && options.hint) || '看完视频后即可继续'
  wx.showLoading({ title: '加载广告', mask: true })
  const hideTimer = setTimeout(hideLoadingQuietly, 900)

  return showRewardedAd(page && page._rewardedAd).then((result) => {
    clearTimeout(hideTimer)
    hideLoadingQuietly()
    if (result.granted) {
      if (page) page._rewardUnlocked = true
      return true
    }
    wx.showToast({ title: hint, icon: 'none' })
    return false
  })
}

function wrapLifecycle(options, name, after) {
  const original = options[name]
  options[name] = function (arg) {
    after.call(this, arg)
    if (typeof original === 'function') return original.call(this, arg)
  }
}

function bindPageAds(options) {
  wrapLifecycle(options, 'onLoad', function () {
    if (INTERSTITIAL_ROUTES[getPageRoute(this)]) {
      this._interstitialAd = createInterstitialAd()
    }
  })
  wrapLifecycle(options, 'onShow', function () {
    if (!this._interstitialAd && INTERSTITIAL_ROUTES[getPageRoute(this)]) {
      this._interstitialAd = createInterstitialAd()
    }
    scheduleInterstitial(this)
  })
  wrapLifecycle(options, 'onHide', function () {
    cancelInterstitial(this)
  })
  wrapLifecycle(options, 'onUnload', function () {
    cancelInterstitial(this)
    destroyAd(this._interstitialAd)
    this._interstitialAd = null
  })
}

module.exports = {
  AD_UNITS,
  INTERSTITIAL_ROUTES,
  createInterstitialAd,
  showInterstitialAd,
  scheduleInterstitial,
  cancelInterstitial,
  createRewardedAd,
  showRewardedAd,
  unlockWithRewardedAd,
  destroyAd,
  bindPageAds
}
