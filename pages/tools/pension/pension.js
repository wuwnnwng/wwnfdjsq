const {
  RETIRE_AGES,
  RESIDENT_RETIRE_AGES,
  PENSION_TYPES,
  calculatePension,
  clampSalaryToBounds,
  salaryRangeTip
} = require('../../../utils/pensionCalc')
const {
  PROVINCES,
  PROVINCE_NAMES,
  DEFAULT_PROVINCE_ID,
  getProvince,
  getProvinceIndex,
  subsidiesOf,
  subsidyOfFee,
  regionFill,
  regionHintText,
  readSavedRegionId,
  saveRegionId
} = require('../../../utils/pensionRegionData')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getPensionToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')

const RETIRE_LABELS = RETIRE_AGES.map((age) => `${age} 岁`)
const RESIDENT_RETIRE_LABELS = RESIDENT_RETIRE_AGES.map((age) => `${age} 岁`)

const DEFAULT_REGION = getProvince(DEFAULT_PROVINCE_ID)
const INITIAL_EMPLOYEE = regionFill(DEFAULT_REGION, 'employee')
const INITIAL_RESIDENT = regionFill(DEFAULT_REGION, 'resident', { annualFee: '2000' })
const lastInput = createLastInput('pension', [
  'type',
  'salary',
  'average',
  'years',
  'returnRate',
  'annualFee',
  'subsidy',
  'basicPension',
  'retireIndex',
  'residentRetireIndex'
])

function nearestIndex(list, value) {
  const age = Number(value)
  if (!Array.isArray(list) || !list.length || !Number.isFinite(age)) return 0
  const exact = list.indexOf(age)
  if (exact >= 0) return exact
  let best = 0
  let bestDiff = Infinity
  list.forEach((item, index) => {
    const diff = Math.abs(item - age)
    if (diff < bestDiff) {
      bestDiff = diff
      best = index
    }
  })
  return best
}

Page({
  data: {
    theme: getThemeId(),
    type: 'employee',
    types: PENSION_TYPES,
    salary: '10000',
    average: INITIAL_EMPLOYEE.average,
    years: '35',
    returnRate: INITIAL_EMPLOYEE.returnRate,
    annualFee: INITIAL_RESIDENT.annualFee,
    subsidy: INITIAL_RESIDENT.subsidy,
    basicPension: INITIAL_RESIDENT.basicPension,
    residentGrades: INITIAL_RESIDENT.residentGrades,
    retireAges: RETIRE_AGES,
    retireLabels: RETIRE_LABELS,
    retireIndex: 3,
    residentRetireLabels: RESIDENT_RETIRE_LABELS,
    residentRetireIndex: 0,
    regionId: DEFAULT_REGION.id,
    regionIndex: getProvinceIndex(DEFAULT_REGION.id),
    regionNames: PROVINCE_NAMES,
    regionHint: regionHintText(DEFAULT_REGION, 'employee'),
    result: null,
    showTip: false,
    showRangeTip: false,
    rangeTipText: ''
  },

  onLoad(options) {
    enableShareMenu()
    const saved = lastInput.restore()
    const patch = Object.assign({}, saved)
    const type = options && options.type
    if (type === 'employee' || type === 'flexible' || type === 'resident') {
      patch.type = type
    }
    const retireAge = Number(options && options.retireAge)
    if (Number.isFinite(retireAge) && retireAge > 0) {
      if (patch.type === 'resident' || type === 'resident') {
        patch.residentRetireIndex = nearestIndex(RESIDENT_RETIRE_AGES, retireAge)
      } else {
        patch.retireIndex = nearestIndex(RETIRE_AGES, retireAge)
      }
    }
    if (patch.retireIndex != null) {
      const idx = Number(patch.retireIndex)
      patch.retireIndex = idx >= 0 && idx < RETIRE_AGES.length ? idx : 3
    }
    if (patch.residentRetireIndex != null) {
      const idx = Number(patch.residentRetireIndex)
      patch.residentRetireIndex = idx >= 0 && idx < RESIDENT_RETIRE_AGES.length ? idx : 0
    }
    const regionId = readSavedRegionId()
    const apply = () => this.applyRegion(regionId, { persist: false, snapFee: false, preserve: saved })
    if (Object.keys(patch).length) {
      this.setData(patch, apply)
      return
    }
    apply()
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

  preventMove() {},

  applyRegion(regionId, options) {
    const persist = !options || options.persist !== false
    const region = getProvince(regionId)
    const type = this.data.type || 'employee'
    const fill = regionFill(region, type, {
      annualFee: this.data.annualFee,
      snapFee: !options || options.snapFee !== false
    })
    const preserve = options && options.preserve
    if (preserve) {
      ;['salary', 'average', 'years', 'returnRate', 'annualFee', 'subsidy', 'basicPension'].forEach((key) => {
        if (preserve[key] != null && preserve[key] !== '') fill[key] = preserve[key]
      })
    }
    this.setData(
      {
        regionId: region.id,
        regionIndex: getProvinceIndex(region.id),
        regionHint: regionHintText(region, type),
        ...fill
      },
      () => {
        const promptRange = options && options.promptRange === true
        if (type !== 'resident' && this.applySalaryRange({ prompt: promptRange })) return
        this.recalculate()
      }
    )
    if (persist) saveRegionId(region.id)
  },

  onRegionChange(e) {
    const index = Number(e.detail.value)
    const region = PROVINCES[index]
    if (!region) return
    this.applyRegion(region.id, { promptRange: true })
  },

  onSwitchType(e) {
    const type = e.currentTarget.dataset.type
    if (!type || type === this.data.type) return
    this.setData({ type }, () =>
      this.applyRegion(this.data.regionId, { persist: false, snapFee: false })
    )
  },

  applySalaryRange({ prompt = true, salaryText, averageText } = {}) {
    if (this.data.type === 'resident') return false
    const result = clampSalaryToBounds(
      salaryText != null ? salaryText : this.data.salary,
      averageText != null ? averageText : this.data.average
    )
    if (!result.changed) return false
    const patch = { salary: result.salaryText }
    if (prompt) {
      patch.showRangeTip = true
      patch.rangeTipText = salaryRangeTip(this.data.type, result.side, result.salary)
    }
    this.setData(patch, () => this.recalculate())
    return true
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    if (field === 'salary' && this.data.type !== 'resident') {
      const result = clampSalaryToBounds(e.detail.value, this.data.average)
      if (result.changed && result.side === 'cap') {
        this.applySalaryRange({ prompt: true, salaryText: e.detail.value })
        return result.salaryText
      }
    }
    const patch = { [field]: e.detail.value }
    if (field === 'annualFee') {
      const fee = Number(String(e.detail.value).trim())
      if (Number.isFinite(fee) && fee > 0) {
        const subsidies = subsidiesOf(getProvince(this.data.regionId))
        patch.subsidy = String(subsidyOfFee(fee, subsidies))
      }
    }
    this.setData(patch, () => this.recalculate())
  },

  onRangeBlur(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail && e.detail.value != null ? e.detail.value : ''
    const patch = field ? { [field]: value } : {}
    this.setData(patch, () => {
      if (!this.applySalaryRange({ prompt: true })) this.recalculate()
    })
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

  onHideRangeTip() {
    this.setData({ showRangeTip: false })
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
    }, () => lastInput.save(this))
  },

  onShareAppMessage() {
    return getPensionToolShare().appMessage
  },

  onShareTimeline() {
    return getPensionToolShare().timeline
  }
})
