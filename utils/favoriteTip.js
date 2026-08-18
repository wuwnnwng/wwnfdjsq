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

function getWindowMetrics() {
  if (wx.getWindowInfo) return wx.getWindowInfo()
  if (wx.getSystemInfoSync) return wx.getSystemInfoSync()
  return null
}

/**
 * 按右上角胶囊（··· / 分享到朋友圈）计算提示位置，单位 px（与 API 坐标系一致）。
 * 外层用全屏 fixed 容器，内层 absolute + px，避免 fixed 内联 rpx 失效后落到页面内容区。
 */
function getFavoriteTipLayout(themeId) {
  const theme = getTheme(themeId)
  const navBar = theme.navBar

  try {
    const sys = getWindowMetrics()
    const ww = sys && sys.windowWidth
    if (!ww) {
      return {
        favoriteTipTop: 0,
        favoriteTipRight: 0,
        favoriteArrowRight: 0,
        favoriteTipColor: navBar
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

    return {
      favoriteTipTop: Math.round(menuBottom + 8),
      favoriteTipRight: Math.round(Math.max(8, ww - menuRight)),
      favoriteArrowRight: Math.round(Math.max(12, menuWidth / 2 - 10)),
      favoriteTipColor: navBar
    }
  } catch (e) {
    return {
      favoriteTipTop: 0,
      favoriteTipRight: 0,
      favoriteArrowRight: 0,
      favoriteTipColor: navBar
    }
  }
}

module.exports = {
  STORAGE_KEY,
  shouldShowFavoriteTip,
  markFavoriteTipDismissed,
  getFavoriteTipLayout
}
