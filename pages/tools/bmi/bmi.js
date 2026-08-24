const { calculateBmi } = require('../../../utils/bmiCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getBmiToolShare } = require('../../../utils/share')

Page({
  data: {
    theme: getThemeId(),
    height: '170',
    weight: '65',
    result: null
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

  onShareAppMessage() {
    return getBmiToolShare().appMessage
  },

  onShareTimeline() {
    return getBmiToolShare().timeline
  }
})
