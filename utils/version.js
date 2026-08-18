/**
 * 本地版本号：结构或缓存规则有变更时，递增此版本即可自动清理旧数据。
 * 注意：这与微信后台发布的小程序版本号不是同一个概念。
 * 「我的方案」属于用户数据，升级时必须保留，不得列入清理列表。
 */
const { STORAGE_KEY: PLANS_STORAGE_KEY } = require('./plans')
const { STORAGE_KEY: FAVORITE_TIP_STORAGE_KEY } = require('./favoriteTip')

const APP_VERSION = '1.0.5'
const VERSION_STORAGE_KEY = 'app_version'

/** 版本升级时需要清理的本地缓存 key（计算缓存等，不含用户方案） */
const CLEAR_KEYS_ON_UPGRADE = ['mortgageResult']

/** 版本升级时必须保留的用户数据 */
const KEEP_KEYS_ON_UPGRADE = [PLANS_STORAGE_KEY, FAVORITE_TIP_STORAGE_KEY]

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

function snapshotKeepKeys() {
  const snapshot = {}
  KEEP_KEYS_ON_UPGRADE.forEach((key) => {
    try {
      snapshot[key] = wx.getStorageSync(key)
    } catch (e) {
      // ignore
    }
  })
  return snapshot
}

function restoreKeepKeys(snapshot) {
  KEEP_KEYS_ON_UPGRADE.forEach((key) => {
    const value = snapshot[key]
    if (value === '' || value === undefined) return
    try {
      wx.setStorageSync(key, value)
    } catch (e) {
      // ignore
    }
  })
}

function clearLegacyStorage() {
  const preserved = snapshotKeepKeys()
  CLEAR_KEYS_ON_UPGRADE.forEach((key) => {
    if (KEEP_KEYS_ON_UPGRADE.indexOf(key) >= 0) return
    try {
      wx.removeStorageSync(key)
    } catch (e) {
      // ignore
    }
  })
  restoreKeepKeys(preserved)
}

/**
 * 对比本地版本：首次安装写入版本；版本变化时清理旧缓存。
 * @returns {{ upgraded: boolean, from: string, to: string }}
 */
function checkLocalVersion() {
  const previous = getStoredVersion()

  if (!previous) {
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
 * 这样用户不必手动删除小程序再进入。
 */
function checkMiniProgramUpdate() {
  if (!wx.canIUse || !wx.canIUse('getUpdateManager')) return

  const updateManager = wx.getUpdateManager()

  updateManager.onCheckForUpdate((res) => {
    // res.hasUpdate 表示是否发现新版本
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
          // 应用新版本并重启
          updateManager.applyUpdate()
        }
      }
    })
  })

  updateManager.onUpdateFailed(() => {
    wx.showModal({
      title: '更新失败',
      content: '新版本下载失败，请检查网络后重新打开，或稍后再试。请勿删除小程序，以免丢失已保存的方案。',
      showCancel: false
    })
  })
}

module.exports = {
  APP_VERSION,
  checkLocalVersion,
  checkMiniProgramUpdate
}
