const { getThemeId, applyThemeChrome } = require('../../utils/theme')
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share')
const {
  readState,
  syncPoints,
  checkInPoints,
  claimTimelinePoints,
  redeemPoints,
  formatUntil
} = require('../../utils/points')

const COST = 100

function failText(err) {
  const msg = (err && (err.message || err.errMsg)) || ''
  if (!msg || msg === 'cloud' || /FUNCTION_NOT_FOUND|cloud\.callFunction|fail/i.test(msg)) {
    return '积分云函数还没部署'
  }
  return msg
}

function applyState(page, state, message) {
  const until = Number(state.adFreeUntil) || 0
  const points = state.points || 0
  const lack = Math.max(0, COST - points)
  page.setData({
    points,
    checked: !!state.checked,
    timelineDone: !!state.timelineDone,
    adFreeText: formatUntil(until),
    lack,
    progress: Math.max(0, Math.min(100, Math.round(points / COST * 100)))
  })
  if (message) wx.showToast({ title: message, icon: 'none' })
}

Page({
  data: {
    theme: getThemeId(),
    points: 0,
    checked: false,
    timelineDone: false,
    adFreeText: '',
    lack: COST,
    progress: 0,
    cost: COST
  },

  onLoad() {
    enableShareMenu()
    applyState(this, readState())
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    if (!readState().loggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 400)
      return
    }
    syncPoints().then((state) => {
      if (!state.loggedIn) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 400)
        return
      }
      applyState(this, state)
    }).catch(() => {
      if (this._warned) return
      this._warned = true
      wx.showToast({ title: '积分云函数还没部署', icon: 'none' })
    })
  },

  onCheckIn() {
    if (this.data.checked || this._busy) return
    this._busy = true
    checkInPoints().then((state) => {
      this._busy = false
      applyState(this, state, '签到成功，+5积分')
    }).catch((err) => {
      this._busy = false
      wx.showToast({ title: failText(err), icon: 'none' })
    })
  },

  onRedeem() {
    if (this.data.points < COST) {
      wx.showToast({ title: `还差${this.data.lack}积分`, icon: 'none' })
      return
    }
    wx.showModal({
      title: '兑换免广告',
      content: '使用100积分，兑换15天免广告。',
      confirmText: '兑换',
      success: (res) => {
        if (!res.confirm) return
        redeemPoints().then((state) => {
          applyState(this, state, '已兑换15天免广告')
        }).catch((err) => {
          wx.showToast({ title: failText(err), icon: 'none' })
        })
      }
    })
  },

  onTimeline() {
    enableShareMenu()
    if (this.data.timelineDone) {
      wx.showToast({ title: '今天的朋友圈积分已领取', icon: 'none' })
      return
    }
    wx.showModal({
      title: '分享到朋友圈',
      content: '请点右上角「···」，选择「分享到朋友圈」。分享完成后回到本页即可获得 5 积分。开发者工具里这个入口点不开，请用手机微信预览。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  onShareAppMessage() {
    return getShareAppMessage()
  },

  onShareTimeline() {
    if (!this.data.timelineDone) {
      claimTimelinePoints().then((state) => {
        applyState(this, state, '朋友圈分享 +5积分')
      }).catch(() => {})
    }
    return getShareTimeline()
  }
})
