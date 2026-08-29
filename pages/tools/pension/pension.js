const { RETIRE_AGES, RESIDENT_RETIRE_AGES, PENSION_TYPES, calculatePension } = require('../../../utils/pensionCalc')
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

const RETIRE_LABELS = RETIRE_AGES.map((age) => `${age} 岁`)
const RESIDENT_RETIRE_LABELS = RESIDENT_RETIRE_AGES.map((age) => `${age} 岁`)

const DEFAULT_REGION = getProvince(DEFAULT_PROVINCE_ID)
const INITIAL_EMPLOYEE = regionFill(DEFAULT_REGION, 'employee')
const INITIAL_RESIDENT = regionFill(DEFAULT_REGION, 'resident', { annualFee: '2000' })

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
    retireIndex: 2,
    residentRetireLabels: RESIDENT_RETIRE_LABELS,
    residentRetireIndex: 0,
    regionId: DEFAULT_REGION.id,
    regionIndex: getProvinceIndex(DEFAULT_REGION.id),
    regionNames: PROVINCE_NAMES,
    regionHint: regionHintText(DEFAULT_REGION, 'employee'),
    result: null,
    showTip: false
  },

  onLoad() {
    enableShareMenu()
    const regionId = readSavedRegionId()
    this.applyRegion(regionId, { persist: false })
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
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
    this.setData(
      {
        regionId: region.id,
        regionIndex: getProvinceIndex(region.id),
        regionHint: regionHintText(region, type),
        ...fill
      },
      () => this.recalculate()
    )
    if (persist) saveRegionId(region.id)
  },

  onRegionChange(e) {
    const index = Number(e.detail.value)
    const region = PROVINCES[index]
    if (!region) return
    this.applyRegion(region.id)
  },

  onSwitchType(e) {
    const type = e.currentTarget.dataset.type
    if (!type || type === this.data.type) return
    this.setData({ type }, () =>
      this.applyRegion(this.data.regionId, { persist: false, snapFee: false })
    )
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
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
