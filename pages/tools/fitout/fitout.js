const { MATERIALS, calculateFitout } = require('../../../utils/fitout')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getFitoutToolShare } = require('../../../utils/share')

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

Page({
  data: {
    theme: getThemeId(),
    materials: MATERIALS,
    type: 'tile',
    form: DEFAULTS.tile,
    includeCeiling: true,
    result: null,
    showTip: false
  },

  onLoad() {
    enableShareMenu()
    this.recalculate()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  preventMove() {},

  onSelectType(e) {
    const type = e.currentTarget.dataset.id
    if (!type || type === this.data.type) return
    const form = Object.assign({}, DEFAULTS[type] || DEFAULTS.tile)
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
