const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getDrinkWheelToolShare } = require('../../../utils/share')
const {
  MIN_OPTIONS,
  MAX_OPTIONS,
  DEFAULT_OPTIONS,
  clampText,
  isSameOptions,
  readOptions,
  writeOptions,
  resetOptions,
  shuffleOptions,
  buildWheelView,
  pickIndex,
  nextWheelDeg
} = require('../../../utils/drinkWheel')
const { createGameSfx, wheelTickDelays } = require('../../../utils/gameSfx')

const SPIN_MS = 3200
const EDIT_HINT_KEY = 'drinkWheel:editHintSeen'

function readEditHint() {
  try {
    return !wx.getStorageSync(EDIT_HINT_KEY)
  } catch (e) {
    return true
  }
}

function markEditHintSeen() {
  try {
    wx.setStorageSync(EDIT_HINT_KEY, 1)
  } catch (e) {}
}

function applyWheel(page, options, extra) {
  const view = buildWheelView(options)
  page.setData(
    Object.assign(
      {
        options: view.options,
        slices: view.slices,
        wheelBg: view.wheelBg,
        optionCount: view.count,
        optionRows: view.options.map((text, i) => ({
          id: `opt-${i}`,
          index: i,
          text
        })),
        canAdd: view.count < MAX_OPTIONS,
        canRemove: view.count > MIN_OPTIONS,
        isDefault: isSameOptions(view.options, DEFAULT_OPTIONS)
      },
      extra || {}
    )
  )
}

Page({
  data: {
    theme: getThemeId(),
    options: DEFAULT_OPTIONS.slice(),
    slices: [],
    wheelBg: '',
    optionCount: 9,
    optionRows: [],
    minOptions: MIN_OPTIONS,
    maxOptions: MAX_OPTIONS,
    canAdd: true,
    canRemove: true,
    isDefault: true,
    spinning: false,
    wheelDeg: 0,
    wheelStyle: '',
    lastText: '',
    showOptions: false,
    editHint: true,
    showEditor: false,
    editIndex: -1,
    editValue: '',
    editorTitle: '编辑条目'
  },

  onLoad() {
    enableShareMenu()
    this._sfx = createGameSfx()
    applyWheel(this, readOptions(), {
      wheelStyle: 'transform: rotate(0deg);',
      editHint: readEditHint()
    })
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onUnload() {
    this.clearSpinTimers()
    if (this._sfx) {
      this._sfx.destroy()
      this._sfx = null
    }
  },

  clearSpinTimers() {
    if (this._spinTimer) {
      clearTimeout(this._spinTimer)
      this._spinTimer = null
    }
    if (this._wheelTickTimers && this._wheelTickTimers.length) {
      this._wheelTickTimers.forEach((id) => clearTimeout(id))
      this._wheelTickTimers = []
    }
  },

  preventMove() {},

  onSheetTap() {},

  onSpin() {
    if (this.data.spinning) return
    const options = this.data.options || []
    if (options.length < MIN_OPTIONS) return
    if (this._sfx) this._sfx.prepare()
    const index = pickIndex(options.length)
    const prevDeg = this.data.wheelDeg
    const nextDeg = nextWheelDeg(prevDeg, options.length, index)
    this.clearSpinTimers()
    this.setData({
      spinning: true,
      lastText: '',
      wheelDeg: nextDeg,
      wheelStyle: `transform: rotate(${nextDeg}deg); transition: transform ${SPIN_MS}ms cubic-bezier(0.12, 0.7, 0.18, 1);`
    })
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
    const delays = wheelTickDelays(SPIN_MS, nextDeg - prevDeg, options.length)
    this._wheelTickTimers = delays.map((delay) =>
      setTimeout(() => {
        if (this._sfx) this._sfx.play('wheelTick')
      }, delay)
    )
    this._spinTimer = setTimeout(() => {
      this._spinTimer = null
      this._wheelTickTimers = []
      this.setData({
        spinning: false,
        lastText: options[index]
      })
      if (this._sfx) this._sfx.play('wheelLand')
      if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' })
    }, SPIN_MS)
  },

  onOpenOptions() {
    if (this.data.spinning) return
    if (this.data.editHint) markEditHintSeen()
    this.setData({ showOptions: true, editHint: false })
  },

  onCloseOptions() {
    this.setData({ showOptions: false })
  },

  onOpenAdd() {
    if (this.data.spinning) return
    if (!this.data.canAdd) {
      wx.showToast({ title: `最多 ${MAX_OPTIONS} 条`, icon: 'none' })
      return
    }
    this.setData({
      showEditor: true,
      editIndex: -1,
      editValue: '',
      editorTitle: '新增条目'
    })
  },

  onOpenEdit(e) {
    if (this.data.spinning) return
    const index = Number(e.currentTarget.dataset.index)
    const text = this.data.options[index]
    if (!text) return
    this.setData({
      showEditor: true,
      editIndex: index,
      editValue: text,
      editorTitle: '编辑条目'
    })
  },

  onEditInput(e) {
    this.setData({ editValue: e.detail.value })
  },

  onCancelEditor() {
    this.setData({ showEditor: false })
  },

  onConfirmEditor() {
    const text = clampText(this.data.editValue)
    if (!text) {
      wx.showToast({ title: '请填写内容', icon: 'none' })
      return
    }
    const next = this.data.options.slice()
    const editIndex = Number(this.data.editIndex)
    const duplicated = next.some((item, i) => item === text && i !== editIndex)
    if (duplicated) {
      wx.showToast({ title: '这条已经有了', icon: 'none' })
      return
    }
    if (editIndex >= 0) {
      next[editIndex] = text
    } else {
      if (next.length >= MAX_OPTIONS) {
        wx.showToast({ title: `最多 ${MAX_OPTIONS} 条`, icon: 'none' })
        return
      }
      next.push(text)
    }
    const saved = writeOptions(next)
    applyWheel(this, saved, { showEditor: false, lastText: '' })
  },

  onRemoveOption(e) {
    if (this.data.spinning) return
    if (!this.data.canRemove) {
      wx.showToast({ title: `至少保留 ${MIN_OPTIONS} 条`, icon: 'none' })
      return
    }
    const index = Number(e.currentTarget.dataset.index)
    const next = this.data.options.slice()
    if (index < 0 || index >= next.length) return
    next.splice(index, 1)
    const saved = writeOptions(next)
    applyWheel(this, saved, { lastText: '' })
  },

  onShuffle() {
    if (this.data.spinning) return
    const shuffled = shuffleOptions(this.data.options)
    applyWheel(this, shuffled, {
      lastText: '',
      wheelDeg: 0,
      wheelStyle: 'transform: rotate(0deg); transition: none;'
    })
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
  },

  onResetDefault() {
    if (this.data.spinning || this.data.isDefault) return
    wx.showModal({
      title: '恢复默认模板',
      content: '会换成那 9 条常用句子，当前自定义内容会被覆盖。',
      confirmText: '恢复',
      success: (res) => {
        if (!res.confirm) return
        const saved = resetOptions()
        applyWheel(this, saved, {
          lastText: '',
          wheelDeg: 0,
          wheelStyle: 'transform: rotate(0deg); transition: none;'
        })
      }
    })
  },

  onShareAppMessage() {
    return getDrinkWheelToolShare().appMessage
  },

  onShareTimeline() {
    return getDrinkWheelToolShare().timeline
  }
})
