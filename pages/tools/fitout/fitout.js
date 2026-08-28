const { MATERIALS, calculateFitout } = require('../../../utils/fitout')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getFitoutToolShare } = require('../../../utils/share')

const TOTAL_KEY = 'fitoutTotalCost'

const DEFAULTS = {
  tile: { length: '4.2', width: '3.6', tileW: '800', tileH: '800', perBox: '3', loss: '8', price: '' },
  floor: { length: '4.2', width: '3.6', loss: '5', price: '' },
  paint: {
    length: '4.2',
    width: '3.6',
    height: '2.7',
    openings: '2.4',
    coats: '3',
    coverage: '10',
    bucket: '18',
    includeCeiling: true,
    loss: '10',
    price: ''
  },
  wallpaper: {
    length: '4.2',
    width: '3.6',
    height: '2.7',
    openings: '2.4',
    rollW: '0.53',
    rollL: '10',
    loss: '15',
    price: ''
  },
  skirting: { length: '4.2', width: '3.6', doorW: '0.9', pieceLen: '2.4', loss: '5', price: '' },
  ceiling: { length: '4.2', width: '3.6', loss: '8', price: '' },
  grout: {
    length: '4.2',
    width: '3.6',
    tileW: '800',
    tileH: '800',
    jointW: '2',
    jointD: '5',
    loss: '10',
    price: ''
  },
  mortar: { length: '4.2', width: '3.6', thickness: '20', loss: '5', price: '' }
}

function formatCost(cost) {
  const n = Number(cost)
  if (!Number.isFinite(n) || n < 0) return ''
  return `${n.toFixed(2)} 元`
}

function readTotalCost() {
  try {
    const n = Number(wx.getStorageSync(TOTAL_KEY))
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch (e) {
    return 0
  }
}

function writeTotalCost(cost) {
  try {
    if (cost > 0) wx.setStorageSync(TOTAL_KEY, cost)
    else wx.removeStorageSync(TOTAL_KEY)
  } catch (e) {}
}

Page({
  data: {
    theme: getThemeId(),
    materials: MATERIALS,
    type: 'tile',
    form: DEFAULTS.tile,
    includeCeiling: true,
    result: null,
    showTip: false,
    showAddTip: false,
    pendingCost: 0,
    pendingCostText: '',
    totalCost: 0,
    totalCostText: ''
  },

  onLoad() {
    enableShareMenu()
    const totalCost = readTotalCost()
    this.setData({
      totalCost,
      totalCostText: formatCost(totalCost)
    })
    this.recalculate()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  preventMove() {},

  currentCost() {
    const result = this.data.result
    const cost = result && result.valid ? Number(result.cost) : NaN
    return Number.isFinite(cost) && cost > 0 ? cost : 0
  },

  costSignature(cost) {
    const form = this.data.form || {}
    return [this.data.type, Number(cost).toFixed(2), form.price || '', form.length || '', form.width || ''].join('|')
  },

  offerAccumulate(done) {
    const cost = this.currentCost()
    const run = typeof done === 'function' ? done : null
    if (!(cost > 0)) {
      if (run) run()
      return
    }
    const signature = this.costSignature(cost)
    if (signature === this._handledSig) {
      if (run) run()
      return
    }
    this._afterAccumulate = run
    this._pendingSig = signature
    this.setData({
      showAddTip: true,
      pendingCost: cost,
      pendingCostText: formatCost(cost)
    })
  },

  finishAccumulatePrompt() {
    const next = this._afterAccumulate
    this._afterAccumulate = null
    this.setData({ showAddTip: false, pendingCost: 0, pendingCostText: '' })
    if (typeof next === 'function') next()
  },

  onSelectType(e) {
    const type = e.currentTarget.dataset.id
    if (!type || type === this.data.type) return
    this.offerAccumulate(() => this.applyType(type))
  },

  applyType(type) {
    const form = Object.assign({}, DEFAULTS[type] || DEFAULTS.tile)
    this._handledSig = ''
    this.setData(
      {
        type,
        form,
        includeCeiling: !!form.includeCeiling
      },
      () => this.recalculate()
    )
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({ [`form.${field}`]: e.detail.value }, () => this.recalculate())
  },

  onPriceBlur(e) {
    const price = e.detail && e.detail.value != null ? e.detail.value : this.data.form.price
    const form = Object.assign({}, this.data.form, { price })
    const result = calculateFitout(this.data.type, {
      ...form,
      includeCeiling: this.data.includeCeiling
    })
    this.setData({ 'form.price': price, result }, () => this.offerAccumulate())
  },

  onConfirmAccumulate() {
    const cost = Number(this.data.pendingCost)
    if (!(cost > 0)) {
      this.finishAccumulatePrompt()
      return
    }
    const totalCost = Math.round((this.data.totalCost + cost) * 100) / 100
    this._handledSig = this._pendingSig || this.costSignature(cost)
    writeTotalCost(totalCost)
    this.setData({
      totalCost,
      totalCostText: formatCost(totalCost)
    })
    this.finishAccumulatePrompt()
  },

  onSkipAccumulate() {
    this._handledSig = this._pendingSig || this.costSignature(this.currentCost())
    this.finishAccumulatePrompt()
  },

  onClearTotal() {
    writeTotalCost(0)
    this._handledSig = ''
    this.setData({
      totalCost: 0,
      totalCostText: ''
    })
  },

  onSetCeiling(e) {
    const includeCeiling = e.currentTarget.dataset.on === '1' || e.currentTarget.dataset.on === 1
    this.setData(
      {
        includeCeiling,
        'form.includeCeiling': includeCeiling
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
    const form = this.data.form || {}
    const result = calculateFitout(this.data.type, {
      ...form,
      includeCeiling: this.data.includeCeiling
    })
    this.setData({ result })
  },

  onShareAppMessage() {
    return getFitoutToolShare().appMessage
  },

  onShareTimeline() {
    return getFitoutToolShare().timeline
  }
})
