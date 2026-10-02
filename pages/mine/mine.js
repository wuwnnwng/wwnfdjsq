const {
  readState,
  syncPoints,
  formatUntil,
  saveUserProfile,
  uploadAvatar,
  loginAccount,
  logoutAccount
} = require('../../utils/points')
const {
  getThemeId,
  setThemeId,
  applyThemeChrome,
  THEME_LIST
} = require('../../utils/theme')

Page({
  data: {
    theme: getThemeId(),
    themeList: THEME_LIST,
    themeFading: false,
    loggedIn: false,
    admin: false,
    nick: '',
    avatar: '',
    draftNick: '',
    draftAvatar: '',
    nickFocus: false,
    editing: false,
    points: 0,
    adFreeText: ''
  },

  onShow() {
    this.applyTheme(getThemeId())
    const state = readState()
    this.applyProfile(state)
    const ticket = (this._ticket || 0) + 1
    this._ticket = ticket
    syncPoints().then((next) => {
      if (ticket !== this._ticket) return
      this.applyProfile(next)
    }).catch(() => {})
  },

  onUnload() {
    if (this._themeFadeTimer) {
      clearTimeout(this._themeFadeTimer)
      this._themeFadeTimer = null
    }
  },

  applyTheme(themeId) {
    const theme = setThemeId(themeId)
    if (theme !== this.data.theme) this.setData({ theme })
    applyThemeChrome(theme)
  },

  onThemeChange(e) {
    const theme = e.currentTarget.dataset.theme
    if (!theme || theme === this.data.theme || this._themeSwitching) return
    this._themeSwitching = true
    this.setData({ themeFading: true })
    if (this._themeFadeTimer) clearTimeout(this._themeFadeTimer)
    this._themeFadeTimer = setTimeout(() => {
      const next = setThemeId(theme)
      this.setData({ theme: next, themeFading: false })
      applyThemeChrome(next)
      this._themeFadeTimer = setTimeout(() => {
        this._themeSwitching = false
        this._themeFadeTimer = null
      }, 300)
    }, 300)
  },

  applyProfile(state) {
    const loggedIn = !!state.loggedIn
    const nick = loggedIn ? (state.nick || '') : ''
    this.setData({
      loggedIn,
      admin: loggedIn && !!state.admin,
      nick,
      avatar: loggedIn ? (state.avatar || '') : '',
      draftNick: this.data.editing ? this.data.draftNick : nick,
      points: loggedIn ? (state.points || 0) : 0,
      adFreeText: loggedIn ? formatUntil(state.adFreeUntil) : ''
    })
  },

  onLogin() {
    if (this._busy) return
    this.setData({
      editing: true,
      draftNick: '',
      draftAvatar: '',
      nickFocus: false
    })
  },

  onEdit() {
    if (!this.data.loggedIn) {
      this.onLogin()
      return
    }
    this.setData({
      editing: true,
      draftNick: this.data.nick,
      draftAvatar: '',
      nickFocus: false
    })
  },

  onCloseEdit() {
    this.setData({ editing: false, draftAvatar: '', nickFocus: false })
  },

  onHold() {},

  onChooseAvatar(e) {
    const src = e.detail && e.detail.avatarUrl
    if (!src) return
    const patch = { draftAvatar: src }
    if (!String(this.data.draftNick || '').trim()) patch.nickFocus = true
    this.setData(patch)
  },

  onNick(e) {
    this.setData({ draftNick: (e.detail && e.detail.value) || '' })
  },

  onNickBlur(e) {
    this.setData({
      draftNick: (e.detail && e.detail.value) || this.data.draftNick,
      nickFocus: false
    })
  },

  onSaveProfile() {
    if (this._busy) return
    const nick = String(this.data.draftNick || '').trim()
    const avatarFile = this.data.draftAvatar
    const loggingIn = !this.data.loggedIn
    this._busy = true
    this._ticket = (this._ticket || 0) + 1
    const ticket = this._ticket
    wx.showLoading({ title: loggingIn ? '正在登录' : '正在保存', mask: true })
    const start = loggingIn ? loginAccount() : Promise.resolve(readState())
    start.then((state) => {
      if (ticket === this._ticket) this.applyProfile(state)
      if (avatarFile) return uploadAvatar(avatarFile, nick)
      if (nick !== (state.nick || '')) return saveUserProfile({ nick, avatar: state.avatar || '' })
      return state
    }).then((state) => {
      this._busy = false
      wx.hideLoading()
      if (ticket !== this._ticket) return
      this.applyProfile(state)
      this.setData({ editing: false, draftAvatar: '', nickFocus: false })
      wx.showToast({ title: loggingIn ? '已登录' : '已保存', icon: 'none' })
    }).catch((err) => {
      this._busy = false
      wx.hideLoading()
      const msg = (err && (err.message || err.errMsg)) || ''
      if (loggingIn && readState().loggedIn) {
        this.applyProfile(readState())
        wx.showToast({ title: '已登录，资料没有保存成功', icon: 'none' })
        return
      }
      if (!loggingIn) {
        wx.showToast({ title: msg && msg !== 'cloud' && msg !== 'empty' ? msg : '没有保存成功', icon: 'none' })
        return
      }
      const undeployed = !msg || msg === 'cloud' || msg === 'fail' || /FUNCTION_NOT_FOUND|不支持的操作|timeout|timedout/i.test(msg)
      wx.showModal({
        title: '登录失败',
        content: undeployed ? '请在开发者工具里对云函数 points 选择「上传并部署：所有文件」，部署完成后再登录。' : msg,
        showCancel: false
      })
    })
  },

  onPoints() {
    if (!this.data.loggedIn) {
      this.onLogin()
      return
    }
    wx.navigateTo({ url: '/pages/mine/points' })
  },

  onNotices() {
    wx.navigateTo({ url: '/pages/mine/notices' })
  },

  onUsers() {
    if (!this.data.loggedIn || !this.data.admin) return
    wx.navigateTo({ url: '/pages/mine/users' })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新登录。头像、昵称和积分会留在账号里。',
      confirmText: '退出',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return
        logoutAccount().then((state) => {
          this.applyProfile(state)
          this.setData({ editing: false, draftAvatar: '' })
          wx.showToast({ title: '已退出', icon: 'none' })
        }).catch(() => {
          wx.showToast({ title: '没有退出成功', icon: 'none' })
        })
      }
    })
  }
})
