const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getPuzzleToolShare } = require('../../../utils/share')
const { saveResultCard, handleSaveError, drawArtworkCard } = require('../../../utils/resultCard')
const { createDraftStore, formatDraftTime } = require('../../../utils/toolDrafts')
const {
  PUZZLES,
  getPuzzleById,
  drawPuzzleArt,
  shuffleOrder,
  isSolved,
  buildTiles
} = require('../../../utils/puzzleArt')

const drafts = createDraftStore('puzzleSessions', 5)
const COL_OPTIONS = [3, 4, 5]

function windowWidth() {
  try {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    return info.windowWidth || 375
  } catch (e) {
    return 375
  }
}

Page({
  data: {
    theme: getThemeId(),
    puzzles: PUZZLES.map((item) =>
      Object.assign({}, item, {
        thumbStyle: `background: linear-gradient(160deg, ${item.colors[0]}, ${item.colors[1]});`
      })
    ),
    sessions: [],
    sessionId: '',
    playing: false,
    puzzleId: '',
    puzzleName: '',
    imagePath: '',
    cols: 4,
    colOptions: COL_OPTIONS,
    order: [],
    tiles: [],
    selectedIndex: -1,
    solved: false,
    boardSize: 300,
    bgSize: '400% 400%',
    savingCard: false
  },

  onLoad() {
    enableShareMenu()
    const boardSize = Math.max(240, Math.round(windowWidth() - 36))
    this.setData({
      boardSize,
      sessions: drafts.list().map(this.toChip)
    })
    const last = drafts.get(drafts.getLastId())
    if (last) this.openDraft(last)
  },

  onReady() {
    this.prepareArtCanvas()
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

  prepareArtCanvas() {
    const query = wx.createSelectorQuery().in(this)
    query
      .select('#puzzleArt')
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res && res[0]
        if (!info || !info.node) return
        const canvas = info.node
        const ctx = canvas.getContext('2d')
        const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2
        const size = 300
        canvas.width = size * dpr
        canvas.height = size * dpr
        ctx.scale(dpr, dpr)
        this._artCanvas = canvas
        this._artCtx = ctx
        this._artSize = size
        if (this._pendingPuzzle) {
          const puzzle = this._pendingPuzzle
          this._pendingPuzzle = null
          this.renderPuzzleImage(puzzle)
        }
      })
  },

  renderPuzzleImage(puzzle) {
    if (!this._artCtx) {
      this._pendingPuzzle = puzzle
      return
    }
    drawPuzzleArt(this._artCtx, this._artSize, this._artSize, puzzle)
    const exportImage = () => {
      wx.canvasToTempFilePath({
        canvas: this._artCanvas,
        fileType: 'png',
        success: (res) => {
          this.setData({ imagePath: res.tempFilePath })
        }
      })
    }
    if (this._artCanvas && typeof this._artCanvas.requestAnimationFrame === 'function') {
      this._artCanvas.requestAnimationFrame(exportImage)
    } else {
      setTimeout(exportImage, 32)
    }
  },

  startPuzzle(puzzle, options = {}) {
    const cols = Number(options.cols) || this.data.cols || 4
    const order = options.order && options.order.length === cols * cols
      ? options.order.slice()
      : shuffleOrder(cols * cols)
    this.setData({
      playing: true,
      puzzleId: puzzle.id,
      puzzleName: puzzle.name,
      cols,
      order,
      tiles: buildTiles(order, cols),
      selectedIndex: -1,
      solved: isSolved(order),
      bgSize: `${cols * 100}% ${cols * 100}%`,
      sessionId: options.sessionId || '',
      sessions: drafts.list().map(this.toChip)
    })
    if (options.sessionId) drafts.setLastId(options.sessionId)
    this.renderPuzzleImage(puzzle)
  },

  openDraft(draft) {
    const puzzle = getPuzzleById(draft.puzzleId)
    this.startPuzzle(puzzle, {
      cols: draft.cols,
      order: draft.order,
      sessionId: draft.id
    })
  },

  onPickPuzzle(e) {
    const puzzle = getPuzzleById(e.currentTarget.dataset.id)
    this.startPuzzle(puzzle, { cols: this.data.cols })
  },

  onOpenSession(e) {
    const id = e.currentTarget.dataset.id
    const draft = drafts.get(id)
    if (!draft) {
      wx.showToast({ title: '会话不存在', icon: 'none' })
      return
    }
    this.openDraft(draft)
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
        const sessions = drafts.list().map(this.toChip)
        if (id === this.data.sessionId) {
          this.setData({
            playing: false,
            sessionId: '',
            sessions
          })
          return
        }
        this.setData({ sessions })
      }
    })
  },

  onBackGallery() {
    this.setData({
      playing: false,
      sessionId: '',
      selectedIndex: -1
    })
  },

  onChangeCols(e) {
    const cols = Number(e.currentTarget.dataset.cols)
    if (!cols || cols === this.data.cols) return
    const apply = () => {
      const puzzle = getPuzzleById(this.data.puzzleId)
      this.startPuzzle(puzzle, { cols, sessionId: this.data.sessionId })
    }
    if (!this.data.solved && this.data.order && this.data.order.length) {
      wx.showModal({
        title: '更换难度',
        content: '会重新打乱当前拼图。',
        confirmText: '更换',
        success: (res) => {
          if (res.confirm) apply()
        }
      })
      return
    }
    apply()
  },

  onTapTile(e) {
    if (this.data.solved) return
    const index = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(index)) return
    const selectedIndex = this.data.selectedIndex
    if (selectedIndex < 0) {
      this.setData({ selectedIndex: index })
      return
    }
    if (selectedIndex === index) {
      this.setData({ selectedIndex: -1 })
      return
    }
    const order = this.data.order.slice()
    const tmp = order[selectedIndex]
    order[selectedIndex] = order[index]
    order[index] = tmp
    const solved = isSolved(order)
    this.setData({
      order,
      tiles: buildTiles(order, this.data.cols),
      selectedIndex: -1,
      solved
    })
    if (solved) {
      wx.showToast({ title: '拼好了', icon: 'success' })
    }
  },

  currentPayload() {
    return {
      id: this.data.sessionId || undefined,
      name: `${this.data.puzzleName} ${this.data.cols}×${this.data.cols}`,
      puzzleId: this.data.puzzleId,
      cols: this.data.cols,
      order: this.data.order
    }
  },

  persistCurrent(forceOverwriteId) {
    const payload = this.currentPayload()
    if (forceOverwriteId) {
      const saved = drafts.overwrite(forceOverwriteId, payload)
      this.setData({
        sessionId: saved.item.id,
        sessions: saved.list.map(this.toChip)
      })
      return saved
    }
    const saved = drafts.save(payload)
    if (saved.ok) {
      this.setData({
        sessionId: saved.item.id,
        sessions: saved.list.map(this.toChip)
      })
    }
    return saved
  },

  onSaveDraft() {
    if (!this.data.playing) return
    const saved = this.persistCurrent()
    if (!saved.ok) {
      const list = drafts.list()
      wx.showActionSheet({
        itemList: list.map((item) => `覆盖「${item.name}」`),
        success: (res) => {
          const target = list[res.tapIndex]
          if (!target) return
          this.persistCurrent(target.id)
          wx.showToast({ title: '已暂存', icon: 'success' })
        }
      })
      return
    }
    wx.showToast({ title: '已暂存', icon: 'success' })
  },

  paintBoard(ctx, x, y, w, h, image) {
    const cols = this.data.cols
    const order = this.data.order
    const tileW = w / cols
    const tileH = h / cols
    const srcW = image.width
    const srcH = image.height
    const srcTileW = srcW / cols
    const srcTileH = srcH / cols
    const gap = 1.5
    order.forEach((source, index) => {
      const dc = index % cols
      const dr = Math.floor(index / cols)
      const sc = source % cols
      const sr = Math.floor(source / cols)
      ctx.drawImage(
        image,
        sc * srcTileW,
        sr * srcTileH,
        srcTileW,
        srcTileH,
        x + dc * tileW + gap,
        y + dr * tileH + gap,
        tileW - gap * 2,
        tileH - gap * 2
      )
    })
  },

  onSaveCard() {
    if (!this.data.playing || !this.data.imagePath) {
      wx.showToast({ title: '请先选择拼图', icon: 'none' })
      return
    }
    if (this._savingCard) return
    this._savingCard = true
    this.setData({ savingCard: true })
    wx.showLoading({ title: '正在生成', mask: true })
    const imagePath = this.data.imagePath
    const title = this.data.puzzleName
    const note = this.data.solved ? '已完成拼图' : `${this.data.cols}×${this.data.cols} 进行中`
    const self = this
    const artCanvas = this._artCanvas
    const loadImage = () =>
      new Promise((resolve, reject) => {
        if (!artCanvas || typeof artCanvas.createImage !== 'function') {
          reject({ errMsg: 'canvas missing' })
          return
        }
        const img = artCanvas.createImage()
        img.onload = () => resolve(img)
        img.onerror = () => reject({ errMsg: 'image load fail' })
        img.src = imagePath
      })

    loadImage()
      .then((image) =>
        saveResultCard(self, 'resultCard', (ctx, width, height) => {
          drawArtworkCard(ctx, width, height, {
            title: '拼图',
            headerColors: ['#60a5fa', '#2563eb'],
            note: `${title} · ${note}`,
            paint: (c, x, y, w, h) => self.paintBoard(c, x, y, w, h, image)
          })
        })
      )
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
    return getPuzzleToolShare().appMessage
  },

  onShareTimeline() {
    return getPuzzleToolShare().timeline
  },

  onHide() {
    if (this.data.playing && this.data.puzzleId) {
      this.persistCurrent()
    }
  }
})
