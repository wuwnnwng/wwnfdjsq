/**
 * 「添加到我的小程序」引导：叉掉或已添加后，本地记住，下次不再弹出。
 */
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
 * 按右上角胶囊按钮（··· / 分享朋友圈入口）计算提示位置。
 * 必须使用 rpx：view / cover-view 的内联 px 在部分机型上会被忽略，导致提示落在页面内容区。
 */
function getFavoriteTipLayout() {
  try {
    const sys = getWindowMetrics()
    const ww = sys && sys.windowWidth
    if (!ww) {
      return {
        favoriteTipStyle: '',
        favoriteArrowStyle: ''
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

    const tipTopRpx = pxToRpx(menuBottom + 6, ww)
    const tipRightRpx = pxToRpx(Math.max(10, ww - menuRight), ww)
    const arrowRightRpx = pxToRpx(Math.max(12, menuWidth / 2 - 8), ww)

    return {
      favoriteTipStyle: `top:${tipTopRpx}rpx;right:${tipRightRpx}rpx;`,
      favoriteArrowStyle: `margin-right:${arrowRightRpx}rpx;`
    }
  } catch (e) {
    return {
      favoriteTipStyle: '',
      favoriteArrowStyle: ''
    }
  }
}

module.exports = {
  STORAGE_KEY,
  shouldShowFavoriteTip,
  markFavoriteTipDismissed,
  getFavoriteTipLayout
}
