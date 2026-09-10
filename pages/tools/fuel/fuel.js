const { calculateFuel } = require('../../../utils/fuelCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getFuelToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')

const lastInput = createLastInput('fuel', [
  'kind',
  'mode',
  'fuelDistance',
  'fuelAmount',
  'fuelPrice',
  'fuelRate',
  'evDistance',
  'evAmount',
  'evPrice',
  'evRate'
])

Page({
  data: {
    theme: getThemeId(),
    kind: 'fuel',
    mode: 'trip',
    fuelDistance: '500',
    fuelAmount: '40',
    fuelPrice: '7.8',
    fuelRate: '8',
    evDistance: '400',
    evAmount: '60',
    evPrice: '1.2',
    evRate: '15',
    result: null
  },

  onLoad(options) {
    enableShareMenu()
    const restored = lastInput.restore()
    if (restored.kind && restored.kind !== 'ev') restored.kind = 'fuel'
    if (restored.mode && restored.mode !== 'plan') restored.mode = 'trip'
    if (options && options.kind === 'ev') restored.kind = 'ev'
    else if (options && (options.kind === 'fuel' || options.price)) restored.kind = 'fuel'
    if (options && options.price) restored.fuelPrice = String(options.price)
    this.setData(restored, () => this.recalculate())
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

  onSwitchKind(e) {
    const kind = e.currentTarget.dataset.kind
    if (!kind || kind === this.data.kind) return
    this.setData({ kind }, () => this.recalculate())
  },

  onSwitchMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.mode) return
    this.setData({ mode }, () => this.recalculate())
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: e.detail.value }, () => this.recalculate())
  },

  recalculate() {
    const { kind, mode } = this.data
    const prefix = kind === 'ev' ? 'ev' : 'fuel'
    const result = calculateFuel({
      kind,
      mode,
      distanceText: this.data[`${prefix}Distance`],
      amountText: this.data[`${prefix}Amount`],
      priceText: this.data[`${prefix}Price`],
      rateText: this.data[`${prefix}Rate`]
    })
    this.setData({ result }, () => lastInput.save(this))
  },

  applyOilPrice(price) {
    const next = String(price || '').trim()
    if (!next) return
    this.setData({ kind: 'fuel', fuelPrice: next }, () => this.recalculate())
  },

  onGoOilPrice() {
    wx.navigateTo({
      url: '/pages/tools/oilprice/oilprice'
    })
  },

  onShareAppMessage() {
    return getFuelToolShare().appMessage
  },

  onShareTimeline() {
    return getFuelToolShare().timeline
  }
})
