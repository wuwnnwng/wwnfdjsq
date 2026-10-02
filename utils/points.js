const STATE_KEY = 'points_state'
const OPENID_KEY = 'points_openid'
const AD_FREE_KEY = 'ad_free_until'
const SESSION_KEY = 'user_session'

function readState() {
  try {
    const saved = wx.getStorageSync(STATE_KEY)
    if (saved && typeof saved === 'object') return saved
  } catch (e) {}
  return {
    points: 0,
    adFreeUntil: 0,
    checked: false,
    timelineDone: false,
    openid: '',
    nick: '',
    avatar: '',
    loggedIn: false,
    admin: false
  }
}

function writeState(state) {
  const next = {
    points: Number(state.points) || 0,
    adFreeUntil: Number(state.adFreeUntil) || 0,
    checked: !!state.checked,
    timelineDone: !!state.timelineDone,
    openid: state.openid || '',
    nick: state.nick || '',
    avatar: state.avatar || '',
    loggedIn: !!state.loggedIn,
    admin: !!state.admin
  }
  try {
    wx.setStorageSync(STATE_KEY, next)
    wx.setStorageSync(AD_FREE_KEY, next.loggedIn ? next.adFreeUntil : 0)
    if (next.loggedIn && next.openid) wx.setStorageSync(OPENID_KEY, next.openid)
    if (next.loggedIn && state.session) wx.setStorageSync(SESSION_KEY, state.session)
    if (!next.loggedIn) wx.removeStorageSync(SESSION_KEY)
  } catch (e) {}
  return next
}

function readSession() {
  try {
    return wx.getStorageSync(SESSION_KEY) || ''
  } catch (e) {
    return ''
  }
}

function callPoints(action, extra) {
  if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
    return Promise.reject(new Error('cloud'))
  }
  const sentSession = readSession()
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'points',
      data: Object.assign({ action, session: sentSession }, extra || {}),
      success: (res) => {
        const result = (res && res.result) || {}
        if (!result.ok) {
          reject(new Error(result.message || 'fail'))
          return
        }
        if (typeof result.loggedIn !== 'boolean') {
          resolve(result)
          return
        }
        const currentSession = readSession()
        if (!result.loggedIn && currentSession && currentSession !== sentSession) {
          resolve(readState())
          return
        }
        resolve(writeState(result))
      },
      fail: (err) => reject(new Error((err && err.errMsg) || 'cloud'))
    })
  })
}

function syncPoints() {
  return callPoints('sync')
}

function loginAccount() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: () => {
        callPoints('login').then(resolve).catch(reject)
      },
      fail: reject
    })
  })
}

function logoutAccount() {
  return callPoints('logout')
}

function checkInPoints() {
  return callPoints('checkin')
}

function claimTimelinePoints() {
  return callPoints('timeline')
}

function redeemPoints() {
  return callPoints('redeem')
}

function saveUserProfile(profile) {
  return callPoints('profile', {
    nick: profile && profile.nick ? profile.nick : '',
    avatar: profile && profile.avatar ? profile.avatar : ''
  })
}

function clearUserProfile() {
  return callPoints('profile', { clear: true })
}

function compressAvatar(filePath) {
  return new Promise((resolve) => {
    if (typeof wx.compressImage !== 'function') {
      resolve(filePath)
      return
    }
    wx.compressImage({
      src: filePath,
      quality: 40,
      compressedWidth: 240,
      success: (res) => resolve((res && res.tempFilePath) || filePath),
      fail: () => resolve(filePath)
    })
  })
}

function readBase64(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve((res && res.data) || ''),
      fail: reject
    })
  })
}

function uploadAvatar(filePath, nick) {
  return compressAvatar(filePath).then(readBase64).then((image) => {
    if (!image) throw new Error('empty')
    return callPoints('avatar', { image, nick: nick || '' })
  })
}

function loadUsers(page) {
  return callPoints('users', { page: page || 1 })
}

function loadNotices() {
  return callPoints('notices')
}

function loadNoticeManage() {
  return callPoints('noticeManage')
}

function saveNotice(notice) {
  return callPoints('noticeSave', notice || {})
}

function removeNotice(id) {
  return callPoints('noticeRemove', { id })
}

function claimInvite(options) {
  const query = (options && options.query) || {}
  const inviter = query.inviter || ''
  if (!inviter) return Promise.resolve(null)
  if (claimInvite._sent === inviter) return Promise.resolve(null)
  return callPoints('invite', { inviter }).then((state) => {
    claimInvite._sent = inviter
    return state
  }).catch(() => null)
}

function formatUntil(time) {
  const value = Number(time) || 0
  if (!value || value <= Date.now()) return ''
  const date = new Date(value)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${date.getFullYear()}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`
}

module.exports = {
  AD_FREE_KEY,
  readState,
  syncPoints,
  loginAccount,
  logoutAccount,
  checkInPoints,
  claimTimelinePoints,
  redeemPoints,
  saveUserProfile,
  clearUserProfile,
  uploadAvatar,
  loadUsers,
  loadNotices,
  loadNoticeManage,
  saveNotice,
  removeNotice,
  claimInvite,
  formatUntil
}
