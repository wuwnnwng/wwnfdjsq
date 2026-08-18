/**
 * 「添加到我的小程序」引导：叉掉或已添加后，本地记住，下次不再弹出。
 */
const { getTheme } = require('./theme')

const STORAGE_KEY = 'favorite_tip_dismissed_v1'

function isFavoriteTipDismissed() {
  try {
    return !!wx.getStorageSync(STORAGE_KEY)
  } catch (e) {
    return false
  }
}

function markFavoriteTipDismissed() {
  try {
    wx.setStorageSync(STORAGE_KEY, 1)
  } catch (e) {
    // ignore
  }
}

function checkIsAddedToMyMiniProgram() {
  return new Promise((resolve) => {
    if (!wx.canIUse || !wx.canIUse('checkIsAddedToMyMiniProgram')) {
      resolve(false)
      return
    }
    try {
      wx.checkIsAddedToMyMiniProgram({
        success(res) {
          resolve(!!(res && res.added))
        },
        fail() {
          resolve(false)
        }
      })
    } catch (e) {
      resolve(false)
    }
  })
}

/**
 * 是否应展示引导提示。
 * 已叉掉 / 已添加到「我的小程序」→ 不展示，并写入本地。
 */
async function shouldShowFavoriteTip() {
  if (isFavoriteTipDismissed()) return false

  const added = await checkIsAddedToMyMiniProgram()
  if (added) {
    markFavoriteTipDismissed()
    return false
  }
  return true
}

function pxToRpx(px, windowWidth) {
  return Math.round((px * 750) / windowWidth)
}

function getWindowMetrics() {
  if (wx.getWindowInfo) return wx.getWindowInfo()
  if (wx.getSystemInfoSync) return wx.getSystemInfoSync()
  return null
}

/**
 * 按右上角胶囊按钮（··· / 分享入口）计算提示位置与主题色。
 * position / top / right 必须写在内联 rpx 中，否则 fixed 易失效并落进页面内容流。
 */
function getFavoriteTipLayout(themeId) {
  try {
    const theme = getTheme(themeId)
    const navBar = theme.navBar
    const sys = getWindowMetrics()
    const ww = sys && sys.windowWidth
    if (!ww) {
      return {
        favoriteTipStyle: '',
        favoriteArrowStyle: '',
        favoriteTipCardStyle: ''
      }
    }

    const rect = wx.getMenuButtonBoundingClientRect
      ? wx.getMenuButtonBoundingClientRect()
      : null
    const statusBar = (sys && sys.statusBarHeight) || 44
    const menuTop = (rect && rect.top) || statusBar + 6
    const menuHeight = (rect && rect.height) || 32
    const menuBottom = (rect && rect.bottom) || menuTop + menuHeight
    const menuRight = (rect && rect.right) || ww - 10
    const menuLeft = (rect && rect.left) || menuRight - 87
    const menuWidth = (rect && rect.width) || menuRight - menuLeft

    const tipTopRpx = pxToRpx(menuBottom + 8, ww)
    const tipRightRpx = pxToRpx(Math.max(8, ww - menuRight), ww)
    const arrowRightRpx = pxToRpx(Math.max(12, menuWidth / 2 - 10), ww)

    return {
      favoriteTipStyle: `position:fixed;top:${tipTopRpx}rpx;right:${tipRightRpx}rpx;z-index:10000;`,
      favoriteArrowStyle: `margin-right:${arrowRightRpx}rpx;color:${navBar};`,
      favoriteTipCardStyle: `background-color:${navBar};`
    }
  } catch (e) {
    return {
      favoriteTipStyle: '',
      favoriteArrowStyle: '',
      favoriteTipCardStyle: ''
    }
  }
}

module.exports = {
  STORAGE_KEY,
  shouldShowFavoriteTip,
  markFavoriteTipDismissed,
  getFavoriteTipLayout
}
