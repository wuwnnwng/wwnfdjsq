const {
  calculateMonthlySalaryTax,
  compareBonusMethods,
  calculateInsurance,
  DEFAULT_INSURANCE_RATES,
  formatRateText,
  clampRate
} = require('../../../utils/incomeTax')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getTaxToolShare } = require('../../../utils/share')

const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => `${n}月`)
const INITIAL_GROSS = '15000'
const INITIAL_INSURANCE = calculateInsurance(INITIAL_GROSS, DEFAULT_INSURANCE_RATES)

function currentMonthIndex() {
  return new Date().getMonth()
}

function insurancePack(data, extra) {
  const next = Object.assign({}, data, extra || {})
  return calculateInsurance(next.gross, {
    pensionRate: next.pensionRate,
    medicalRate: next.medicalRate,
    unemploymentRate: next.unemploymentRate,
    housingRate: next.housingRate
  })
}

Page({
  data: {
    theme: getThemeId(),
    tab: 'salary',
    monthOptions: MONTH_OPTIONS,
    monthIndex: currentMonthIndex(),
    gross: INITIAL_GROSS,
    insurance: INITIAL_INSURANCE.totalInput,
    additional: '0',
    bonus: '36000',
    pensionRate: DEFAULT_INSURANCE_RATES.pensionRate,
    medicalRate: DEFAULT_INSURANCE_RATES.medicalRate,
    unemploymentRate: DEFAULT_INSURANCE_RATES.unemploymentRate,
    housingRate: DEFAULT_INSURANCE_RATES.housingRate,
    insuranceHint: INITIAL_INSURANCE.hint,
    insuranceItems: INITIAL_INSURANCE.items,
    insuranceTotalText: INITIAL_INSURANCE.totalText,
    showTip: false,
    showInsurance: false,
    result: null,
    bonusCompare: null
  },

  onLoad() {
    enableShareMenu()
    this.syncInsurance()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  preventMove() {},

  syncInsurance(extra) {
    const pack = insurancePack(this.data, extra)
    this.setData(
      Object.assign({}, extra || {}, {
        insurance: pack.totalInput,
        insuranceHint: pack.hint,
        insuranceItems: pack.items,
        insuranceTotalText: pack.totalText
      }),
      () => this.recalculate()
    )
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.tab) return
    this.setData({ tab }, () => this.recalculate())
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    if (field === 'gross') {
      this.syncInsurance({ gross: e.detail.value })
      return
    }
    this.setData({ [field]: e.detail.value }, () => this.recalculate())
  },

  onRateInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.syncInsurance({ [field]: e.detail.value })
  },

  onRateBlur(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    const next = formatRateText(clampRate(e.detail.value))
    if (next === this.data[field]) return
    this.syncInsurance({ [field]: next })
  },

  onMonthChange(e) {
    this.setData({ monthIndex: Number(e.detail.value) }, () => this.recalculate())
  },

  onShowInsurance() {
    this.setData({ showInsurance: true })
  },

  onHideInsurance() {
    this.setData({ showInsurance: false })
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
