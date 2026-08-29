const { RETIRE_AGES, calculatePension } = require('../../../utils/pensionCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getPensionToolShare } = require('../../../utils/share')

const RETIRE_LABELS = RETIRE_AGES.map((age) => `${age} 岁`)

Page({
  data: {
    theme: getThemeId(),
    salary: '10000',
    average: '10000',
    years: '35',
    returnRate: '3',
    retireAges: RETIRE_AGES,
    retireLabels: RETIRE_LABELS,
    retireIndex: 2,
    result: null,
    showTip: false
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

  preventMove() {},

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: e.detail.value }, () => this.recalculate())
  },

  onRetireChange(e) {
    this.setData({ retireIndex: Number(e.detail.value) }, () => this.recalculate())
  },

  onShowTip() {
    this.setData({ showTip: true })
  },

  onHideTip() {
    this.setData({ showTip: false })
  },

  recalculate() {
    const retireAge = RETIRE_AGES[this.data.retireIndex] || 60
    this.setData({
      result: calculatePension({
        salaryText: this.data.salary,
        averageText: this.data.average,
        yearsText: this.data.years,
        retireAge,
        returnText: this.data.returnRate
      })
    })
  },

  onShareAppMessage() {
    return getPensionToolShare().appMessage
  },

  onShareTimeline() {
    return getPensionToolShare().timeline
  }
})
