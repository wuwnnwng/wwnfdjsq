const STORAGE_KEY = 'add_mini_program_tip_seen'
const AUTO_HIDE_MS = 8000

function getWindowWidth() {
  try {
    if (typeof wx.getWindowInfo === 'function') {
      return wx.getWindowInfo().windowWidth
    }
  } catch (e) {}
  try {
    return wx.getSystemInfoSync().windowWidth
  } catch (e) {
    return 375
  }
}

function hasSeenTip() {
  try {
    return !!wx.getStorageSync(STORAGE_KEY)
  } catch (e) {
    return false
  }
}

function markTipSeen() {
  try {
    wx.setStorageSync(STORAGE_KEY, 1)
  } catch (e) {}
}

Component({
  data: {
    visible: false,
    wrapStyle: '',
    arrowStyle: ''
  },

  lifetimes: {
    attached() {
      this.maybeShow()
    },
    detached() {
      this.clearHideTimer()
    }
  },

  methods: {
    maybeShow() {
      if (this.data.visible || this._shown || hasSeenTip()) return
      this.layout()
      this._shown = true
      this.setData({ visible: true })
      setTimeout(() => {
        if (this.data.visible) this.layout()
      }, 50)
      this._hideTimer = setTimeout(() => this.dismiss(), AUTO_HIDE_MS)
    },

    layout() {
      let wrapStyle = 'top:10px;right:12px;'
      let arrowStyle = 'right:28px;'
      try {
        const menu = wx.getMenuButtonBoundingClientRect()
        const windowWidth = getWindowWidth()
        if (menu && menu.width) {
          const right = Math.max(8, windowWidth - menu.right)
          // 胶囊左半边是「三个点」，箭头对准该区域中心
          const arrowRight = Math.max(8, menu.width * 0.72 - 5)
          wrapStyle = `top:8px;right:${right}px;`
          arrowStyle = `right:${arrowRight}px;`
        }
      } catch (e) {}
      this.setData({ wrapStyle, arrowStyle })
    },

    clearHideTimer() {
      if (this._hideTimer) {
        clearTimeout(this._hideTimer)
        this._hideTimer = null
      }
    },

    dismiss() {
      if (!this.data.visible) return
      this.clearHideTimer()
      this.setData({ visible: false })
      markTipSeen()
    },

    onDismiss() {
      this.dismiss()
    }
  }
})
