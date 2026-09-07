const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getChanceToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')
const { createGameSfx } = require('../../../utils/gameSfx')
const {
  buildDie,
  rollDice,
  flipCoin,
  readRecords,
  addRecord,
  clearRecords,
  makeRecordId
} = require('../../../utils/chanceGame')

const lastInput = createLastInput('chance', ['tab', 'diceCount'])
const DICE_COUNTS = [1, 2, 3]

function tap() {
  if (wx.vibrateShort) {
    wx.vibrateShort({ type: 'light' })
  }
}

Page({
  data: {
    theme: getThemeId(),
    tab: 'dice',
    diceCount: 1,
    diceCounts: DICE_COUNTS,
    rolling: false,
    dice: [buildDie(6)],
    coinHeads: true,
    coinFaceText: '正',
    shaking: false,
    flipping: false,
    lastTitle: '',
    lastValue: '',
    records: []
  },

  onLoad() {
    enableShareMenu()
    this._sfx = createGameSfx()
    const restored = lastInput.restore()
    const tab = restored.tab === 'coin' ? 'coin' : 'dice'
    const diceCount = DICE_COUNTS.indexOf(Number(restored.diceCount)) >= 0 ? Number(restored.diceCount) : 1
    const dice = []
    for (let i = 0; i < diceCount; i += 1) {
      dice.push(buildDie(6))
    }
    this.setData({
      tab,
      diceCount,
      dice,
      records: readRecords()
    })
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme, records: readRecords() })
    applyThemeChrome(theme)
  },

  onHide() {
    lastInput.flush(this)
  },

  onUnload() {
    lastInput.flush(this)
    this.clearTimers()
    if (this._sfx) {
      this._sfx.destroy()
      this._sfx = null
    }
  },

  clearTimers() {
    if (this._rollTimer) {
      clearInterval(this._rollTimer)
      this._rollTimer = null
    }
    if (this._flipTimer) {
      clearTimeout(this._flipTimer)
      this._flipTimer = null
    }
    if (this._coinSfxTimer) {
      clearInterval(this._coinSfxTimer)
      this._coinSfxTimer = null
    }
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.tab || this.data.rolling) return
    this.setData({ tab }, () => lastInput.save(this))
  },

  onSelectDiceCount(e) {
    const count = Number(e.currentTarget.dataset.count)
    if (DICE_COUNTS.indexOf(count) < 0 || count === this.data.diceCount || this.data.rolling) return
    const dice = []
    for (let i = 0; i < count; i += 1) {
      dice.push(buildDie(6))
    }
    this.setData({ diceCount: count, dice }, () => lastInput.save(this))
  },

  onPlay() {
    if (this.data.rolling) return
    if (this._sfx) this._sfx.prepare()
    if (this.data.tab === 'coin') this.playCoin()
    else this.playDice()
  },

  playDice() {
    this.clearTimers()
    this.setData({ rolling: true, shaking: true, lastTitle: '', lastValue: '' })
    let ticks = 0
    this._rollTimer = setInterval(() => {
      ticks += 1
      const preview = rollDice(this.data.diceCount)
      this.setData({ dice: preview.dice })
      if (this._sfx) this._sfx.play('diceTick')
      if (ticks >= 14) {
        clearInterval(this._rollTimer)
        this._rollTimer = null
        const result = rollDice(this.data.diceCount)
        const records = addRecord({
          id: makeRecordId(),
          at: Date.now(),
          kind: 'dice',
          title: result.title,
          valueText: result.valueText
        })
        tap()
        if (this._sfx) this._sfx.play('diceLand')
        this.setData({
          rolling: false,
          shaking: false,
          dice: result.dice,
          lastTitle: result.title,
          lastValue: result.valueText,
          records
        })
      }
    }, 70)
  },

  playCoin() {
    this.clearTimers()
    this.setData({ rolling: true, flipping: true, lastTitle: '', lastValue: '' })
    if (this._sfx) this._sfx.play('coinSpin')
    this._coinSfxTimer = setInterval(() => {
      if (this._sfx) this._sfx.play('coinSpin')
    }, 80)
    this._flipTimer = setTimeout(() => {
      this._flipTimer = null
      if (this._coinSfxTimer) {
        clearInterval(this._coinSfxTimer)
        this._coinSfxTimer = null
      }
      const result = flipCoin()
      const records = addRecord({
        id: makeRecordId(),
        at: Date.now(),
        kind: 'coin',
        title: result.title,
        valueText: result.valueText
      })
      tap()
      if (this._sfx) this._sfx.play('coinLand')
      this.setData({
        rolling: false,
        flipping: false,
        coinHeads: result.heads,
        coinFaceText: result.faceText,
        lastTitle: result.title,
        lastValue: result.valueText,
        records
      })
    }, 720)
  },

  onClearRecords() {
    if (!this.data.records.length) return
    wx.showModal({
      title: '清空记录',
      content: '历史结果会从这台手机上删掉，确定清空吗？',
      confirmText: '清空',
      success: (res) => {
        if (!res.confirm) return
        this.setData({ records: clearRecords() })
      }
    })
  },

  onShareAppMessage() {
    return getChanceToolShare().appMessage
  },

  onShareTimeline() {
    return getChanceToolShare().timeline
  }
})
