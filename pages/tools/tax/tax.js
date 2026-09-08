const {
  calculateMonthlySalaryTax,
  compareBonusMethods,
  calculateInsurance,
  calculateAdditionalDeduction,
  additionalFieldView,
  DEFAULT_INSURANCE_RATES,
  DEFAULT_ADDITIONAL_SELECTION,
  formatRateText,
  clampRate
} = require('../../../utils/incomeTax')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getTaxToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')

const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => `${n}月`)
const INITIAL_GROSS = '15000'
const INITIAL_INSURANCE = calculateInsurance(INITIAL_GROSS, DEFAULT_INSURANCE_RATES)
const INITIAL_ADDITIONAL = calculateAdditionalDeduction(DEFAULT_ADDITIONAL_SELECTION)
const lastInput = createLastInput('tax', [
  'tab',
  'monthIndex',
  'gross',
  'additional',
  'additionalIncluded',
  'bonus',
  'pensionRate',
  'medicalRate',
  'unemploymentRate',
  'housingRate',
  'infantOn',
  'infantCount',
  'childOn',
  'childCount',
  'continueOn',
  'continueType',
  'housingType',
  'rentLevel',
  'elderOn',
  'elderType',
  'elderShare',
  'pensionOn',
  'pensionPay'
])

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

function additionalUi(pack) {
  return {
    infantOn: pack.infantOn,
    infantCount: pack.infantCount,
    infantAmountText: pack.infantAmountText,
    childOn: pack.childOn,
    childCount: pack.childCount,
    childAmountText: pack.childAmountText,
    continueOn: pack.continueOn,
    continueType: pack.continueType,
    continueAmountText: pack.continueAmountText,
    housingType: pack.housingType,
    housingOn: pack.housingOn,
    rentLevel: pack.rentLevel,
    housingAmountText: pack.housingAmountText,
    elderOn: pack.elderOn,
    elderType: pack.elderType,
    elderShare: pack.elderShare,
    elderAmountText: pack.elderAmountText,
    pensionOn: pack.pensionOn,
    pensionPay: pack.pensionPay,
    pensionAmountText: pack.pensionAmountText,
    additionalTotalText: pack.totalText
  }
}

function additionalPagePatch(data) {
  const pack = calculateAdditionalDeduction(data)
  const ui = additionalUi(pack)
  if (pack.total > 0) {
    return Object.assign(ui, additionalFieldView(pack, data.additionalIncluded === true))
  }
  return Object.assign(ui, {
    additionalHint: Number(data.additional) > 0 ? '请重新选择扣除项目' : pack.emptyHint,
    additionalMonthly: '0',
    additionalOnce: '0'
  })
}

function countedAdditional(data) {
  const pack = calculateAdditionalDeduction(data)
  if (pack.total > 0) {
    if (data.additionalIncluded !== true) {
      return { additional: '0', additionalOnce: '0' }
    }
    return {
      additional: pack.monthlyInput,
      additionalOnce: pack.onceInput
    }
  }
  return {
    additional: data.additional || '0',
    additionalOnce: '0'
  }
}

Page({
  data: Object.assign(
    {
      theme: getThemeId(),
      tab: 'salary',
      monthOptions: MONTH_OPTIONS,
      monthIndex: currentMonthIndex(),
      gross: INITIAL_GROSS,
      insurance: INITIAL_INSURANCE.totalInput,
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
      showAdditional: false,
      result: null,
      bonusCompare: null
    },
    additionalUi(INITIAL_ADDITIONAL),
    additionalFieldView(INITIAL_ADDITIONAL, false)
  ),

  onLoad() {
    enableShareMenu()
    this.setData(lastInput.restore(), () => this.syncInsurance(additionalPagePatch(this.data)))
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onHide() {
    this.flushPageInput()
  },

  onUnload() {
    this.flushPageInput()
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

  patchAdditional(extra) {
    const pack = calculateAdditionalDeduction(Object.assign({}, this.data, extra || {}))
    this.setData(additionalUi(pack))
  },

  restoreAdditionalSnapshot() {
    const snap = this._additionalSnapshot
    this._additionalSnapshot = null
    const next = { showAdditional: false }
    this.setData(snap ? Object.assign(next, snap) : next)
  },

  flushPageInput() {
    if (this.data.showAdditional && this._additionalSnapshot) {
      lastInput.flush(
        this,
        Object.assign({ showAdditional: false }, this._additionalSnapshot)
      )
      this.restoreAdditionalSnapshot()
      return
    }
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

  onShowAdditional() {
    const pack = calculateAdditionalDeduction(this.data)
    this._additionalSnapshot = additionalUi(pack)
    this.setData(Object.assign({ showAdditional: true }, additionalUi(pack)))
  },

  onCancelAdditional() {
    this.restoreAdditionalSnapshot(true)
  },

  onToggleAdd(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    if (key === 'housingOn') {
      this.patchAdditional({
        housingType: this.data.housingType === 'none' ? 'loan' : 'none'
      })
      return
    }
    const next = !this.data[key]
    const extra = { [key]: next }
    if (key === 'pensionOn' && next && (!this.data.pensionPay || this.data.pensionPay === '0')) {
      extra.pensionPay = '1000'
    }
    this.patchAdditional(extra)
  },

  onAddCount(e) {
    const key = e.currentTarget.dataset.key
    const act = e.currentTarget.dataset.act
    if (!key) return
    const delta = act === 'dec' ? -1 : 1
    this.patchAdditional({ [key]: (Number(this.data[key]) || 1) + delta })
  },

  onSelectAdd(e) {
    const field = e.currentTarget.dataset.field
    const value = e.currentTarget.dataset.value
    if (!field) return
    this.patchAdditional({ [field]: value })
  },

  onAdditionalInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.patchAdditional({ [field]: e.detail.value })
  },

  onPensionPayBlur(e) {
    const value = e.detail.value === '' || e.detail.value == null ? '1000' : e.detail.value
    this.patchAdditional({ pensionPay: value })
  },

  onSkipAdditional() {
    const pack = calculateAdditionalDeduction(this.data)
    this._additionalSnapshot = null
    this.setData(
      Object.assign({ showAdditional: false }, additionalUi(pack), additionalFieldView(pack, false)),
      () => this.recalculate()
    )
  },

  onApplyAdditional() {
    const pack = calculateAdditionalDeduction(this.data)
    this._additionalSnapshot = null
    this.setData(
      Object.assign({ showAdditional: false }, additionalUi(pack), additionalFieldView(pack, true)),
      () => this.recalculate()
    )
  },

  onShowTip() {
    this.setData({ showTip: true })
  },

  onHideTip() {
    this.setData({ showTip: false })
  },

  recalculate() {
    lastInput.save(this)
    const counted = countedAdditional(this.data)
    if (this.data.tab === 'bonus') {
      this.setData({
        result: null,
        bonusCompare: compareBonusMethods({
          bonus: this.data.bonus,
          gross: this.data.gross,
          insurance: this.data.insurance,
          additional: counted.additional,
          additionalOnce: counted.additionalOnce
        })
      })
      return
    }
    this.setData({
      bonusCompare: null,
      result: calculateMonthlySalaryTax({
        gross: this.data.gross,
        insurance: this.data.insurance,
        additional: counted.additional,
        additionalOnce: counted.additionalOnce,
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
