const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getCanvasToolShare } = require('../../../utils/share')
const { saveResultCard, handleSaveError, drawArtworkCard } = require('../../../utils/resultCard')
const { createDraftStore, formatDraftTime } = require('../../../utils/toolDrafts')
const { redrawBoard, drawStroke, paintStrokesFitted } = require('../../../utils/canvasDraw')

const drafts = createDraftStore('canvasSessions', 5)
const PRESET_COLORS = ['#14231c', '#c45c26', '#e11d48', '#f59e0b', '#22c55e', '#0ea5e9', '#6366f1', '#a855f9', '#f8fafc', '#fb7185']
const BRUSH_SIZES = [4, 8, 14, 22]

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function defaultName() {
  return `画布 ${formatDraftTime(Date.now())}`
}

Page({
  data: {
    theme: getThemeId(),
    sessions: [],
    sessionId: '',
    sessionName: defaultName(),
    presetColors: PRESET_COLORS,
    brushSizes: BRUSH_SIZES,
    color: '#c45c26',
    brushSize: 8,
    eraser: false,
    savingCard: false
  },

  onLoad() {
    enableShareMenu()
    this._strokes = []
    this._dirty = false
    this.setData({
      sessions: drafts.list().map(this.toChip)
    })
    const last = drafts.get(drafts.getLastId()) || drafts.list()[0]
    if (last) this.applyDraft(last)
  },

  onReady() {
    this.prepareCanvas()
    setTimeout(() => {
      if (!this._cssW) this.prepareCanvas()
    }, 80)
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  toChip(item) {
    return {
      id: item.id,
      name: item.name,
      updatedAt: item.updatedAt
    }
  },

  prepareCanvas() {
    const query = wx.createSelectorQuery().in(this)
    query
      .select('#drawCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res && res[0]
        if (!info || !info.node) return
        const canvas = info.node
        const ctx = canvas.getContext('2d')
        const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2
        canvas.width = info.width * dpr
        canvas.height = info.height * dpr
        ctx.scale(dpr, dpr)
        this._canvas = canvas
        this._ctx = ctx
        this._cssW = info.width
        this._cssH = info.height
        this.redraw()
      })
  },

  redraw() {
    if (!this._ctx) return
    redrawBoard(this._ctx, this._cssW, this._cssH, this._strokes)
  },

  applyDraft(draft) {
    this._strokes = JSON.parse(JSON.stringify((draft && draft.strokes) || []))
    this._dirty = false
    this.setData({
      sessionId: (draft && draft.id) || '',
      sessionName: (draft && draft.name) || defaultName(),
      color: (draft && draft.color) || this.data.color,
      brushSize: (draft && draft.brushSize) || this.data.brushSize,
      eraser: false,
      sessions: drafts.list().map(this.toChip)
    })
    if (draft && draft.id) drafts.setLastId(draft.id)
    this.redraw()
  },

  currentPayload() {
    return {
      id: this.data.sessionId || undefined,
      name: this.data.sessionName || defaultName(),
      color: this.data.color,
      brushSize: this.data.brushSize,
      srcW: this._cssW || 300,
      srcH: this._cssH || 400,
      strokes: this._strokes
    }
  },

  persistCurrent(forceOverwriteId) {
    const payload = this.currentPayload()
    if (forceOverwriteId) {
      const saved = drafts.overwrite(forceOverwriteId, payload)
      this.applyDraft(saved.item)
      return saved
    }
    const saved = drafts.save(payload)
    if (saved.ok) this.applyDraft(saved.item)
    return saved
  },

  onNewSession() {
    const startBlank = () => {
      this._strokes = []
      this._dirty = false
      this.setData({
        sessionId: '',
        sessionName: defaultName(),
        eraser: false
      })
      this.redraw()
    }
    if (this._dirty && this._strokes.length) {
      const saved = this.persistCurrent()
      if (!saved.ok) {
        this.askOverwrite('当前画布未暂存，会话已满', startBlank)
        return
      }
    }
    startBlank()
  },

  onOpenSession(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.data.sessionId) return
    const open = () => {
      const draft = drafts.get(id)
      if (!draft) {
        wx.showToast({ title: '会话不存在', icon: 'none' })
        return
      }
      this.applyDraft(draft)
    }
    if (this._dirty && this._strokes.length) {
      const saved = this.persistCurrent()
      if (!saved.ok) {
        this.askOverwrite('先暂存当前画布？会话已满', open)
        return
      }
    }
    open()
  },

  onDeleteSession(e) {
    const id = e.currentTarget.dataset.id
    const item = drafts.get(id)
    if (!item) return
    wx.showModal({
      title: '删除会话',
      content: `确定删除「${item.name}」？`,
      confirmText: '删除',
      confirmColor: '#c45c26',
      success: (res) => {
        if (!res.confirm) return
        drafts.remove(id)
        if (id === this.data.sessionId) {
          this._strokes = []
          this._dirty = false
          this.setData({
            sessionId: '',
            sessionName: defaultName(),
            sessions: drafts.list().map(this.toChip)
          })
          this.redraw()
          return
        }
        this.setData({ sessions: drafts.list().map(this.toChip) })
      }
    })
  },

  askOverwrite(title, onSkip) {
    const list = drafts.list()
    wx.showActionSheet({
      itemList: list.map((item) => `覆盖「${item.name}」`).concat(['放弃当前，直接继续']),
      success: (res) => {
        if (res.tapIndex === list.length) {
          if (typeof onSkip === 'function') onSkip()
          return
        }
        const target = list[res.tapIndex]
        if (!target) return
        this.persistCurrent(target.id)
        if (typeof onSkip === 'function') onSkip()
      }
    })
  },

  onPickColor(e) {
    const color = e.currentTarget.dataset.color
    if (!color) return
    this.setData({ color, eraser: false })
  },

  onHueTouch(e) {
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0])
    if (!touch) return
    const query = wx.createSelectorQuery().in(this)
    query
      .select('.hue-bar')
      .boundingClientRect((rect) => {
        if (!rect || !rect.width) return
        const t = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
        this.setData({
          color: hslToHex(t * 360, 0.72, 0.48),
          eraser: false
        })
      })
      .exec()
  },

  onPickSize(e) {
    const brushSize = Number(e.currentTarget.dataset.size)
    if (!brushSize) return
    this.setData({ brushSize })
  },

  onToggleEraser() {
    this.setData({ eraser: !this.data.eraser })
  },

  onUndo() {
    if (!this._strokes.length) return
    this._strokes.pop()
    this._dirty = true
    this.redraw()
  },

  onClear() {
    wx.showModal({
      title: '清空画布',
      content: '当前笔画会消失，已暂存的会话不受影响。',
      confirmText: '清空',
      success: (res) => {
        if (!res.confirm) return
        this._strokes = []
        this._dirty = true
        this.redraw()
      }
    })
  },

  pointFromTouch(e) {
    const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
    if (!touch) return null
    if (typeof touch.x === 'number' && typeof touch.y === 'number') {
      return {
        x: Math.round(touch.x),
        y: Math.round(touch.y)
      }
    }
    return null
  },

  onDrawStart(e) {
    const pt = this.pointFromTouch(e)
    if (!pt || !this._ctx) return
    this._drawing = {
      color: this.data.color,
      size: this.data.brushSize,
      eraser: this.data.eraser,
      points: [pt]
    }
    drawStroke(this._ctx, this._drawing)
  },

  onDrawMove(e) {
    if (!this._drawing || !this._ctx) return
    const pt = this.pointFromTouch(e)
    if (!pt) return
    const last = this._drawing.points[this._drawing.points.length - 1]
    if (last && Math.abs(last.x - pt.x) < 1 && Math.abs(last.y - pt.y) < 1) return
    this._drawing.points.push(pt)
    drawStroke(this._ctx, {
      color: this._drawing.color,
      size: this._drawing.size,
      eraser: this._drawing.eraser,
      points: [last, pt]
    })
  },

  onDrawEnd() {
    if (!this._drawing) return
    this._strokes.push(this._drawing)
    this._drawing = null
    this._dirty = true
  },

  onSaveDraft() {
    if (!this._strokes.length && !this.data.sessionId) {
      wx.showToast({ title: '先画几笔再暂存', icon: 'none' })
      return
    }
    const saved = this.persistCurrent()
    if (!saved.ok) {
      this.askOverwrite('最多暂存 5 个会话', () => {})
      return
    }
    this._dirty = false
    wx.showToast({ title: '已暂存', icon: 'success' })
  },

  onSaveCard() {
    if (!this._strokes.length) {
      wx.showToast({ title: '画布还是空的', icon: 'none' })
      return
    }
    if (this._savingCard) return
    this._savingCard = true
    this.setData({ savingCard: true })
    const strokes = this._strokes
    const srcW = this._cssW || 300
    const srcH = this._cssH || 400
    const title = this.data.sessionName || '画布'
    wx.showLoading({ title: '正在生成', mask: true })
    saveResultCard(this, 'resultCard', (ctx, width, height) => {
      drawArtworkCard(ctx, width, height, {
        title: '画布',
        headerColors: ['#e879f9', '#7c3aed'],
        note: title,
        paint: (c, x, y, w, h) => paintStrokesFitted(c, x, y, w, h, strokes, srcW, srcH)
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

  preventMove() {},

  onShareAppMessage() {
    return getCanvasToolShare().appMessage
  },

  onShareTimeline() {
    return getCanvasToolShare().timeline
  },

  onHide() {
    if (this._dirty && this._strokes.length) {
      const saved = this.persistCurrent()
      if (saved.ok) this._dirty = false
    }
  }
})
