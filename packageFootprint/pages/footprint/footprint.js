const { PROVINCES } = require('../../utils/provinces')
const { drawChinaMap, hitTest, toVisitedMap, buildProvinceViews } = require('../../utils/chinaMap')
const { drawFootprintCard } = require('../../utils/footprintCard')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getFootprintToolShare } = require('../../../utils/share')
const { saveResultCard, handleSaveError } = require('../../../utils/resultCard')
const { createLastInput } = require('../../../utils/toolLastInput')

const lastInput = createLastInput('footprint', ['visitedIds'])

function normalizeIds(ids) {
  if (!Array.isArray(ids)) return []
  const seen = {}
  const next = []
  ids.forEach((id) => {
    if (!id || seen[id]) return
    if (!PROVINCES.some((item) => item.id === id)) return
    seen[id] = true
    next.push(id)
  })
  return next
}

Page({
  data: {
    theme: getThemeId(),
    visitedIds: [],
    focusId: '',
    provinces: buildProvinceViews([], ''),
    savingCard: false
  },

  onLoad() {
    enableShareMenu()
    const saved = lastInput.restore()
    this.applyVisited(normalizeIds(saved.visitedIds), this.data.focusId)
  },

  onReady() {
    this.prepareMap()
    setTimeout(() => {
      if (!this._mapCtx) this.prepareMap()
    }, 80)
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    this.redrawMap()
  },

  onHide() {
    lastInput.flush(this)
  },

  onUnload() {
    lastInput.flush(this)
  },

  applyVisited(visitedIds, focusId) {
    const ids = normalizeIds(visitedIds)
    this.setData(
      {
        visitedIds: ids,
        focusId: focusId || '',
        provinces: buildProvinceViews(ids, focusId || '')
      },
      () => {
        lastInput.save(this)
        this.redrawMap()
      }
    )
  },

  prepareMap() {
    const query = wx.createSelectorQuery().in(this)
    query
      .select('#chinaMap')
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res && res[0]
        if (!info || !info.node) return
        const canvas = info.node
        const ctx = canvas.getContext('2d')
        const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2
        canvas.width = info.width * dpr
        canvas.height = info.height * dpr
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        this._mapCanvas = canvas
        this._mapCtx = ctx
        this._mapW = info.width
        this._mapH = info.height
        this.redrawMap()
      })
  },

  redrawMap() {
    if (!this._mapCtx) return
    drawChinaMap(this._mapCtx, 0, 0, this._mapW, this._mapH, {
      visited: toVisitedMap(this.data.visitedIds),
      focusId: this.data.focusId
    })
  },

  toggleProvince(id) {
    if (!id) return
    const visitedIds = this.data.visitedIds.slice()
    const index = visitedIds.indexOf(id)
    if (index >= 0) visitedIds.splice(index, 1)
    else visitedIds.push(id)
    this.applyVisited(visitedIds, id)
  },

  onMapTouch(e) {
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0])
    if (!touch || !this._mapW) return
    const id = hitTest(touch.x, touch.y, this._mapW, this._mapH)
    if (!id) return
    this.toggleProvince(id)
  },

  onTapProvince(e) {
    this.toggleProvince(e.currentTarget.dataset.id)
  },

  preventMove() {},

  onSaveCard() {
    if (this._savingCard) return
    this._savingCard = true
    this.setData({ savingCard: true })
    wx.showLoading({ title: '正在生成', mask: true })
    const payload = {
      visitedIds: this.data.visitedIds,
      focusId: this.data.focusId
    }
    saveResultCard(this, 'resultCard', (ctx, width, height) => {
      drawFootprintCard(ctx, width, height, payload)
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

  onShareAppMessage() {
    return getFootprintToolShare().appMessage
  },

  onShareTimeline() {
    return getFootprintToolShare().timeline
  }
})
