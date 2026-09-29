const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu } = require('../../../utils/share')
const { getHome, getSubs, getLevels, buildRun, scoreOf, liveScore, buildResult } = require('../../utils/focusEngine')

const PAGE_PATH = '/packageFocus/pages/focus/focus'
const DISCLAIMER = '本测试仅为趣味娱乐，结果只反映这次答题的发挥，供日常参考。'
const HOME = getHome()

function decorateSubs(list) {
  return (list || []).map((item, index) => ({
    id: item.id,
    name: item.name,
    hint: item.hint,
    no: index < 9 ? '0' + (index + 1) : String(index + 1),
    tone: index % 2 === 0 ? 'brand' : 'accent'
  }))
}

function emptyBoard() {
  return {
    kind: '',
    text: '',
    symbols: [],
    cells: [],
    left: '',
    right: '',
    swatch: '',
    glyph: '',
    note: '',
    compact: false,
    gridSize: 3
  }
}

function normalizeBoard(board) {
  const next = Object.assign(emptyBoard(), board || {})
  next.symbols = (next.symbols || []).map((text, n) => (text && text.text ? text : { n, text }))
  next.cells = next.cells || []
  next.gridSize = next.gridSize || 3
  return next
}

Page({
  data: {
    theme: getThemeId(),
    stage: 'home',
    disclaimer: DISCLAIMER,
    dims: HOME,
    dimId: HOME[0] ? HOME[0].id : '',
    subs: decorateSubs(getSubs(HOME[0] ? HOME[0].id : '')),
    levels: [],
    dimName: HOME[0] ? HOME[0].name : '',
    dimHint: HOME[0] ? HOME[0].hint : '',
    subName: '',
    levelName: '',
    liveScore: 0,
    no: 0,
    total: 0,
    phase: '',
    flashLeft: 0,
    board: emptyBoard(),
    prompt: '',
    hint: '',
    options: [],
    tapItems: [],
    balls: [],
    showArena: false,
    ballStill: true,
    arenaStyle: '',
    markText: '',
    result: null,
    retainBack: false
  },

  onLoad() {
    enableShareMenu()
    this._token = 0
    this._records = []
    this._questions = []
    this._index = 0
    this._lock = false
    this._shownAt = 0
    this._dimId = HOME[0] ? HOME[0].id : ''
    this._subId = ''
    this._levelId = ''
    this._slots = []
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onUnload() {
    this.clearTimers()
  },

  clearTimers() {
    ;['_flashTimer', '_nextTimer', '_trackTimer'].forEach((key) => {
      if (this[key]) clearTimeout(this[key])
      this[key] = null
    })
    this._token = (this._token || 0) + 1
  },

  applyDim(id) {
    const dim = this.data.dims.find((item) => item.id === id)
    if (!dim || id === this._dimId && this.data.subs.length) return
    this._dimId = id
    this.setData({
      dimId: id,
      dimName: dim.name,
      dimHint: dim.hint,
      subs: decorateSubs(getSubs(id))
    })
  },

  onSwitchDim(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this._dimId) return
    this.applyDim(id)
  },

  onOpenSub(e) {
    const id = e.currentTarget.dataset.id
    const sub = this.data.subs.find((item) => item.id === id)
    if (!sub) return
    this._subId = id
    this.setData({
      stage: 'levels',
      subName: sub.name,
      levels: getLevels(id),
      retainBack: true
    })
  },

  stepBack() {
    this.clearTimers()
    const stage = this.data.stage
    let next = 'home'
    const patch = {
      showArena: false,
      balls: [],
      phase: '',
      options: [],
      tapItems: []
    }
    if (stage === 'result' || stage === 'play') next = 'levels'
    else next = 'home'
    if (next === 'home') patch.result = null
    patch.stage = next
    this.setData(patch)
    return next
  },

  onBack() {
    const next = this.stepBack()
    this.setData({ retainBack: next !== 'home' })
  },

  onRetainBack() {
    if (this._backing) return
    this._backing = true
    const next = this.stepBack()
    this.setData({ retainBack: false })
    setTimeout(() => {
      this._backing = false
      if (next !== 'home' && this.data.stage === next) this.setData({ retainBack: true })
    }, 120)
  },

  onStartLevel(e) {
    const levelId = e.currentTarget.dataset.id
    const level = this.data.levels.find((item) => item.id === levelId)
    if (!level || !this._subId) return
    this._levelId = levelId
    this.clearTimers()
    this._records = []
    this._questions = buildRun(this._subId, levelId)
    this._index = 0
    this._lock = false
    this._shownAt = 0
    this.setData({
      stage: 'play',
      levelName: level.name,
      liveScore: 0,
      result: null,
      markText: ''
    })
    this.present(0)
  },

  onRetry() {
    if (!this._subId || !this._levelId) return
    this.onStartLevel({ currentTarget: { dataset: { id: this._levelId } } })
  },

  playHead(quiz) {
    return {
      stage: 'play',
      no: quiz.no,
      total: quiz.total,
      dimName: quiz.dimName,
      subName: quiz.subName,
      levelName: quiz.levelName,
      markText: ''
    }
  },

  present(index) {
    const quiz = this._questions[index]
    if (!quiz) return
    this._index = index
    this._shownAt = 0
    if (quiz.mode === 'track') {
      this.presentTrack(quiz)
      return
    }
    if (quiz.mode === 'tap') {
      this.presentTap(quiz)
      return
    }
    this._lock = quiz.mode === 'flash'
    const board = quiz.mode === 'flash' ? quiz.boardFlash : quiz.boardAsk
    this.setData(Object.assign(this.playHead(quiz), {
      phase: quiz.mode === 'flash' ? 'flash' : 'ask',
      flashLeft: quiz.mode === 'flash' ? Math.ceil(quiz.flashMs / 1000) : 0,
      board: normalizeBoard(board),
      prompt: quiz.mode === 'flash' ? '记住下面的内容' : quiz.prompt,
      hint: quiz.mode === 'flash' ? '马上就会消失' : quiz.hint,
      options: quiz.mode === 'flash' ? [] : (quiz.options || []).map((item) => Object.assign({}, item, { status: '' })),
      tapItems: [],
      balls: [],
      showArena: false
    }), () => {
      if (quiz.mode === 'flash') this.startFlash(quiz)
      else this._shownAt = Date.now()
    })
  },

  presentTap(quiz) {
    this._lock = false
    this.setData(Object.assign(this.playHead(quiz), {
      phase: 'ask',
      flashLeft: 0,
      board: emptyBoard(),
      prompt: quiz.prompt,
      hint: quiz.hint,
      options: [],
      tapItems: quiz.tapItems.map((item) => Object.assign({}, item, { status: '' })),
      balls: [],
      showArena: false
    }), () => {
      this._shownAt = Date.now()
    })
  },

  layoutBalls(quiz, slots, marked) {
    const showLabel = marked || !quiz.hideLabel
    return quiz.balls.map((ball) => {
      const slot = slots.indexOf(ball.id)
      const pos = quiz.slotPos[slot] || { x: 50, y: 50 }
      return {
        id: ball.id,
        label: showLabel ? ball.label : '',
        color: ball.color,
        ink: ball.ink,
        x: pos.x,
        y: pos.y,
        marked: !!(marked && ball.id === quiz.answer),
        status: ''
      }
    })
  },

  presentTrack(quiz) {
    const token = this._token
    this._slots = quiz.startSlots.slice()
    this._lock = true
    this.setData(Object.assign(this.playHead(quiz), {
      phase: 'mark',
      flashLeft: 0,
      board: emptyBoard(),
      prompt: '盯住被圈住的球',
      hint: '一会儿圈会消失',
      options: [],
      tapItems: [],
      showArena: true,
      ballStill: true,
      arenaStyle: '--ball-move:' + quiz.moveMs + 'ms;',
      balls: this.layoutBalls(quiz, this._slots, true)
    }), () => {
      this._trackTimer = setTimeout(() => {
        if (token !== this._token) return
        this.setData({ ballStill: false })
        this._trackTimer = setTimeout(() => {
          if (token !== this._token) return
          this.beginSwaps(quiz, token)
        }, quiz.markMs)
      }, 50)
    })
  },

  beginSwaps(quiz, token) {
    if (token !== this._token) return
    this.setData({
      phase: 'move',
      prompt: '跟着它走',
      hint: '先别点',
      balls: this.layoutBalls(quiz, this._slots, false)
    })
    this._trackTimer = setTimeout(() => {
      if (token !== this._token) return
      this.stepSwap(quiz, 0, token)
    }, 40)
  },

  stepSwap(quiz, index, token) {
    if (token !== this._token) return
    if (index >= quiz.swaps.length) {
      this._lock = false
      this._shownAt = Date.now()
      this.setData({
        phase: 'ask',
        prompt: quiz.prompt,
        hint: quiz.hint,
        balls: this.layoutBalls(quiz, this._slots, false)
      })
      return
    }
    const swap = quiz.swaps[index]
    const slots = this._slots.slice()
    const tmp = slots[swap.a]
    slots[swap.a] = slots[swap.b]
    slots[swap.b] = tmp
    this._slots = slots
    this.setData({ balls: this.layoutBalls(quiz, slots, false) })
    this._trackTimer = setTimeout(() => this.stepSwap(quiz, index + 1, token), quiz.moveMs + 70)
  },

  startFlash(quiz) {
    const token = this._token
    const ends = Date.now() + quiz.flashMs
    let lastSec = -1
    const tick = () => {
      if (token !== this._token) return
      const left = Math.max(0, ends - Date.now())
      const sec = Math.ceil(left / 1000)
      if (sec !== lastSec) {
        lastSec = sec
        this.setData({ flashLeft: sec })
      }
      if (left <= 0) {
        this.revealAsk(quiz, token)
        return
      }
      this._flashTimer = setTimeout(tick, 200)
    }
    tick()
  },

  revealAsk(quiz, token) {
    if (token !== this._token) return
    this._lock = false
    this.setData({
      phase: 'ask',
      flashLeft: 0,
      board: normalizeBoard(quiz.boardAsk),
      prompt: quiz.prompt,
      hint: quiz.hint,
      options: (quiz.options || []).map((item) => Object.assign({}, item, { status: '' }))
    }, () => {
      if (token !== this._token) return
      this._shownAt = Date.now()
    })
  },

  settle(answer, paint) {
    if (this._lock || this.data.phase !== 'ask') return
    const quiz = this._questions[this._index]
    if (!quiz || answer === undefined || answer === '') return
    const elapsed = Date.now() - (this._shownAt || Date.now())
    const score = scoreOf(quiz, answer, elapsed)
    this._lock = true
    this._records.push({ dim: quiz.dim, score })
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
    const token = this._token
    const patch = paint(quiz, answer)
    patch.liveScore = liveScore(this._records)
    patch.markText = score ? '这题 ' + score + ' 分' : '这题没对上'
    this.setData(patch)
    this._nextTimer = setTimeout(() => {
      if (token !== this._token) return
      this._lock = false
      if (this._index + 1 >= this._questions.length) this.finish()
      else this.present(this._index + 1)
    }, quiz.mode === 'track' ? 720 : 560)
  },

  onPick(e) {
    const key = e.currentTarget.dataset.key
    this.settle(key, (quiz, answer) => ({
      options: this.data.options.map((item) => {
        let status = ''
        if (item.key === quiz.answer) status = 'ok'
        else if (item.key === answer) status = 'bad'
        return Object.assign({}, item, { status })
      })
    }))
  },

  onTapItem(e) {
    const id = e.currentTarget.dataset.id
    this.settle(id, (quiz, answer) => ({
      tapItems: this.data.tapItems.map((item) => {
        let status = ''
        if (item.id === quiz.answer) status = 'ok'
        else if (item.id === answer) status = 'bad'
        return Object.assign({}, item, { status })
      })
    }))
  },

  onTapBall(e) {
    const id = e.currentTarget.dataset.id
    this.settle(id, (quiz, answer) => ({
      balls: this.data.balls.map((item) => {
        let status = ''
        if (item.id === quiz.answer) status = 'ok'
        else if (item.id === answer) status = 'bad'
        return Object.assign({}, item, { status, marked: false })
      })
    }))
  },

  finish() {
    const quiz = this._questions[0] || {}
    const result = buildResult(this._records, quiz)
    this.setData({
      stage: 'result',
      result,
      liveScore: result.score,
      phase: '',
      options: [],
      tapItems: [],
      showArena: false,
      balls: [],
      markText: '',
      board: emptyBoard()
    })
  },

  sharePayload() {
    const result = this.data.result
    if (this.data.stage === 'result' && result) {
      return {
        title: result.subName + ' · ' + result.levelName + ' ' + result.score + ' 分，你也来一把',
        path: PAGE_PATH
      }
    }
    return {
      title: '综合脑力自测｜小小便民工具箱',
      path: PAGE_PATH
    }
  },

  onShareAppMessage() {
    return this.sharePayload()
  },

  onShareTimeline() {
    return { title: this.sharePayload().title }
  }
})
