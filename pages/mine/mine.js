const {
  readState,
  syncPoints,
  formatUntil,
  saveUserProfile,
  uploadAvatar,
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
    draftNick: '',
    draftAvatar: '',
    avatarId: '',
    nickFocus: false,
    editing: false,
    privacyOpen: false,
    privacyName: '《用户隐私保护指引》',
    points: 0,
    adFreeText: '',
    unreadCount: 0
  },

  onShow() {
    this.bindPrivacy()
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

  onHide() {
    if (this.data.editing || this.data.privacyOpen) return
    this.unbindPrivacy()
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
      draftNick: this.data.editing ? this.data.draftNick : (loggedIn ? nick : ''),
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

  onAgreePrivacy() {
    if (!this.data.privacyOpen) return
    this._privacyChosen = 'agree'
    const resolve = this.privacyResolve
    this.privacyResolve = null
    if (resolve) resolve({ buttonId: 'privacy-agree', event: 'agree' })
    this.setData({ privacyOpen: false })
  },

  onRejectPrivacy() {
    if (!this.data.privacyOpen) return
    this._privacyChosen = 'reject'
    const resolve = this.privacyResolve
    this.privacyResolve = null
    if (resolve) resolve({ event: 'disagree' })
    this.setData({ privacyOpen: false })
  },

  onOpenPrivacy() {
    if (wx.openPrivacyContract) wx.openPrivacyContract({})
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
      this.openEditor('', '')
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
    this.openEditor(this.data.nick, '')
  },

  openEditor(nick, avatar) {
    if (this._privacyChosen === 'reject') this._privacyChosen = ''
    this.setData({
      editing: true,
      draftNick: nick || '',
      draftAvatar: avatar || '',
      nickFocus: false
    })
  },

  onSheetTap() {
    this._insideSheet = true
  },

  onCloseEdit() {
    if (this._insideSheet) {
      this._insideSheet = false
      return
    }
    this.setData({ editing: false, draftAvatar: '', nickFocus: false })
  },

  onHold() {},

  onPickAvatar() {
    if (this._picking) return
    this._picking = true
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        this._picking = false
        const src = res.tempFilePaths && res.tempFilePaths[0]
        if (!src) return
        this.setData({ draftAvatar: src })
      },
      fail: (err) => {
        this._picking = false
        const msg = (err && err.errMsg) || ''
        if (/cancel/i.test(msg)) return
        wx.showToast({ title: '没有选到图片', icon: 'none' })
      }
    })
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
      const keepNick = nick || state.nick || ''
      const keepAvatar = state.avatar && String(state.avatar).indexOf('http') !== 0 ? state.avatar : (this.data.avatarId || '')
      if (avatarFile) return uploadAvatar(avatarFile, keepNick)
      if (keepNick !== (state.nick || '')) return saveUserProfile({ nick: keepNick, avatar: keepAvatar })
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
        content: undeployed ? '请在开发者工具里对云函数 points 选择「上传并部署：云端安装依赖」，部署完成后再登录。' : msg,
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
          this.setData({ editing: false, draftAvatar: '' })
          wx.showToast({ title: '已退出', icon: 'none' })
        }).catch(() => {
          wx.showToast({ title: '没有退出成功', icon: 'none' })
        })
      }
    })
  }
})
