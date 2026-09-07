const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getFootprintToolShare } = require('../../../utils/share')
const { drawChinaMap, hitProvince } = require('../../utils/chinaMap')
const {
  PROVINCES,
  COLOR_MAP,
  readLitSet,
  toggleLit,
  clearLit,
  buildChips
} = require('../../utils/footprint')

function litCount(set) {
  return PROVINCES.reduce((n, item) => n + (set[item.name] ? 1 : 0), 0)
}

Page({
  data: {
    theme: getThemeId(),
    chips: [],
    litCount: 0,
    totalCount: PROVINCES.length
  },

  onLoad() {
    enableShareMenu()
    const litSet = readLitSet()
    this._litSet = litSet
    this.setData({
      chips: buildChips(litSet),
      litCount: litCount(litSet)
    })
  },

  onReady() {
    this.initMap()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    if (this._map) this.drawMap()
  },

  initMap() {
    wx.createSelectorQuery()
      .in(this)
      .select('#chinaMap')
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res && res[0]
        if (!info || !info.node) return
        const canvas = info.node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio || 1
        canvas.width = info.width * dpr
        canvas.height = info.height * dpr
        ctx.scale(dpr, dpr)
        this._map = {
          canvas,
          ctx,
          width: info.width,
          height: info.height
        }
        this.drawMap()
      })
  },

  drawMap() {
    if (!this._map) return
    const dark = this.data.theme === 'nexus'
    drawChinaMap(this._map.ctx, this._map.width, this._map.height, this._litSet || {}, COLOR_MAP, dark)
  },

  onMapTap(e) {
    if (!this._map) return
    const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
    if (!touch) return
    const name = hitProvince(touch.x, touch.y, this._map.width, this._map.height)
    if (name) this.toggleProvince(name)
  },

  toggleProvince(name) {
    if (!name) return
    const next = toggleLit(this._litSet || {}, name)
    this._litSet = next
    this.setData({
      chips: buildChips(next),
      litCount: litCount(next)
    })
    this.drawMap()
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
        this.drawMap()
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
