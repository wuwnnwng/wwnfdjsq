const { todayYMD } = require('../../../utils/datetimeCalc')
const { calculateDueDate } = require('../../../utils/dueDateCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getDueDateToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')

const lastInput = createLastInput('duedate', ['mode', 'baseDate'])

Page({
  data: {
    theme: getThemeId(),
    mode: 'lmp',
    baseDate: '',
    asOf: '',
    result: null,
    showDatePicker: false,
    datePickerTitle: '选择日期',
    datePickerValue: '',
    datePickerStart: '1900-01-01',
    datePickerEnd: '2100-12-31'
  },

  onLoad() {
    enableShareMenu()
    const today = todayYMD()
    const saved = lastInput.restore()
    const mode = saved.mode === 'conception' ? 'conception' : 'lmp'
    this.setData(
      {
        mode,
        baseDate: saved.baseDate || today,
        asOf: today
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

  onSwitchMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.mode) return
    this.setData({ mode }, () => this.recalculate())
  },

  onOpenDatePicker(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    const today = todayYMD()
    const titles = {
      baseDate: this.data.mode === 'conception' ? '选择受孕日期' : '选择末次月经',
      asOf: '选择计算日期'
    }
    this._datePickerField = field
    this.setData({
      datePickerTitle: titles[field] || '选择日期',
      datePickerValue: this.data[field] || today,
      datePickerStart: field === 'asOf' ? this.data.baseDate || '1900-01-01' : '1900-01-01',
      datePickerEnd: '2100-12-31',
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
    const patch = {
      [field]: value,
      showDatePicker: false
    }
    if (field === 'baseDate' && this.data.asOf && value > this.data.asOf) {
      patch.asOf = value
    }
    this.setData(patch, () => this.recalculate())
  },

  recalculate() {
    this.setData({
      result: calculateDueDate({
        mode: this.data.mode,
        baseDateText: this.data.baseDate,
        asOfText: this.data.asOf
      })
    }, () => lastInput.save(this))
  },

  onShareAppMessage() {
    return getDueDateToolShare().appMessage
  },

  onShareTimeline() {
    return getDueDateToolShare().timeline
  }
})
