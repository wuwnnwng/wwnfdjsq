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
    pickerOpen: false,
    privacyReady: false,
    nickFocus: false,
    privacyOpen: false,
    privacyName: '《用户隐私保护指引》'
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    this.bindPrivacy()
    const state = readState()
    if (!state.loggedIn) {
      wx.navigateBack()
      return
    }
    const stored = state.avatar || ''
    const showAvatar = state.avatarUrl || (stored.indexOf('cloud://') === 0 ? '' : stored)
    if (this._ready) return
    this._ready = true
    this.setData({
      nick: state.nick || '',
      draftNick: state.nick || '',
      avatar: showAvatar,
      avatarId: stored
    })
  },

  onHide() {
    if (this._picking || this.data.privacyOpen) return
    this.unbindPrivacy()
  },

  bindPrivacy() {
    if (typeof wx.onNeedPrivacyAuthorization !== 'function') return
    if (this._onNeedPrivacy && typeof wx.offNeedPrivacyAuthorization === 'function') {
      wx.offNeedPrivacyAuthorization(this._onNeedPrivacy)
    }
    this._onNeedPrivacy = (resolve) => {
      if (this._privacyChosen === 'agree') {
        resolve({ buttonId: 'privacy-agree', event: 'agree' })
        return
      }
      if (this._privacyChosen === 'reject') {
        resolve({ event: 'disagree' })
        return
      }
      this.privacyResolve = resolve
      this.setData({ privacyOpen: true })
      if (typeof wx.getPrivacySetting !== 'function') return
      wx.getPrivacySetting({
        success: (res) => {
          if (res && res.privacyContractName) this.setData({ privacyName: res.privacyContractName })
        }
      })
    }
    wx.onNeedPrivacyAuthorization(this._onNeedPrivacy)
  },

  unbindPrivacy() {
    if (this.privacyResolve) {
      this.privacyResolve({ event: 'disagree' })
      this.privacyResolve = null
    }
    if (this._onNeedPrivacy && typeof wx.offNeedPrivacyAuthorization === 'function') {
      wx.offNeedPrivacyAuthorization(this._onNeedPrivacy)
    }
  },

  ensurePrivacy(next) {
    const run = () => {
      this.setData({ privacyReady: true })
      if (next) next()
    }
    if (typeof wx.getPrivacySetting !== 'function') {
      run()
      return
    }
    wx.getPrivacySetting({
      success: (res) => {
        if (!res || !res.needAuthorization) {
          run()
          return
        }
        this._afterPrivacy = run
        this._privacyChosen = ''
        this.setData({
          privacyOpen: true,
          privacyName: res.privacyContractName || this.data.privacyName
        })
        if (typeof wx.requirePrivacyAuthorize === 'function') {
          wx.requirePrivacyAuthorize({ success() {}, fail() {} })
        }
      },
      fail: () => run()
    })
  },

  onAgreePrivacy() {
    if (!this.data.privacyOpen) return
    this._privacyChosen = 'agree'
    const resolve = this.privacyResolve
    this.privacyResolve = null
    if (resolve) resolve({ buttonId: 'privacy-agree', event: 'agree' })
    const next = this._afterPrivacy
    this._afterPrivacy = null
    this.setData({ privacyOpen: false, privacyReady: true })
    if (next) next()
  },

  onRejectPrivacy() {
    if (!this.data.privacyOpen) return
    this._privacyChosen = 'reject'
    const resolve = this.privacyResolve
    this.privacyResolve = null
    this._afterPrivacy = null
    if (resolve) resolve({ event: 'disagree' })
    this.setData({ privacyOpen: false })
  },

  onOpenPrivacy() {
    if (wx.openPrivacyContract) wx.openPrivacyContract({})
  },

  onHold() {},

  pick(sourceType) {
    if (this._picking) return
    this._privacyChosen = this._privacyChosen === 'reject' ? '' : this._privacyChosen
    this._picking = true
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: [sourceType],
      success: (res) => {
        this._picking = false
        const src = res.tempFilePaths && res.tempFilePaths[0]
        if (src) this.setData({ draftAvatar: src })
      },
      fail: (err) => {
        this._picking = false
        const msg = (err && err.errMsg) || ''
        if (/cancel/i.test(msg)) return
        wx.showToast({ title: '没有选到图片', icon: 'none' })
      }
    })
  },

  onOpenPicker() {
    this.ensurePrivacy(() => this.setData({ pickerOpen: true }))
  },

  onAskNick() {
    this.ensurePrivacy(() => {
      this.setData({ nickFocus: false })
      setTimeout(() => this.setData({ nickFocus: true }), 50)
    })
  },

  onSheetTap() {
    this._insideSheet = true
  },

  onClosePicker() {
    if (this._insideSheet) {
      this._insideSheet = false
      return
    }
    this.setData({ pickerOpen: false })
  },

  onCamera() {
    this.setData({ pickerOpen: false })
    this.pick('camera')
  },

  onAlbum() {
    this.setData({ pickerOpen: false })
    this.pick('album')
  },

  onChooseAvatar(e) {
    const src = e.detail && e.detail.avatarUrl
    this.setData({ pickerOpen: false })
    if (!src) return
    this.setData({ draftAvatar: src })
  },

  onNick(e) {
    this.setData({ draftNick: (e.detail && e.detail.value) || '' })
  },

  onNickBlur(e) {
    this.setData({ draftNick: (e.detail && e.detail.value) || this.data.draftNick })
  },

  onSave() {
    if (this._busy) return
    const nick = String(this.data.draftNick || '').trim()
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
