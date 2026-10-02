Page({
  data: {
    position: 'back',
    cameraOn: false,
    privacyOpen: false,
    privacyName: '《小程序隐私保护指引》'
  },

  onLoad() {
    this.bindPrivacy()
    if (typeof wx.getPrivacySetting !== 'function') {
      this.setData({ cameraOn: true })
      return
    }
    wx.getPrivacySetting({
      success: (res) => {
        if (res && res.needAuthorization) {
          this.setData({
            privacyOpen: true,
            privacyName: res.privacyContractName || '《小程序隐私保护指引》'
          })
          return
        }
        this.setData({ cameraOn: true })
      },
      fail: () => this.setData({ cameraOn: true })
    })
  },

  onReady() {
    if (this.data.cameraOn) this.ctx = wx.createCameraContext()
  },

  onHide() {
    this.unbindPrivacy()
  },

  onUnload() {
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
      this.setData({ privacyOpen: true, cameraOn: false })
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
    if (this._agreeLock || !this.data.privacyOpen) return
    this._agreeLock = true
    this._privacyChosen = 'agree'
    const resolve = this.privacyResolve
    this.privacyResolve = null
    if (resolve) resolve({ buttonId: 'privacy-agree', event: 'agree' })
    this.setData({ privacyOpen: false, cameraOn: true })
    wx.showToast({ title: '已同意', icon: 'none' })
    setTimeout(() => {
      this._agreeLock = false
      this.ctx = wx.createCameraContext()
    }, 300)
  },

  onRejectPrivacy() {
    if (this._agreeLock || !this.data.privacyOpen) return
    this._agreeLock = true
    this._privacyChosen = 'reject'
    const resolve = this.privacyResolve
    this.privacyResolve = null
    this.setData({ privacyOpen: false })
    if (resolve) resolve({ event: 'disagree' })
    wx.showToast({ title: '已拒绝', icon: 'none' })
    setTimeout(() => {
      this._agreeLock = false
      wx.navigateBack()
    }, 400)
  },

  onHoldPrivacy() {},

  onOpenPrivacy() {
    if (typeof wx.openPrivacyContract === 'function') wx.openPrivacyContract()
  },

  onFlip() {
    this.setData({ position: this.data.position === 'back' ? 'front' : 'back' })
  },

  onCamError() {
    wx.showToast({ title: '没有打开相机', icon: 'none' })
  },

  onShot() {
    if (this._busy) return
    const ctx = this.ctx || wx.createCameraContext()
    this.ctx = ctx
    this._busy = true
    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        this._busy = false
        const file = res && res.tempImagePath
        if (!file) {
          wx.showToast({ title: '没有拍到照片', icon: 'none' })
          return
        }
        wx.navigateTo({
          url: `/packageCheckin/pages/idphoto/check?from=camera&file=${encodeURIComponent(file)}`
        })
      },
      fail: () => {
        this._busy = false
        wx.showToast({ title: '没有拍到照片', icon: 'none' })
      }
    })
  }
})
