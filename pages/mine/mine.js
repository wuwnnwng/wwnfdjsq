const {
  readState,
  syncPoints,
  formatUntil,
  loginAccount,
  logoutAccount,
  saveAvatarUrl,
  readProfile,
  rememberProfile,
  loadNotices
} = require('../../utils/points')
const { unreadCount } = require('../../utils/noticeInbox')
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
    avatarId: '',
    points: 0,
    adFreeText: '',
    unreadCount: 0
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
    this.loadUnread(ticket)
  },

  loadUnread(ticket) {
    loadNotices().then((res) => {
      if (ticket !== this._ticket) return
      const count = unreadCount(res.list)
      this.setData({
        unreadCount: count,
        unreadText: count > 99 ? '99+' : String(count)
      })
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
    const profile = readProfile()
    const pageAvatar = this.data.avatar || ''
    const pageNick = this.data.nick || ''
    let nick = state.nick || profile.nick || ''
    let stored = state.avatar || profile.avatar || ''
    let showAvatar = state.avatarUrl || profile.avatarUrl || ''
    if (!loggedIn) {
      if (!nick) nick = pageNick
      if (!stored) stored = this.data.avatarId || ''
      if (!showAvatar && pageAvatar.indexOf('http') === 0) showAvatar = pageAvatar
    }
    if (!showAvatar && stored && stored.indexOf('cloud://') !== 0) showAvatar = stored
    if (nick || stored || showAvatar) {
      rememberProfile({
        openid: state.openid || profile.openid || '',
        nick,
        avatar: stored || (showAvatar.indexOf('cloud://') === 0 ? showAvatar : profile.avatar),
        avatarUrl: showAvatar.indexOf('http') === 0 ? showAvatar : (profile.avatarUrl || '')
      })
    }
    this.setData({
      loggedIn,
      admin: loggedIn && !!state.admin,
      nick: loggedIn ? nick : '',
      avatar: loggedIn ? showAvatar : '',
      avatarId: stored,
      points: loggedIn ? (state.points || 0) : 0,
      adFreeText: loggedIn ? formatUntil(state.adFreeUntil) : ''
    })
    if (!loggedIn || stored.indexOf('cloud://') !== 0 || !wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') return
    wx.cloud.getTempFileURL({
      fileList: [stored],
      success: (res) => {
        const url = res && res.fileList && res.fileList[0] && res.fileList[0].tempFileURL
        if (!url || !this.data.loggedIn || this.data.avatarId !== stored) return
        saveAvatarUrl(stored, url)
        rememberProfile({ nick, avatar: stored, avatarUrl: url })
        this.setData({ avatar: url })
      }
    })
  },

  onLogin() {
    if (this._busy) return
    this._busy = true
    this._ticket = (this._ticket || 0) + 1
    const ticket = this._ticket
    wx.showLoading({ title: '正在登录', mask: true })
    loginAccount().then((state) => {
      this._busy = false
      wx.hideLoading()
      if (ticket !== this._ticket) return
      this.applyProfile(state)
      if (state.nick || state.avatar) {
        wx.showToast({ title: '已登录', icon: 'none' })
        return
      }
      wx.navigateTo({ url: '/pages/mine/profile' })
    }).catch((err) => {
      this._busy = false
      wx.hideLoading()
      const msg = (err && (err.message || err.errMsg)) || ''
      const undeployed = !msg || msg === 'cloud' || msg === 'fail' || /FUNCTION_NOT_FOUND|不支持的操作|timeout|timedout/i.test(msg)
      wx.showModal({
        title: '登录失败',
        content: undeployed ? '请在开发者工具里对云函数 points 选择「上传并部署：云端安装依赖」，部署完成后再登录。' : msg,
        showCancel: false
      })
    })
  },

  onEdit() {
    if (!this.data.loggedIn) {
      this.onLogin()
      return
    }
    wx.navigateTo({ url: '/pages/mine/profile' })
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

  onOpenBird() {
    wx.navigateToMiniProgram({
      appId: 'wx4bce45b682594eb4',
      envVersion: 'release',
      fail(err) {
        const msg = (err && err.errMsg) || ''
        if (msg.indexOf('cancel') >= 0) return
        wx.showToast({ title: '暂无法打开好鸟哥', icon: 'none' })
      }
    })
  },

  onOpenErshou() {
    wx.navigateToMiniProgram({
      appId: 'wx663931c101197d69',
      envVersion: 'release',
      fail(err) {
        const msg = (err && err.errMsg) || ''
        if (msg.indexOf('cancel') >= 0) return
        wx.showToast({ title: '暂无法打开同城二手', icon: 'none' })
      }
    })
  },

  onUsers() {
    if (!this.data.loggedIn || !this.data.admin) return
    wx.navigateTo({ url: '/pages/mine/users' })
  },

  onLogout() {
    const keep = {
      nick: this.data.nick || '',
      avatar: this.data.avatarId || '',
      avatarUrl: (this.data.avatar || '').indexOf('http') === 0 ? this.data.avatar : ''
    }
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新登录。头像和昵称会留在页面上。',
      confirmText: '退出',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return
        if (keep.nick || keep.avatar || keep.avatarUrl) rememberProfile(keep)
        logoutAccount().then((state) => {
          this.applyProfile(Object.assign({}, state, {
            loggedIn: false,
            admin: false,
            points: 0,
            adFreeUntil: 0,
            nick: state.nick || keep.nick,
            avatar: state.avatar || keep.avatar,
            avatarUrl: state.avatarUrl || keep.avatarUrl
          }))
          wx.showToast({ title: '已退出', icon: 'none' })
        }).catch(() => {
          wx.showToast({ title: '没有退出成功', icon: 'none' })
        })
      }
    })
  }
})
