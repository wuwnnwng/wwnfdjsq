const {
  calculateMonthlySalaryTax,
  compareBonusMethods
} = require('../../../utils/incomeTax')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getTaxToolShare } = require('../../../utils/share')

const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => `${n}月`)

function currentMonthIndex() {
  return new Date().getMonth()
}

Page({
  data: {
    theme: getThemeId(),
    tab: 'salary',
    monthOptions: MONTH_OPTIONS,
    monthIndex: currentMonthIndex(),
    gross: '15000',
    insurance: '2250',
    additional: '0',
    bonus: '36000',
    showTip: false,
    result: null,
    bonusCompare: null
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

  onMonthChange(e) {
    this.setData({ monthIndex: Number(e.detail.value) }, () => this.recalculate())
  },

  onShowTip() {
    this.setData({ showTip: true })
  },

  onHideTip() {
    this.setData({ showTip: false })
  },

  recalculate() {
    if (this.data.tab === 'bonus') {
      this.setData({
        result: null,
        bonusCompare: compareBonusMethods({
          bonus: this.data.bonus,
          gross: this.data.gross,
          insurance: this.data.insurance,
          additional: this.data.additional
        })
      })
      return
    }
    this.setData({
      bonusCompare: null,
      result: calculateMonthlySalaryTax({
        gross: this.data.gross,
        insurance: this.data.insurance,
        additional: this.data.additional,
        monthIndex: this.data.monthIndex + 1
      })
    })
  },

  onShareAppMessage() {
    return getTaxToolShare().appMessage
  },

  onShareTimeline() {
    return getTaxToolShare().timeline
  }
})
