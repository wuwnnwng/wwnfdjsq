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
const ART_SIZE = 300
const DRAG_THRESHOLD = 12

function galleryCards() {
  return PUZZLES.map((item) =>
    Object.assign({}, item, {
      thumbStyle: `background: linear-gradient(160deg, ${item.colors[0]}, ${item.colors[1]});`,
      thumbPath: ''
    })
  )
}

function tilePixelSize(boardSize, cols) {
  const rpx = windowWidth() / 750
  const pad = 6 * rpx
  const gap = 6 * rpx
  return (boardSize - pad * 2 - gap * (cols - 1)) / cols
}

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
    puzzles: galleryCards(),
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
    savingCard: false,
    tilePx: 72,
    dragFrom: -1,
    dragBgPos: '0% 0%'
  },

  onLoad() {
    enableShareMenu()
    const boardSize = Math.max(240, Math.round(windowWidth() - 36))
    this.setData({
      boardSize,
      tilePx: tilePixelSize(boardSize, this.data.cols),
      sessions: drafts.list().map(this.toChip)
    })
    const last = drafts.get(drafts.getLastId())
    if (last) this.openDraft(last)
  },

  onReady() {
    this.prepareCanvases()
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

  pixelRatio() {
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      return info.pixelRatio || 2
    } catch (e) {
      return 2
    }
  },

  prepareCanvases() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#puzzleArt').fields({ node: true, size: true })
    query.select('#puzzleThumbs').fields({ node: true, size: true })
    query.exec((res) => {
      this.initArtCanvas(res && res[0])
      this.initThumbCanvas(res && res[1])
    })
  },

  initArtCanvas(info) {
    if (!info || !info.node) return
    const canvas = info.node
    const ctx = canvas.getContext('2d')
    const dpr = this.pixelRatio()
    canvas.width = ART_SIZE * dpr
    canvas.height = ART_SIZE * dpr
    ctx.scale(dpr, dpr)
    this._artCanvas = canvas
    this._artCtx = ctx
    this._artSize = ART_SIZE
    if (this._pendingPuzzle) {
      const puzzle = this._pendingPuzzle
      this._pendingPuzzle = null
      this.renderPuzzleImage(puzzle)
    }
  },

  initThumbCanvas(info) {
    if (!info || !info.node) return
    const canvas = info.node
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(2, this.pixelRatio())
    canvas.width = ART_SIZE * dpr
    canvas.height = ART_SIZE * dpr
    ctx.scale(dpr, dpr)
    this._thumbCanvas = canvas
    this._thumbCtx = ctx
    this._thumbIndex = 0
    this.renderNextThumb()
  },

  renderNextThumb() {
    const ctx = this._thumbCtx
    const canvas = this._thumbCanvas
    const index = this._thumbIndex
    if (!ctx || !canvas || index >= PUZZLES.length) return
    drawPuzzleArt(ctx, ART_SIZE, ART_SIZE, PUZZLES[index])
    const exportThumb = () => {
      wx.canvasToTempFilePath({
        canvas,
        fileType: 'png',
        destWidth: 240,
        destHeight: 240,
        success: (res) => {
          this.setData({ [`puzzles[${index}].thumbPath`]: res.tempFilePath })
        },
        complete: () => {
          this._thumbIndex = index + 1
          this.renderNextThumb()
        }
      })
    }
    if (typeof canvas.requestAnimationFrame === 'function') {
      canvas.requestAnimationFrame(exportThumb)
    } else {
      setTimeout(exportThumb, 16)
    }
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
      tilePx: tilePixelSize(this.data.boardSize, cols),
      sessionId: options.sessionId || '',
      sessions: drafts.list().map(this.toChip)
    })
    if (options.sessionId) drafts.setLastId(options.sessionId)
    this.renderPuzzleImage(puzzle)
    this._board = null
    if (typeof wx.nextTick === 'function') {
      wx.nextTick(() => this.refreshBoardRect())
    } else {
      setTimeout(() => this.refreshBoardRect(), 0)
    }
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
    this.clearDragState()
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

  cacheBoardLayout(rect) {
    if (!rect) return
    const cols = this.data.cols
    const rpx = windowWidth() / 750
    const pad = 6 * rpx
    const gap = 6 * rpx
    const inner = rect.width - pad * 2
    const tileSize = (inner - gap * (cols - 1)) / cols
    this._board = {
      left: rect.left,
      top: rect.top,
      size: rect.width,
      pad,
      gap,
      tileSize,
      cols
    }
  },

  refreshBoardRect(cb) {
    wx.createSelectorQuery()
      .in(this)
      .select('#tileBoard')
      .boundingClientRect((rect) => {
        this.cacheBoardLayout(rect)
        if (cb) cb()
      })
      .exec()
  },

  indexFromClient(x, y) {
    const board = this._board
    if (!board) return -1
    const localX = x - board.left
    const localY = y - board.top
    if (localX < 0 || localY < 0 || localX > board.size || localY > board.size) return -1
    const col = Math.min(
      board.cols - 1,
      Math.max(0, Math.floor((localX - board.pad) / (board.tileSize + board.gap)))
    )
    const row = Math.min(
      board.cols - 1,
      Math.max(0, Math.floor((localY - board.pad) / (board.tileSize + board.gap)))
    )
    return row * board.cols + col
  },

  clearDragState(extra) {
    this._dragFrom = null
    this._touchStart = null
    const data = Object.assign(
      {
        dragFrom: -1
      },
      extra || {}
    )
    this.setData(data)
  },

  swapTiles(from, to) {
    if (from === to || from < 0 || to < 0) return
    const order = this.data.order.slice()
    if (from >= order.length || to >= order.length) return
    const tmp = order[from]
    order[from] = order[to]
    order[to] = tmp
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

  handleTapTile(index) {
    if (this.data.solved) return
    const selectedIndex = this.data.selectedIndex
    if (selectedIndex < 0) {
      this.setData({ selectedIndex: index })
      return
    }
    if (selectedIndex === index) {
      this.setData({ selectedIndex: -1 })
      return
    }
    this.swapTiles(selectedIndex, index)
  },

  onTileTouchStart(e) {
    if (this.data.solved) return
    const index = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(index)) return
    const touch = e.touches[0]
    this._dragFrom = index
    this._touchStart = { x: touch.clientX, y: touch.clientY }
    const tile = this.data.tiles[index]
    this.setData({
      dragFrom: index,
      dragBgPos: tile ? tile.bgPos : '0% 0%'
    })
    this.refreshBoardRect()
  },

  onTileTouchEnd(e) {
    if (this.data.solved) {
      this.clearDragState()
      return
    }
    const from = this._dragFrom
    const start = this._touchStart
    const touch = e.changedTouches && e.changedTouches[0]
    this._dragFrom = null
    this._touchStart = null
    if (from == null) {
      this.clearDragState()
      return
    }
    const moved =
      start && touch
        ? Math.hypot(touch.clientX - start.x, touch.clientY - start.y) >= DRAG_THRESHOLD
        : false
    if (!moved) {
      this.clearDragState()
      this.handleTapTile(from)
      return
    }
    const to = touch && this._board ? this.indexFromClient(touch.clientX, touch.clientY) : -1
    this.clearDragState()
    if (to >= 0) this.swapTiles(from, to)
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
