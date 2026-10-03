const STATE_KEY = 'points_state'
const OPENID_KEY = 'points_openid'
const AD_FREE_KEY = 'ad_free_until'
const SESSION_KEY = 'user_session'
const PROFILE_KEY = 'user_profile'

function readProfile() {
  try {
    const saved = wx.getStorageSync(PROFILE_KEY)
    if (saved && typeof saved === 'object') {
      return {
        openid: saved.openid || '',
        nick: saved.nick || '',
        avatar: saved.avatar || '',
        avatarUrl: saved.avatarUrl || ''
      }
    }
  } catch (e) {}
  return { openid: '', nick: '', avatar: '', avatarUrl: '' }
}

function readOpenId() {
  try { return wx.getStorageSync(OPENID_KEY) || '' } catch (e) { return '' }
}

function sameUser(openid, profile) {
  const left = openid || ''
  const right = (profile && profile.openid) || ''
  if (!left || !right) return true
  return left === right
}

function rememberProfile(patch) {
  const prev = readProfile()
  const openid = (patch && patch.openid) || prev.openid || readOpenId() || ''
  if (prev.openid && openid && prev.openid !== openid) {
    const nextUser = {
      openid,
      nick: (patch && patch.nick) || '',
      avatar: (patch && patch.avatar) || '',
      avatarUrl: (patch && patch.avatarUrl) || ''
    }
    try { wx.setStorageSync(PROFILE_KEY, nextUser) } catch (e) {}
    return nextUser
  }
  const avatar = (patch && patch.avatar) || prev.avatar || ''
  let avatarUrl = (patch && patch.avatarUrl) || ''
  if (!avatarUrl && avatar && avatar === prev.avatar) avatarUrl = prev.avatarUrl || ''
  const next = {
    openid,
    nick: (patch && patch.nick) || prev.nick || '',
    avatar,
    avatarUrl
  }
  try { wx.setStorageSync(PROFILE_KEY, next) } catch (e) {}
  return next
}

function readState() {
  const profile = readProfile()
  let saved = null
  try {
    const raw = wx.getStorageSync(STATE_KEY)
    if (raw && typeof raw === 'object') saved = raw
  } catch (e) {}
  const state = Object.assign({
    points: 0,
    adFreeUntil: 0,
    checked: false,
    timelineDone: false,
    openid: '',
    nick: '',
    avatar: '',
    avatarUrl: '',
    loggedIn: false,
    admin: false
  }, saved || {})
  if (sameUser(state.openid || readOpenId(), profile)) {
    if (!state.nick) state.nick = profile.nick || ''
    if (!state.avatar) state.avatar = profile.avatar || ''
    if (!state.avatarUrl) state.avatarUrl = profile.avatarUrl || ''
  }
  return state
}

function writeState(state) {
  const prev = readState()
  const profile = readProfile()
  const loggedIn = !!state.loggedIn
  const nick = state.nick || prev.nick || profile.nick || ''
  const avatar = state.avatar || prev.avatar || profile.avatar || ''
  let avatarUrl = state.avatarUrl || ''
  if (!avatarUrl && avatar && (avatar === prev.avatar || avatar === profile.avatar)) {
    avatarUrl = prev.avatarUrl || profile.avatarUrl || ''
  }
  if (!avatarUrl && avatar && String(avatar).indexOf('cloud://') !== 0 && String(avatar).indexOf('http') === 0) {
    avatarUrl = avatar
  }
  rememberProfile({
    openid: state.openid || prev.openid || readOpenId(),
    nick,
    avatar,
    avatarUrl
  })
  const next = {
    points: Number(state.points) || 0,
    adFreeUntil: Number(state.adFreeUntil) || 0,
    checked: !!state.checked,
    timelineDone: !!state.timelineDone,
    openid: state.openid || (loggedIn ? '' : prev.openid) || '',
    nick,
    avatar,
    avatarUrl,
    loggedIn,
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

function saveAvatarUrl(fileID, url) {
  if (!url) return readState()
  const state = readState()
  if (fileID && state.avatar && state.avatar !== fileID) return state
  state.avatarUrl = url
  if (!state.avatar && fileID) state.avatar = fileID
  rememberProfile({ nick: state.nick, avatar: state.avatar, avatarUrl: url })
  try { wx.setStorageSync(STATE_KEY, state) } catch (e) {}
  return state
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
  readProfile,
  rememberProfile,
  saveAvatarUrl,
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
