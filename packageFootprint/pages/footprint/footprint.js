const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getFootprintToolShare } = require('../../../utils/share')
const echarts = require('../../ec-canvas/echarts')
const chinaMap = require('../../data/china.json')
const {
  PROVINCES,
  readLitSet,
  toggleLit,
  clearLit,
  buildChips,
  buildMapOption
} = require('../../utils/footprint')

let mapRegistered = false

function ensureChinaMap() {
  if (mapRegistered) return
  echarts.registerMap('china', chinaMap)
  mapRegistered = true
}

function litCount(set) {
  return PROVINCES.reduce((n, item) => n + (set[item.name] ? 1 : 0), 0)
}

Page({
  data: {
    theme: getThemeId(),
    ec: { lazyLoad: true },
    chips: [],
    litCount: 0,
    totalCount: PROVINCES.length
  },

  onLoad() {
    enableShareMenu()
    ensureChinaMap()
    const litSet = readLitSet()
    this._litSet = litSet
    this.setData({
      chips: buildChips(litSet),
      litCount: litCount(litSet)
    })
  },

  onReady() {
    this.initChart()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    if (this._chart) this.renderMap()
  },

  onUnload() {
    if (this._chart) {
      this._chart.dispose()
      this._chart = null
    }
  },

  initChart() {
    const component = this.selectComponent('#footprintMap')
    if (!component) return
    component.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, {
        width,
        height,
        devicePixelRatio: dpr
      })
      canvas.setChart(chart)
      this._chart = chart
      chart.on('click', (params) => {
        if (params && params.name) this.toggleProvince(params.name)
      })
      this.renderMap()
      return chart
    })
  },

  renderMap() {
    if (!this._chart) return
    const dark = this.data.theme === 'nexus'
    this._chart.setOption(buildMapOption(this._litSet || {}, dark), true)
  },

  toggleProvince(name) {
    if (!name) return
    const next = toggleLit(this._litSet || {}, name)
    this._litSet = next
    this.setData({
      chips: buildChips(next),
      litCount: litCount(next)
    })
    this.renderMap()
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
  },

  onToggleChip(e) {
    const name = e.currentTarget.dataset.name
    this.toggleProvince(name)
  },

  onClearAll() {
    if (!this.data.litCount) return
    wx.showModal({
      title: '清空足迹',
      content: '会把已点亮的省份全部熄灭，确定吗？',
      confirmText: '清空',
      success: (res) => {
        if (!res.confirm) return
        this._litSet = clearLit()
        this.setData({
          chips: buildChips(this._litSet),
          litCount: 0
        })
        this.renderMap()
      }
    })
  },

  onShareAppMessage() {
    return getFootprintToolShare().appMessage
  },

  onShareTimeline() {
    return getFootprintToolShare().timeline
  }
})
