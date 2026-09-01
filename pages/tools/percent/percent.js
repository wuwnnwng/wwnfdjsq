const { percentOf, isPercent, percentChange } = require('../../../utils/percentCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getPercentToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')

const lastInput = createLastInput('percent', ['tab', 'base', 'percent', 'part', 'whole', 'fromValue', 'toValue'])

Page({
  data: {
    theme: getThemeId(),
    tab: 'of',
    base: '200',
    percent: '15',
    part: '30',
    whole: '200',
    fromValue: '200',
    toValue: '230',
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

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.tab) return
    this.setData({ tab }, () => this.recalculate())
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: e.detail.value }, () => this.recalculate())
  },

  recalculate() {
    const { tab, base, percent, part, whole, fromValue, toValue } = this.data
    let result = null
    if (tab === 'of') result = percentOf(base, percent)
    else if (tab === 'is') result = isPercent(part, whole)
    else result = percentChange(fromValue, toValue)
    this.setData({ result }, () => lastInput.save(this))
  },

  onShareAppMessage() {
    return getPercentToolShare().appMessage
  },

  onShareTimeline() {
    return getPercentToolShare().timeline
  }
})
