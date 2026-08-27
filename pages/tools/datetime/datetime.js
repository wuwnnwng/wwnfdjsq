const {
  TIME_UNITS,
  OFFSET_UNITS,
  todayYMD,
  addDaysYMD,
  convertDuration,
  diffDates,
  addOffset
} = require('../../../utils/datetimeCalc')
const { solarToLunar, formatLunarDate } = require('../../../utils/lunar')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getDatetimeToolShare } = require('../../../utils/share')

const TIME_LABELS = TIME_UNITS.map((item) => item.name)
const OFFSET_LABELS = OFFSET_UNITS.map((item) => item.name)

function attachLunar(result) {
  if (!result || !result.valid || !result.date) return result
  const lunar = solarToLunar(result.year, result.month, result.day)
  return {
    ...result,
    lunarText: formatLunarDate(lunar)
  }
}

Page({
  data: {
    theme: getThemeId(),
    tab: 'convert',
    timeUnits: TIME_UNITS,
    timeLabels: TIME_LABELS,
    offsetUnits: OFFSET_UNITS,
    offsetLabels: OFFSET_LABELS,
    inputValue: '90',
    fromIndex: 1,
    toIndex: 2,
    fromName: '秒',
    toName: '分钟',
    startDate: '',
    endDate: '',
    baseDate: '',
    offsetValue: '30',
    offsetUnitIndex: 0,
    offsetDirection: 'after',
    convertResult: null,
    diffResult: null,
    offsetResult: null,
    showDatePicker: false,
    datePickerTitle: '选择日期',
    datePickerValue: ''
  },

  onLoad() {
    enableShareMenu()
    const today = todayYMD()
    this.setData(
      {
        startDate: today,
        endDate: addDaysYMD(today, 30),
        baseDate: today
      },
      () => this.recalculate()
    )
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.tab) return
    this.setData({ tab }, () => this.recalculate())
  },

  onInputValue(e) {
    this.setData({ inputValue: e.detail.value }, () => this.recalculate())
  },

  onFromUnitChange(e) {
    const fromIndex = Number(e.detail.value)
    const from = TIME_UNITS[fromIndex]
    this.setData(
      {
        fromIndex,
        fromName: from ? from.name : ''
      },
      () => this.recalculate()
    )
  },

  onToUnitChange(e) {
    const toIndex = Number(e.detail.value)
    const to = TIME_UNITS[toIndex]
    this.setData(
      {
        toIndex,
        toName: to ? to.name : ''
      },
      () => this.recalculate()
    )
  },

  onSelectToUnit(e) {
    const toIndex = Number(e.currentTarget.dataset.index)
    const to = TIME_UNITS[toIndex]
    if (!to) return
    this.setData({ toIndex, toName: to.name }, () => this.recalculate())
  },

  onSwapUnits() {
    const { fromIndex, toIndex, fromName, toName, convertResult } = this.data
    this.setData(
      {
        fromIndex: toIndex,
        toIndex: fromIndex,
        fromName: toName,
        toName: fromName,
        inputValue: convertResult && convertResult.valid ? convertResult.valueText : this.data.inputValue
      },
      () => this.recalculate()
    )
  },

  onOpenDatePicker(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    const titles = {
      startDate: '选择开始日期',
      endDate: '选择结束日期',
      baseDate: '选择起始日期'
    }
    this._datePickerField = field
    this.setData({
      datePickerTitle: titles[field] || '选择日期',
      datePickerValue: this.data[field] || '',
      showDatePicker: true
    })
  },

  onHideDatePicker() {
    this.setData({ showDatePicker: false })
  },

  onDatePickerConfirm(e) {
    const field = this._datePickerField
    const value = (e.detail && e.detail.value) || ''
    if (!field) {
      this.setData({ showDatePicker: false })
      return
    }
    this.setData(
      {
        [field]: value,
        showDatePicker: false
      },
      () => this.recalculate()
    )
  },

  onSwapDates() {
    this.setData(
      {
        startDate: this.data.endDate,
        endDate: this.data.startDate
      },
      () => this.recalculate()
    )
  },

  onOffsetValue(e) {
    this.setData({ offsetValue: e.detail.value }, () => this.recalculate())
  },

  onOffsetUnitChange(e) {
    this.setData({ offsetUnitIndex: Number(e.detail.value) }, () => this.recalculate())
  },

  onOffsetDirection(e) {
    const offsetDirection = e.currentTarget.dataset.dir
    if (!offsetDirection || offsetDirection === this.data.offsetDirection) return
    this.setData({ offsetDirection }, () => this.recalculate())
  },

  onQuickOffset(e) {
    const value = e.currentTarget.dataset.value
    const unit = e.currentTarget.dataset.unit
    const unitIndex = OFFSET_UNITS.findIndex((item) => item.key === unit)
    this.setData(
      {
        offsetValue: String(value),
        offsetUnitIndex: unitIndex >= 0 ? unitIndex : 0
      },
      () => this.recalculate()
    )
  },

  recalculate() {
    const from = TIME_UNITS[this.data.fromIndex] || TIME_UNITS[1]
    const to = TIME_UNITS[this.data.toIndex] || TIME_UNITS[2]
    const offsetUnit = OFFSET_UNITS[this.data.offsetUnitIndex] || OFFSET_UNITS[0]
    this.setData({
      convertResult: convertDuration(this.data.inputValue, from.key, to.key),
      diffResult: diffDates(this.data.startDate, this.data.endDate),
      offsetResult: attachLunar(
        addOffset(this.data.baseDate, this.data.offsetValue, offsetUnit.key, this.data.offsetDirection)
      )
    })
  },

  onShareAppMessage() {
    return getDatetimeToolShare().appMessage
  },

  onShareTimeline() {
    return getDatetimeToolShare().timeline
  }
})
