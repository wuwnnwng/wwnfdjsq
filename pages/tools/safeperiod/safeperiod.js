const { todayYMD, addDaysYMD } = require('../../../utils/datetimeCalc')
const { calculateSafePeriod } = require('../../../utils/safePeriodCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getSafePeriodToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')

const lastInput = createLastInput('safeperiod', ['lastPeriod', 'cycle', 'periodDays'])

Page({
  data: {
    theme: getThemeId(),
    lastPeriod: '',
    cycle: '28',
    periodDays: '5',
    result: null,
    showDatePicker: false,
    datePickerValue: '',
    showDayTip: false,
    selectedDay: null
  },

  onLoad() {
    enableShareMenu()
    const today = todayYMD()
    const saved = lastInput.restore()
    this.setData(
      {
        lastPeriod: saved.lastPeriod || addDaysYMD(today, -8),
        cycle: saved.cycle || this.data.cycle,
        periodDays: saved.periodDays || this.data.periodDays
      },
      () => this.recalculate()
    )
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

  preventMove() {},

  onDayDialogTap() {},

  onSelectDay(e) {
    const days = (this.data.result && this.data.result.days) || []
    const index = Number(e.currentTarget.dataset.index)
    const selectedDay = days[index]
    if (!selectedDay) return
    this.setData({ selectedDay, showDayTip: true })
  },

  onHideDayTip() {
    this.setData({ showDayTip: false })
  },

  recalculate() {
    this.setData({
      showDayTip: false,
      result: calculateSafePeriod({
        lastPeriodText: this.data.lastPeriod,
        cycleText: this.data.cycle,
        periodText: this.data.periodDays,
        asOfText: todayYMD()
      })
    }, () => lastInput.save(this))
  },

  onShareAppMessage() {
    return getSafePeriodToolShare().appMessage
  },

  onShareTimeline() {
    return getSafePeriodToolShare().timeline
  }
})
