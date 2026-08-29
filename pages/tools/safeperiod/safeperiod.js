const { todayYMD, addDaysYMD } = require('../../../utils/datetimeCalc')
const { calculateSafePeriod } = require('../../../utils/safePeriodCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getSafePeriodToolShare } = require('../../../utils/share')

Page({
  data: {
    theme: getThemeId(),
    lastPeriod: '',
    cycle: '28',
    periodDays: '5',
    result: null,
    showDatePicker: false,
    datePickerValue: ''
  },

  onLoad() {
    enableShareMenu()
    const today = todayYMD()
    this.setData({ lastPeriod: addDaysYMD(today, -8) }, () => this.recalculate())
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: e.detail.value }, () => this.recalculate())
  },

  onOpenDatePicker() {
    this.setData({
      datePickerValue: this.data.lastPeriod || todayYMD(),
      showDatePicker: true
    })
  },

  onHideDatePicker() {
    this.setData({ showDatePicker: false })
  },

  onDatePickerConfirm(e) {
    const value = (e.detail && e.detail.value) || ''
    this.setData(
      {
        lastPeriod: value,
        showDatePicker: false
      },
      () => this.recalculate()
    )
  },

  recalculate() {
    this.setData({
      result: calculateSafePeriod({
        lastPeriodText: this.data.lastPeriod,
        cycleText: this.data.cycle,
        periodText: this.data.periodDays,
        asOfText: todayYMD()
      })
    })
  },

  onShareAppMessage() {
    return getSafePeriodToolShare().appMessage
  },

  onShareTimeline() {
    return getSafePeriodToolShare().timeline
  }
})
