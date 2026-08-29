const {
  RETIRE_AGES,
  RESIDENT_RETIRE_AGES,
  RESIDENT_GRADES,
  PENSION_TYPES,
  calculatePension,
  subsidyOf
} = require('../../../utils/pensionCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getPensionToolShare } = require('../../../utils/share')

const RETIRE_LABELS = RETIRE_AGES.map((age) => `${age} 岁`)
const RESIDENT_RETIRE_LABELS = RESIDENT_RETIRE_AGES.map((age) => `${age} 岁`)

Page({
  data: {
    theme: getThemeId(),
    type: 'employee',
    types: PENSION_TYPES,
    salary: '10000',
    average: '10000',
    years: '35',
    returnRate: '3',
    annualFee: '2000',
    subsidy: '120',
    basicPension: '200',
    residentGrades: RESIDENT_GRADES.map((item) => ({
      ...item,
      feeText: String(item.fee),
      label: `${item.fee}`
    })),
    retireAges: RETIRE_AGES,
    retireLabels: RETIRE_LABELS,
    retireIndex: 2,
    residentRetireLabels: RESIDENT_RETIRE_LABELS,
    residentRetireIndex: 0,
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

  onSwitchType(e) {
    const type = e.currentTarget.dataset.type
    if (!type || type === this.data.type) return
    this.setData({ type }, () => this.recalculate())
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    const patch = { [field]: e.detail.value }
    if (field === 'annualFee') {
      const fee = Number(String(e.detail.value).trim())
      if (Number.isFinite(fee) && fee > 0) patch.subsidy = String(subsidyOf(fee))
    }
    this.setData(patch, () => this.recalculate())
  },

  onSelectGrade(e) {
    const fee = e.currentTarget.dataset.fee
    const subsidy = e.currentTarget.dataset.subsidy
    if (fee == null) return
    this.setData(
      {
        annualFee: String(fee),
        subsidy: String(subsidy)
      },
      () => this.recalculate()
    )
  },

  onRetireChange(e) {
    this.setData({ retireIndex: Number(e.detail.value) }, () => this.recalculate())
  },

  onResidentRetireChange(e) {
    this.setData({ residentRetireIndex: Number(e.detail.value) }, () => this.recalculate())
  },

  onShowTip() {
    this.setData({ showTip: true })
  },

  onHideTip() {
    this.setData({ showTip: false })
  },

  recalculate() {
    const type = this.data.type || 'employee'
    const retireAge =
      type === 'resident'
        ? RESIDENT_RETIRE_AGES[this.data.residentRetireIndex] || 60
        : RETIRE_AGES[this.data.retireIndex] || 60
    this.setData({
      result: calculatePension({
        type,
        salaryText: this.data.salary,
        averageText: this.data.average,
        yearsText: this.data.years,
        retireAge,
        returnText: this.data.returnRate,
        annualFeeText: this.data.annualFee,
        subsidyText: this.data.subsidy,
        basicText: this.data.basicPension
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
