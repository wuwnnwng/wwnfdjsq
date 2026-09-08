const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getFootprintToolShare } = require('../../../utils/share')
const { saveResultCard, handleSaveError } = require('../../../utils/resultCard')
const { drawChinaMap, hitProvince } = require('../../utils/chinaMap')
const { drawFootprintCard } = require('../../utils/footprintCard')
const {
  PROVINCES,
  COLOR_MAP,
  readLitSet,
  writeLitSet,
  toggleLit,
  clearLit,
  readStartName,
  writeStartName,
  buildChips
} = require('../../utils/footprint')

const LONG_PRESS_MS = 480

function litCount(set) {
  return PROVINCES.reduce((n, item) => n + (set[item.name] ? 1 : 0), 0)
}

function touchPoint(e) {
  return (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
}

Page({
  data: {
    theme: getThemeId(),
    chips: [],
    litCount: 0,
    totalCount: PROVINCES.length,
    startName: '',
    savingCard: false
  },

  onLoad() {
    enableShareMenu()
    const litSet = readLitSet()
    const startName = readStartName()
    if (startName && !litSet[startName]) {
      litSet[startName] = true
      writeLitSet(litSet)
    }
    this._litSet = litSet
    this._startName = startName
    this.syncView()
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

  onUnload() {
    this.clearPressTimer()
  },

  syncView() {
    const litSet = this._litSet || {}
    const startName = this._startName || ''
    this.setData({
      chips: buildChips(litSet, startName),
      litCount: litCount(litSet),
      startName
    })
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
    drawChinaMap(this._map.ctx, this._map.width, this._map.height, this._litSet || {}, COLOR_MAP, dark, {
      startName: this._startName || ''
    })
  },

  clearPressTimer() {
    if (this._pressTimer) {
      clearTimeout(this._pressTimer)
      this._pressTimer = null
    }
  },

  onMapTouchStart(e) {
    if (!this._map) return
    const touch = touchPoint(e)
    if (!touch) return
    this._press = { x: touch.x, y: touch.y }
    this._ignoreTap = false
    this.clearPressTimer()
    this._pressTimer = setTimeout(() => {
      this._pressTimer = null
      this._ignoreTap = true
      const press = this._press
      if (!press || !this._map) return
      const name = hitProvince(press.x, press.y, this._map.width, this._map.height)
      if (name) this.setStartProvince(name)
    }, LONG_PRESS_MS)
  },

  onMapTouchMove(e) {
    if (!this._press) return
    const touch = touchPoint(e)
    if (!touch) return
    const dx = touch.x - this._press.x
    const dy = touch.y - this._press.y
    if (dx * dx + dy * dy > 81) {
      this.clearPressTimer()
      this._press = null
    }
  },

  onMapTouchEnd() {
    const press = this._press
    this._press = null
    this.clearPressTimer()
    if (this._ignoreTap) {
      this._ignoreTap = false
      return
    }
    if (!press || !this._map) return
    const name = hitProvince(press.x, press.y, this._map.width, this._map.height)
    if (name) this.toggleProvince(name)
  },

  onMapTouchCancel() {
    this._press = null
    this._ignoreTap = false
    this.clearPressTimer()
  },

  toggleProvince(name) {
    if (!name) return
    const turningOff = !!(this._litSet && this._litSet[name])
    const next = toggleLit(this._litSet || {}, name)
    this._litSet = next
    if (turningOff && this._startName === name) this._startName = writeStartName('')
    this.syncView()
    this.drawMap()
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
  },

  setStartProvince(name) {
    if (!name) return
    if (this._startName === name) {
      this._startName = writeStartName('')
      wx.showToast({ title: '已取消起点', icon: 'none' })
    } else {
      this._startName = writeStartName(name)
      if (!this._litSet[name]) this._litSet = toggleLit(this._litSet || {}, name)
      wx.showToast({ title: `已设起点：${name}`, icon: 'none' })
    }
    this.syncView()
    this.drawMap()
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' })
  },

  onToggleChip(e) {
    this.toggleProvince(e.currentTarget.dataset.name)
  },

  onStartChip(e) {
    this.setStartProvince(e.currentTarget.dataset.name)
  },

  onSaveCard() {
    if (!this.data.litCount) {
      wx.showToast({ title: '先点亮至少一个省', icon: 'none' })
      return
    }
    if (this._savingCard) return
    this._savingCard = true
    this.setData({ savingCard: true })
    const litSet = this._litSet || {}
    const startName = this._startName || ''
    const litCount = this.data.litCount
    const totalCount = this.data.totalCount
    wx.showLoading({ title: '正在生成', mask: true })
    saveResultCard(this, 'resultCard', (ctx, width, height) => {
      drawFootprintCard(ctx, width, height, {
        litSet,
        colorMap: COLOR_MAP,
        litCount,
        totalCount,
        startName
      })
    })
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      })
      .catch((err) => {
        wx.hideLoading()
        handleSaveError(err)
      })
      .then(() => {
        this._savingCard = false
        this.setData({ savingCard: false })
      })
  },

  onClearAll() {
    if (!this.data.litCount && !this.data.startName) return
    wx.showModal({
      title: '清空足迹',
      content: '会把已点亮的省份和起点全部清除，确定吗？',
      confirmText: '清空',
      success: (res) => {
        if (!res.confirm) return
        this._litSet = clearLit()
        this._startName = writeStartName('')
        this.syncView()
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
