/**
 * 本地版本号：仅当「计算缓存结构」变化时手动递增，与普通发版无关。
 * 注意：这与微信后台发布的小程序版本号不是同一个概念。
 * 「我的方案」属于用户数据，任何情况下都不得清理。
 */
const {
  STORAGE_KEY: PLANS_STORAGE_KEY,
  BACKUP_STORAGE_KEY,
  backupPlans,
  restorePlansIfMissing
} = require('./plans')

const APP_VERSION = '1.0.5'
const VERSION_STORAGE_KEY = 'app_version'

/** 版本升级时可清理的计算缓存（严禁包含用户方案） */
const CLEAR_KEYS_ON_UPGRADE = ['mortgageResult']

/** 永不允许 removeStorageSync 的 key */
const PROTECTED_STORAGE_KEYS = [PLANS_STORAGE_KEY, BACKUP_STORAGE_KEY, VERSION_STORAGE_KEY]

function getStoredVersion() {
  try {
    return wx.getStorageSync(VERSION_STORAGE_KEY) || ''
  } catch (e) {
    return ''
  }
}

function setStoredVersion(version) {
  try {
    wx.setStorageSync(VERSION_STORAGE_KEY, version)
  } catch (e) {
    // ignore
  }
}

function isProtectedKey(key) {
  return PROTECTED_STORAGE_KEYS.indexOf(key) >= 0
}

function clearLegacyStorage() {
  backupPlans()

  CLEAR_KEYS_ON_UPGRADE.forEach((key) => {
    if (isProtectedKey(key)) return
    try {
      wx.removeStorageSync(key)
    } catch (e) {
      // ignore
    }
  })

  restorePlansIfMissing()
}

/**
 * 对比本地版本：首次安装写入版本；版本变化时仅清理计算缓存。
 * @returns {{ upgraded: boolean, from: string, to: string }}
 */
function checkLocalVersion() {
  restorePlansIfMissing()

  const previous = getStoredVersion()

  if (!previous) {
    backupPlans()
    setStoredVersion(APP_VERSION)
    return { upgraded: false, from: '', to: APP_VERSION }
  }

  if (previous === APP_VERSION) {
    return { upgraded: false, from: previous, to: APP_VERSION }
  }

  clearLegacyStorage()
  setStoredVersion(APP_VERSION)
  return { upgraded: true, from: previous, to: APP_VERSION }
}

/**
 * 检查微信小程序更新包：有新版本则下载，并提示用户重启应用。
 */
function checkMiniProgramUpdate() {
  if (!wx.canIUse || !wx.canIUse('getUpdateManager')) return

  const updateManager = wx.getUpdateManager()

  updateManager.onCheckForUpdate((res) => {
    if (res.hasUpdate) {
      console.log('[update] 发现新版本，开始下载')
    }
  })

  updateManager.onUpdateReady(() => {
    wx.showModal({
      title: '发现新版本',
      content: '新版本已准备好，是否立即重启以完成更新？',
      confirmText: '立即更新',
      cancelText: '稍后',
      success(res) {
        if (res.confirm) {
          backupPlans()
          updateManager.applyUpdate()
        }
      }
    })
  })

  updateManager.onUpdateFailed(() => {
    wx.showModal({
      title: '更新失败',
      content:
        '新版本下载失败，请检查网络后重新打开，或稍后再试。请勿删除小程序，以免丢失已保存的方案。',
      showCancel: false
    })
  })
}

module.exports = {
  APP_VERSION,
  checkLocalVersion,
  checkMiniProgramUpdate
}
