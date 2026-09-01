const { FREQUENCIES, calculateCompound } = require('../../../utils/compoundCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getCompoundToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')

const lastInput = createLastInput('compound', ['principal', 'rate', 'years', 'monthly', 'frequencyKey'])

Page({
  data: {
    theme: getThemeId(),
    principal: '100000',
    rate: '4',
    years: '10',
    monthly: '0',
    frequencyKey: 'monthly',
    frequencies: FREQUENCIES,
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
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: e.detail.value }, () => this.recalculate())
  },

  onSelectFrequency(e) {
    const frequencyKey = e.currentTarget.dataset.key
    if (!frequencyKey || frequencyKey === this.data.frequencyKey) return
    this.setData({ frequencyKey }, () => this.recalculate())
  },

  recalculate() {
    this.setData(
      {
        result: calculateCompound({
          principalText: this.data.principal,
          rateText: this.data.rate,
          yearsText: this.data.years,
          frequencyKey: this.data.frequencyKey,
          monthlyText: this.data.monthly
        })
      },
      () => lastInput.save(this)
    )
  },

  onShareAppMessage() {
    return getCompoundToolShare().appMessage
  },

  onShareTimeline() {
    return getCompoundToolShare().timeline
  }
})
