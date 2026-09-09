const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getChanceToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')
const { createGameSfx } = require('../../../utils/gameSfx')
const { MIN_DICE, MAX_DICE, clampDiceCount, buildDie, rollDice, flipCoin } = require('../../../utils/chanceGame')

const lastInput = createLastInput('chance', ['tab', 'diceCount'])
const SHAKE_GAP = 1200
const SHAKE_FORCE = 4.2
const CUP_CLOSE_MS = 380
const ROLL_TICKS = 16
const ROLL_INTERVAL = 70
const COIN_FLIP_MS = 760

function tap() {
  if (wx.vibrateShort) {
    wx.vibrateShort({ type: 'light' })
  }
}

function makeDice(count) {
  const dice = []
  const n = clampDiceCount(count)
  for (let i = 0; i < n; i += 1) {
    dice.push(buildDie(6))
  }
  return dice
}

Page({
  data: {
    theme: getThemeId(),
    tab: 'dice',
    diceCount: 1,
    diceCountText: '1',
    minDice: MIN_DICE,
    maxDice: MAX_DICE,
    rolling: false,
    dice: makeDice(1),
    coinHeads: true,
    willHeads: true,
    shaking: false,
    flipping: false,
    lidOpen: false,
    lastTitle: '',
    lastValue: ''
  },

  onLoad() {
    enableShareMenu()
    this._sfx = createGameSfx()
    const restored = lastInput.restore()
    const tab = restored.tab === 'coin' ? 'coin' : 'dice'
    const diceCount = clampDiceCount(restored.diceCount || 1)
    this.setData({
      tab,
      diceCount,
      diceCountText: String(diceCount),
      dice: makeDice(diceCount)
    })
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    this.bindShake()
  },

  onHide() {
    lastInput.flush(this)
    this.unbindShake()
  },

  onUnload() {
    lastInput.flush(this)
    this._rollingLock = false
    this.unbindShake()
    this.clearTimers()
    if (this._sfx) {
      this._sfx.destroy()
      this._sfx = null
    }
  },

  bindShake() {
    if (this._shakeBound || !wx.onAccelerometerChange || !wx.startAccelerometer) return
    this._onAcc = (res) => {
      if (this.data.tab !== 'dice' || this.data.rolling || this._rollingLock) return
      const now = Date.now()
      if (now - (this._lastShakeAt || 0) < SHAKE_GAP) return
      const force = Math.abs(res.x) + Math.abs(res.y) + Math.abs(res.z)
      if (force < SHAKE_FORCE) return
      this._lastShakeAt = now
      this.playDice()
    }
    wx.onAccelerometerChange(this._onAcc)
    wx.startAccelerometer({ interval: 'game' })
    this._shakeBound = true
  },

  unbindShake() {
    if (!this._shakeBound) return
    if (wx.offAccelerometerChange && this._onAcc) {
      wx.offAccelerometerChange(this._onAcc)
    }
    if (wx.stopAccelerometer) wx.stopAccelerometer()
    this._onAcc = null
    this._shakeBound = false
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
    if (this._lidTimer) {
      clearTimeout(this._lidTimer)
      this._lidTimer = null
    }
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.tab || this.data.rolling || this._rollingLock) return
    this.setData({ tab }, () => lastInput.save(this))
  },

  applyDiceCount(count) {
    if (this.data.rolling || this._rollingLock) return
    const diceCount = clampDiceCount(count)
    this.setData(
      {
        diceCount,
        diceCountText: String(diceCount),
        dice: makeDice(diceCount),
        lidOpen: false,
        lastTitle: '',
        lastValue: ''
      },
      () => lastInput.save(this)
    )
  },

  onDiceCountStep(e) {
    const act = e.currentTarget.dataset.act
    const delta = act === 'inc' ? 1 : -1
    this.applyDiceCount(this.data.diceCount + delta)
  },

  onDiceCountInput(e) {
    const raw = e.detail.value
    this.setData({ diceCountText: raw })
    if (!String(raw).trim()) return
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    this.applyDiceCount(n)
  },

  onDiceCountBlur() {
    this.applyDiceCount(this.data.diceCount)
  },

  onPlay() {
    if (this.data.rolling || this._rollingLock) return
    if (this._sfx) this._sfx.prepare()
    if (this.data.tab === 'coin') this.playCoin()
    else this.playDice()
  },

  onToggleLid() {
    if (this.data.tab !== 'dice' || this.data.rolling || this._rollingLock) return
    tap()
    this.setData({ lidOpen: !this.data.lidOpen })
  },

  playDice() {
    if (this.data.rolling || this._rollingLock) return
    this._rollingLock = true
    if (this._sfx) this._sfx.prepare()
    this.clearTimers()
    const startShake = () => {
      this.setData({ rolling: true, shaking: true, lidOpen: false })
      let ticks = 0
      this._rollTimer = setInterval(() => {
        ticks += 1
        const preview = rollDice(this.data.diceCount)
        this.setData({ dice: preview.dice })
        if (this._sfx) this._sfx.play('diceTick')
        if (ticks >= ROLL_TICKS) {
          clearInterval(this._rollTimer)
          this._rollTimer = null
          const result = rollDice(this.data.diceCount)
          tap()
          if (this._sfx) this._sfx.play('diceLand')
          this._rollingLock = false
          this.setData({
            rolling: false,
            shaking: false,
            lidOpen: false,
            dice: result.dice,
            lastTitle: result.title,
            lastValue: result.valueText
          })
        }
      }, ROLL_INTERVAL)
    }

    if (this.data.lidOpen) {
      this.setData({ rolling: true, lidOpen: false, lastTitle: '', lastValue: '' })
      this._lidTimer = setTimeout(() => {
        this._lidTimer = null
        startShake()
      }, CUP_CLOSE_MS)
      return
    }
    this.setData({ rolling: true, lastTitle: '', lastValue: '' })
    startShake()
  },

  playCoin() {
    this.clearTimers()
    const result = flipCoin()
    this.setData({
      rolling: true,
      flipping: true,
      willHeads: result.heads,
      lastTitle: '',
      lastValue: ''
    })
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
      tap()
      if (this._sfx) this._sfx.play('coinLand')
      this.setData({
        rolling: false,
        flipping: false,
        coinHeads: result.heads,
        lastTitle: result.title,
        lastValue: result.valueText
      })
    }, COIN_FLIP_MS)
  },

  onShareAppMessage() {
    return getChanceToolShare().appMessage
  },

  onShareTimeline() {
    return getChanceToolShare().timeline
  }
})
