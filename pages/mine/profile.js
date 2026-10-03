const { readState, saveUserProfile, uploadAvatar } = require('../../utils/points')
const { getThemeId, applyThemeChrome } = require('../../utils/theme')

Page({
  data: {
    theme: getThemeId(),
    nick: '',
    draftNick: '',
    avatar: '',
    draftAvatar: '',
    avatarId: '',
    needPrivacy: true
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    this.bindPrivacy()
    this.refreshPrivacy()
    const state = readState()
    if (!state.loggedIn) {
      wx.navigateBack()
      return
    }
    const stored = state.avatar || ''
    const showAvatar = state.avatarUrl || (stored.indexOf('cloud://') === 0 ? '' : stored)
    if (this._ready) return
    this._ready = true
    this._draftNick = state.nick || ''
    this.setData({
      nick: state.nick || '',
      draftNick: state.nick || '',
      avatar: showAvatar,
      avatarId: stored
    })
  },

  onUnload() {
    if (this.privacyResolve) {
      this.privacyResolve({ event: 'disagree' })
      this.privacyResolve = null
    }
    if (this._onNeedPrivacy && typeof wx.offNeedPrivacyAuthorization === 'function') {
      wx.offNeedPrivacyAuthorization(this._onNeedPrivacy)
    }
  },

  bindPrivacy() {
    if (typeof wx.onNeedPrivacyAuthorization !== 'function') return
    if (typeof wx.offNeedPrivacyAuthorization === 'function') wx.offNeedPrivacyAuthorization()
    this._onNeedPrivacy = (resolve) => {
      this.privacyResolve = resolve
    }
    wx.onNeedPrivacyAuthorization(this._onNeedPrivacy)
  },

  refreshPrivacy() {
    if (typeof wx.getPrivacySetting !== 'function') {
      this.setData({ needPrivacy: false })
      return
    }
    wx.getPrivacySetting({
      success: (res) => this.setData({ needPrivacy: !!(res && res.needAuthorization) }),
      fail: () => this.setData({ needPrivacy: false })
    })
  },

  onAgreePrivacy(e) {
    const buttonId = (e && e.currentTarget && e.currentTarget.id) || 'privacy-agree'
    const finish = () => {
      const resolve = this.privacyResolve
      this.privacyResolve = null
      if (resolve) resolve({ buttonId, event: 'agree' })
      this.setData({ needPrivacy: false })
    }
    if (this.privacyResolve) finish()
    else setTimeout(finish, 0)
  },

  onChooseAvatar(e) {
    const src = e.detail && e.detail.avatarUrl
    if (!src) return
    this.setData({ draftAvatar: src })
  },

  onNick(e) {
    this._draftNick = (e.detail && e.detail.value) || ''
  },

  onNickBlur(e) {
    const value = (e.detail && e.detail.value) || this._draftNick || ''
    this._draftNick = value
    this.setData({ draftNick: value })
  },

  onNickReview(e) {
    if (e.detail && e.detail.pass === false) {
      this._draftNick = ''
      this.setData({ draftNick: '' })
    }
  },

  onSave() {
    if (this._busy) return
    const nick = String(this._draftNick != null ? this._draftNick : this.data.draftNick || '').trim()
    const avatarFile = this.data.draftAvatar
    const state = readState()
    if (!avatarFile && nick === (state.nick || '')) {
      wx.navigateBack()
      return
    }
    this._busy = true
    wx.showLoading({ title: '正在保存', mask: true })
    const keepNick = nick || state.nick || ''
    const keepAvatar = state.avatar && String(state.avatar).indexOf('http') !== 0 ? state.avatar : (this.data.avatarId || '')
    const task = avatarFile
      ? uploadAvatar(avatarFile, keepNick)
      : saveUserProfile({ nick: keepNick, avatar: keepAvatar })
    task.then(() => {
      this._busy = false
      wx.hideLoading()
      wx.navigateBack()
    }).catch((err) => {
      this._busy = false
      wx.hideLoading()
      const msg = (err && (err.message || err.errMsg)) || ''
      if (msg === '所发布内容含违规信息') {
        wx.showModal({ title: '提示', content: '所发布内容含违规信息', showCancel: false })
        return
      }
      wx.showToast({ title: msg && msg !== 'cloud' && msg !== 'empty' ? msg : '没有保存成功', icon: 'none' })
    })
  }
})
