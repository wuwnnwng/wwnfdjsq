const { todayYMD } = require('../../../utils/datetimeCalc')
const { PERSON_TYPES, TYPE_HINTS, calculateRetireAge } = require('../../../utils/retireAgeCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getRetireToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')

const lastInput = createLastInput('retire', ['type', 'birth'])

function pad2(n) {
  return String(n).padStart(2, '0')
}

function defaultBirthYMD() {
  const now = new Date()
  const year = now.getFullYear() - 35
  const month = now.getMonth() + 1
  return `${year}-${pad2(month)}-01`
}

function formatBirthDisplay(ymd) {
  const matched = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(ymd || '').trim())
  if (!matched) return '请选择'
  return `${Number(matched[1])}年${Number(matched[2])}月${Number(matched[3])}日`
}

const INITIAL_AS_OF = todayYMD()
const INITIAL_BIRTH = defaultBirthYMD()

Page({
  data: {
    theme: getThemeId(),
    types: PERSON_TYPES,
    type: 'male_employee',
    typeHint: TYPE_HINTS.male_employee,
    birth: INITIAL_BIRTH,
    birthDisplay: formatBirthDisplay(INITIAL_BIRTH),
    asOf: INITIAL_AS_OF,
    result: null,
    showTip: false,
    showDatePicker: false,
    datePickerTitle: '选择出生年月',
    datePickerValue: INITIAL_BIRTH,
    datePickerStart: '1940-01-01',
    datePickerEnd: INITIAL_AS_OF
  },

  onLoad() {
    enableShareMenu()
    const asOf = todayYMD()
    const saved = lastInput.restore()
    const type = PERSON_TYPES.some((item) => item.id === saved.type) ? saved.type : this.data.type
    const birth = saved.birth || this.data.birth
    this.setData(
      {
        asOf,
        datePickerEnd: asOf,
        type,
        typeHint: TYPE_HINTS[type] || '',
        birth,
        birthDisplay: formatBirthDisplay(birth)
      },
      () => this.recalculate()
    )
  },

  onShow() {
    const theme = getThemeId()
    const asOf = todayYMD()
    this.setData({ theme, asOf, datePickerEnd: asOf })
    applyThemeChrome(theme)
    this.recalculate()
  },

  onHide() {
    lastInput.flush(this)
  },

  onUnload() {
    lastInput.flush(this)
  },

  preventMove() {},

  onSwitchType(e) {
    const type = e.currentTarget.dataset.type
    if (!type || type === this.data.type) return
    this.setData(
      {
        type,
        typeHint: TYPE_HINTS[type] || ''
      },
      () => this.recalculate()
    )
  },

  onOpenBirthPicker() {
    this.setData({
      showDatePicker: true,
      datePickerTitle: '选择出生年月',
      datePickerValue: this.data.birth || defaultBirthYMD(),
      datePickerStart: '1940-01-01',
      datePickerEnd: this.data.asOf || todayYMD()
    })
  },

  onHideDatePicker() {
    this.setData({ showDatePicker: false })
  },

  onDatePickerConfirm(e) {
    const value = (e.detail && e.detail.value) || ''
    if (!value) {
      this.setData({ showDatePicker: false })
      return
    }
    this.setData(
      {
        birth: value,
        birthDisplay: formatBirthDisplay(value),
        showDatePicker: false
      },
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
    this.setData(
      {
        result: calculateRetireAge({
          typeId: this.data.type,
          birthText: this.data.birth,
          asOfText: this.data.asOf || todayYMD()
        })
      },
      () => lastInput.save(this)
    )
  },

  onGoPension() {
    const result = this.data.result
    if (!result || !result.valid) {
      wx.showToast({ title: '请先算出退休时间', icon: 'none' })
      return
    }
    const type = result.pensionType || 'employee'
    const retireAge = result.pensionRetireAge || 60
    wx.navigateTo({
      url: `/pages/tools/pension/pension?type=${encodeURIComponent(type)}&retireAge=${encodeURIComponent(String(retireAge))}`
    })
  },

  onShareAppMessage() {
    return getRetireToolShare().appMessage
  },

  onShareTimeline() {
    return getRetireToolShare().timeline
  }
})
