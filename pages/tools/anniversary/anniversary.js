const {
  TYPES,
  TYPE_MAP,
  NAME_MAX_LEN,
  todayYMD,
  listAnniversaryViews,
  decorateItem,
  upsertAnniversary,
  removeAnniversary,
  markCelebrated,
  shouldAutoCelebrate
} = require('../../../utils/anniversary')
const { formatDateText, parseYMD } = require('../../../utils/datetimeCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getAnniversaryToolShare } = require('../../../utils/share')
const { createConfettiPieces } = require('../../../utils/confetti')

function dateDisplay(ymd) {
  const date = parseYMD(ymd)
  return date ? formatDateText(date) : ymd || '请选择日期'
}

function typeDefaultName(typeId, currentName) {
  const type = TYPE_MAP[typeId] || TYPE_MAP.custom
  const names = TYPES.map((item) => item.defaultTitle)
  if (!currentName || names.indexOf(currentName) >= 0) return type.defaultTitle
  return currentName
}

function celebratePayload(item) {
  if (!item) return null
  const popupTitle = item.isToday ? '纪念日快乐' : item.isPast ? '已经过去' : '倒计时'
  const popupSub = item.isToday
    ? item.years > 0
      ? `${item.dateText} · ${item.yearsText}`
      : `${item.dateText} · ${item.lunarText}`
    : item.isPast
      ? `${item.dateText} · 已过 ${item.daysUntilText} 天`
      : `${item.nextDateText} ${item.nextWeekday}`
  return {
    ...item,
    popupTitle,
    popupSub
  }
}

Page({
  data: {
    theme: getThemeId(),
    types: TYPES,
    nameMaxLen: NAME_MAX_LEN,
    items: [],
    hero: null,
    showEditor: false,
    editingId: '',
    draftType: 'love',
    draftName: '恋爱纪念日',
    draftDate: '',
    draftDateDisplay: '',
    draftYearly: true,
    showDatePicker: false,
    showCelebrate: false,
    celebrate: null,
    confettiPieces: []
  },

  onLoad() {
    enableShareMenu()
    this.refreshList({ autoCelebrate: true })
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    this.refreshList()
  },

  onUnload() {
    if (this._celebrateTimer) {
      clearTimeout(this._celebrateTimer)
      this._celebrateTimer = null
    }
  },

  refreshList(options) {
    const items = listAnniversaryViews()
    const hero = items.find((item) => !item.isPast) || items[0] || null
    this.setData({ items, hero }, () => {
      if (!options || !options.autoCelebrate) return
      const todayItem = items.find((item) => shouldAutoCelebrate(item))
      if (!todayItem) return
      this.openCelebrate(todayItem, { persist: true, delay: 320 })
    })
  },

  onOpenEditor() {
    const today = todayYMD()
    this.setData({
      showEditor: true,
      editingId: '',
      draftType: 'love',
      draftName: TYPE_MAP.love.defaultTitle,
      draftDate: today,
      draftDateDisplay: dateDisplay(today),
      draftYearly: true
    })
  },

  onHideEditor() {
    this.setData({ showEditor: false, showDatePicker: false })
  },

  onEditorSheetTap() {},

  onSelectType(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.data.draftType) return
    this.setData({
      draftType: id,
      draftName: typeDefaultName(id, this.data.draftName)
    })
  },

  onNameInput(e) {
    this.setData({ draftName: e.detail.value })
  },

  onYearlyChange(e) {
    this.setData({ draftYearly: e.currentTarget.dataset.yearly === '1' })
  },

  onOpenDatePicker() {
    this.setData({ showDatePicker: true })
  },

  onHideDatePicker() {
    this.setData({ showDatePicker: false })
  },

  onDatePickerConfirm(e) {
    const value = (e.detail && e.detail.value) || this.data.draftDate
    this.setData({
      draftDate: value,
      draftDateDisplay: dateDisplay(value),
      showDatePicker: false
    })
  },

  onSaveEditor() {
    const name = String(this.data.draftName || '').trim()
    if (!name) {
      wx.showToast({ title: '请填写名称', icon: 'none' })
      return
    }
    const isNew = !this.data.editingId
    const result = upsertAnniversary({
      id: this.data.editingId,
      name,
      date: this.data.draftDate,
      yearly: this.data.draftYearly,
      type: this.data.draftType
    })
    if (!result.ok) {
      wx.showToast({ title: result.message || '保存失败', icon: 'none' })
      return
    }
    this.setData({ showEditor: false })
    this.refreshList()
    const view = decorateItem(result.item)
    if (isNew && view) {
      this.openCelebrate(view, { persist: view.isToday, delay: 180 })
    } else {
      wx.showToast({ title: '已保存', icon: 'success' })
    }
  },

  onDeleteCurrent() {
    const id = this.data.editingId
    if (!id) return
    wx.showModal({
      title: '删除纪念日',
      content: `确定删除「${this.data.draftName}」？`,
      confirmText: '删除',
      confirmColor: '#e11d48',
      success: (res) => {
        if (!res.confirm) return
        removeAnniversary(id)
        this.setData({ showEditor: false })
        this.refreshList()
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  },

  onOpenCelebrate(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.items.find((row) => row.id === id)
    if (!item) return
    this.openCelebrate(item, { persist: item.isToday })
  },

  onEditItem(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.items.find((row) => row.id === id)
    if (!item) return
    this.openEditorFor(item)
  },

  openEditorFor(item) {
    this.setData({
      showEditor: true,
      editingId: item.id,
      draftType: item.type,
      draftName: item.name,
      draftDate: item.date,
      draftDateDisplay: dateDisplay(item.date),
      draftYearly: item.yearly !== false
    })
  },

  openCelebrate(item, options) {
    const celebrate = celebratePayload(item)
    if (!celebrate) return
    if (this._celebrateTimer) {
      clearTimeout(this._celebrateTimer)
      this._celebrateTimer = null
    }
    const delay = options && Number(options.delay) ? Number(options.delay) : 0
    const show = () => {
      if (options && options.persist && item.isToday) {
        markCelebrated(item.id)
      }
      this.setData({
        showCelebrate: true,
        celebrate,
        confettiPieces: createConfettiPieces()
      })
    }
    if (delay > 0) {
      this._celebrateTimer = setTimeout(() => {
        this._celebrateTimer = null
        show()
      }, delay)
      return
    }
    show()
  },

  onCelebrateDialogTap() {},

  onCloseCelebrate() {
    this.setData({ showCelebrate: false, confettiPieces: [], celebrate: null })
  },

  preventMove() {},

  onShareAppMessage() {
    return getAnniversaryToolShare().appMessage
  },

  onShareTimeline() {
    return getAnniversaryToolShare().timeline
  }
})
