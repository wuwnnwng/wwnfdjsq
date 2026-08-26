const { calculateBmi } = require('../../../utils/bmiCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getBmiToolShare } = require('../../../utils/share')
const { saveResultCard, handleSaveError, drawBmiCard } = require('../../../utils/resultCard')

Page({
  data: {
    theme: getThemeId(),
    height: '170',
    weight: '65',
    result: null,
    savingCard: false
  },

  onLoad() {
    enableShareMenu()
    this.recalculate()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: e.detail.value }, () => this.recalculate())
  },

  recalculate() {
    this.setData({ result: calculateBmi(this.data.height, this.data.weight) })
  },

  onSaveCard() {
    const result = this.data.result
    if (!result || !result.valid) {
      wx.showToast({ title: '请先算出结果', icon: 'none' })
      return
    }
    if (this._savingCard) return
    this._savingCard = true
    this.setData({ savingCard: true })
    wx.showLoading({ title: '正在生成', mask: true })
    saveResultCard(this, 'resultCard', (ctx, width, height) => {
      drawBmiCard(ctx, width, height, result)
    })
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      })
      .catch((err) => {
        wx.hideLoading()
        handleSaveError(err)
      })
      .then(() => {
        this._savingCard = false
        this.setData({ savingCard: false })
      })
  },

  onShareAppMessage() {
    return getBmiToolShare().appMessage
  },

  onShareTimeline() {
    return getBmiToolShare().timeline
  }
})
