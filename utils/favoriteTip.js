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

module.exports = {
  STORAGE_KEY,
  shouldShowFavoriteTip,
  markFavoriteTipDismissed
}
