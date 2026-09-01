const { calculateHouseTax } = require('../../../utils/houseTax')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getHouseTaxToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')

const lastInput = createLastInput('housetax', [
  'tab',
  'priceWan',
  'area',
  'homeSet',
  'hold',
  'onlyHome',
  'pitMethod',
  'originalWan'
])

Page({
  data: {
    theme: getThemeId(),
    tab: 'buy',
    priceWan: '200',
    area: '90',
    homeSet: 'first',
    hold: 'over2',
    onlyHome: 'yes',
    pitMethod: 'assessed',
    originalWan: '120',
    showTip: false,
    result: null
  },

  onLoad() {
    enableShareMenu()
    this.setData(lastInput.restore(), () => this.recalculate())
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

  preventMove() {},

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.tab) return
    this.setData({ tab }, () => this.recalculate())
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: e.detail.value }, () => this.recalculate())
  },

  onSelect(e) {
    const field = e.currentTarget.dataset.field
    const value = e.currentTarget.dataset.value
    if (!field || value == null || value === this.data[field]) return
    this.setData({ [field]: value }, () => this.recalculate())
  },

  onShowTip() {
    this.setData({ showTip: true })
  },

  onHideTip() {
    this.setData({ showTip: false })
  },

  recalculate() {
    const role = this.data.tab === 'sell' ? 'sell' : 'buy'
    this.setData({
      result: calculateHouseTax({
        role,
        priceWan: this.data.priceWan,
        area: this.data.area,
        homeSet: this.data.homeSet,
        hold: this.data.hold,
        onlyHome: this.data.onlyHome,
        pitMethod: this.data.pitMethod,
        originalWan: this.data.originalWan
      })
    }, () => lastInput.save(this))
  },

  onShareAppMessage() {
    return getHouseTaxToolShare().appMessage
  },

  onShareTimeline() {
    return getHouseTaxToolShare().timeline
  }
})
