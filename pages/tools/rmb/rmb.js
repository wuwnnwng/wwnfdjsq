const { toRmbUpper } = require('../../../utils/rmbUpper')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getRmbToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')

const lastInput = createLastInput('rmb', ['amount'])

Page({
  data: {
    theme: getThemeId(),
    amount: '1234.56',
    result: null
  },

  onLoad() {
    enableShareMenu()
    this.setData(lastInput.restore(), () => this.recalculate())
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onHide() {
    lastInput.flush(this)
  },

  onUnload() {
    lastInput.flush(this)
  },

  onInput(e) {
    this.setData({ amount: e.detail.value }, () => this.recalculate())
  },

  recalculate() {
    this.setData({ result: toRmbUpper(this.data.amount) }, () => lastInput.save(this))
  },

  onCopy() {
    const text = this.data.result && this.data.result.upper
    if (!text) {
      wx.showToast({ title: '暂无可复制内容', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制大写', icon: 'success' })
    })
  },

  onShareAppMessage() {
    return getRmbToolShare().appMessage
  },

  onShareTimeline() {
    return getRmbToolShare().timeline
  }
})
