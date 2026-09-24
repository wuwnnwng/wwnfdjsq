const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getMbtiToolShare } = require('../../../utils/share')
const { saveResultCard, handleSaveError } = require('../../../utils/resultCard')
const { showRouteInterstitial } = require('../../../utils/ads')
const { drawMbtiCard } = require('../../utils/mbtiCard')
const {
  getType,
  buildQuiz,
  getModes,
  buildResult,
  buildPreview,
  buildSharedResult,
  getAtlas,
  summarizeHistory,
  describeDraft,
  firstOpenIndex,
  formatClipboard,
  modeName
} = require('../../utils/mbtiEngine')
const store = require('../../utils/mbtiStore')

const OPTIONS = [
  { value: 0, label: '很符合', hint: '几乎就是这样' },
  { value: 1, label: '比较符合', hint: '多数时候如此' },
  { value: 2, label: '说不准', hint: '看情况' },
  { value: 3, label: '不太符合', hint: '不太像我' },
  { value: 4, label: '很不符合', hint: '基本不是' }
]

const TABS = [
  { id: 'portrait', name: '画像' },
  { id: 'edge', name: '优势' },
  { id: 'work', name: '职场' },
  { id: 'bond', name: '关系' }
]

Page({
  data: {
    theme: getThemeId(),
    stage: 'home',
    groups: getAtlas(),
    modes: getModes(),
    options: OPTIONS,
    tabs: TABS,
    history: [],
    lastResult: null,
    draftText: '',
    draftMode: '',
    quiz: null,
    result: null,
    resultTab: 'portrait',
    showBackOwn: false,
    savingCard: false
  },

  onLoad(query) {
    enableShareMenu()
    this._ownResult = null
    this._history = []
    this._draft = null
    this.refreshHome()
    const code = String((query && query.code) || '').toUpperCase()
    if (!getType(code)) return
    const shared = query && query.d ? buildSharedResult(code, query.d) : null
    const result = shared || buildPreview(code)
    if (!result) return
    this.setData({
      stage: 'result',
      result,
      resultTab: 'portrait',
      showBackOwn: false
    })
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    if (this.data.stage === 'home') this.refreshHome()
  },

  onHide() {
    if (this.data.stage === 'quiz') this.persistDraft()
  },

  onUnload() {
    this._token = (this._token || 0) + 1
    this.armGuard(false)
    if (this.data.stage === 'quiz') this.persistDraft()
  },

  refreshHome() {
    this._draft = store.loadDraft()
    this._history = store.loadHistory()
    const history = this._history.map(summarizeHistory).filter(Boolean)
    this.setData({
      history,
      lastResult: history[0] || null,
      draftText: describeDraft(this._draft),
      draftMode: (this._draft && this._draft.mode) || ''
    })
  },

  armGuard(on) {
    try {
      if (on && wx.enableAlertBeforeUnload) {
        wx.enableAlertBeforeUnload({ message: '答题进度已留在这台设备上' })
        return
      }
      if (!on && wx.disableAlertBeforeUnload) wx.disableAlertBeforeUnload()
    } catch (e) {}
  },

  persistDraft() {
    if (!this._quiz || !this._mode) return
    store.saveDraft({
      mode: this._mode,
      answers: Object.assign({}, this._answers || {}),
      at: Date.now()
    })
    this._draft = store.loadDraft()
  },

  showQuestion() {
    const quiz = this._quiz || []
    const question = quiz[this._index]
    if (!question) return
    const total = quiz.length
    const picked = this._answers[question.id]
    this.setData({
      stage: 'quiz',
      quiz: {
        number: this._index + 1,
        total,
        progress: Math.round(((this._index + 1) / total) * 100),
        text: question.text,
        selected: typeof picked === 'number' ? picked : -1,
        modeName: modeName(this._mode),
        canPrev: this._index > 0
      }
    })
  },

  startQuiz(mode) {
    this._quiz = buildQuiz(mode)
    this._answers = {}
    this._index = 0
    this._mode = mode === 'quick' || mode === 'deep' ? mode : 'standard'
    this._advancing = false
    this.persistDraft()
    this.armGuard(true)
    this.showQuestion()
  },

  resumeDraft() {
    const draft = this._draft || store.loadDraft()
    if (!draft) {
      this.startQuiz('standard')
      return
    }
    const quiz = buildQuiz(draft.mode)
    const answers = draft.answers || {}
    this._quiz = quiz
    this._answers = Object.assign({}, answers)
    this._mode = draft.mode
    const index = firstOpenIndex(quiz, this._answers)
    if (index >= quiz.length) {
      this.finishQuiz()
      return
    }
    this._index = index
    this._advancing = false
    this.armGuard(true)
    this.showQuestion()
  },

  onStart(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode !== 'quick' && mode !== 'standard' && mode !== 'deep') return
    const draft = this._draft
    const draftCount = draft && draft.answers
      ? Object.keys(draft.answers).filter((key) => typeof draft.answers[key] === 'number').length
      : 0
    if (draftCount && draft.mode === mode) {
      this.resumeDraft()
      return
    }
    if (draftCount) {
      wx.showModal({
        title: '有未完成的测试',
        content: '开始新的测试会盖掉当前进度。',
        confirmText: '重新开始',
        cancelText: '留下',
        success: (res) => {
          if (res.confirm) this.startQuiz(mode)
        }
      })
      return
    }
    this.startQuiz(mode)
  },

  onResume() {
    this.resumeDraft()
  },

  onExitQuiz() {
    wx.showModal({
      title: '先离开答题？',
      content: '进度会留在这台设备上，下次可以继续。',
      confirmText: '离开',
      cancelText: '继续答',
      success: (res) => {
        if (res.confirm) this.leaveQuiz()
      }
    })
  },

  leaveQuiz() {
    this._token = (this._token || 0) + 1
    this._advancing = false
    this.persistDraft()
    this.armGuard(false)
    this.refreshHome()
    this.setData({ stage: 'home', quiz: null })
  },

  onPrev() {
    if (this._advancing || !this._index) return
    this._token = (this._token || 0) + 1
    this._advancing = false
    this._index -= 1
    this.showQuestion()
  },

  onPick(e) {
    if (this._advancing) return
    const value = Number(e.currentTarget.dataset.value)
    if (value < 0 || value > 4 || !isFinite(value)) return
    const question = this._quiz && this._quiz[this._index]
    if (!question) return
    this._answers[question.id] = value
    this.persistDraft()
    this.setData({ 'quiz.selected': value })
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light', fail() {} })
    const token = (this._token = (this._token || 0) + 1)
    this._advancing = true
    setTimeout(() => {
      if (token !== this._token) return
      this._advancing = false
      if (this._index >= this._quiz.length - 1) {
        this.finishQuiz()
        return
      }
      this._index += 1
      this.showQuestion()
    }, 220)
  },

  finishQuiz() {
    this._token = (this._token || 0) + 1
    this._advancing = false
    this.armGuard(false)
    const result = buildResult(this._quiz, this._answers, this._mode, Date.now())
    store.clearDraft()
    this._draft = null
    store.pushHistory({
      at: result.at,
      mode: result.mode,
      code: result.code,
      name: result.name,
      answers: Object.assign({}, this._answers)
    })
    this._ownResult = result
    this.refreshHome()
    this.setData({
      stage: 'result',
      result,
      resultTab: 'portrait',
      showBackOwn: false,
      quiz: null
    })
    const token = (this._adToken = (this._adToken || 0) + 1)
    setTimeout(() => {
      if (token !== this._adToken) return
      if (this._adsUnloaded || this.data.stage !== 'result') return
      showRouteInterstitial(this)
    }, 450)
  },

  openResult(result, own) {
    if (own) this._ownResult = result
    this.setData({
      stage: 'result',
      result,
      resultTab: 'portrait',
      showBackOwn: !!(this._ownResult && result && result.preview)
    })
  },

  onPreview(e) {
    const code = e.currentTarget.dataset.code
    const result = buildPreview(code)
    if (!result) return
    const current = this.data.result
    if (current && !current.preview && !current.shared) this._ownResult = current
    this.openResult(result, false)
  },

  onOpenHistory(e) {
    const at = Number(e.currentTarget.dataset.at)
    const item = (this._history || []).find((row) => row.at === at)
    if (!item) return
    let result = null
    if (item.answers) result = buildResult(buildQuiz(item.mode || 'standard'), item.answers, item.mode || 'standard', item.at)
    if (!result) result = buildPreview(item.code)
    if (!result) return
    result.preview = false
    result.shared = false
    this.openResult(result, true)
  },

  onBackOwn() {
    if (!this._ownResult) return
    this.openResult(this._ownResult, true)
  },

  onRetest() {
    this._adToken = (this._adToken || 0) + 1
    this.armGuard(false)
    this.refreshHome()
    this.setData({ stage: 'home', resultTab: 'portrait' })
  },

  onTab(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.data.resultTab) return
    this.setData({ resultTab: id })
  },

  onCopy() {
    const result = this.data.result
    if (!result) return
    wx.setClipboardData({ data: formatClipboard(result) })
  },

  onClearHistory() {
    wx.showModal({
      title: '清空测试记录？',
      content: '只删除保存在这台设备上的记录。',
      confirmText: '清空',
      success: (res) => {
        if (!res.confirm) return
        store.clearHistory()
        this._ownResult = null
        this.refreshHome()
        if (this.data.stage !== 'home') this.setData({ stage: 'home' })
      }
    })
  },

  onSaveCard() {
    const result = this.data.result
    if (!result || !result.code) {
      wx.showToast({ title: '暂时没有结果', icon: 'none' })
      return
    }
    if (this._savingCard) return
    this._savingCard = true
    this.setData({ savingCard: true })
    wx.showLoading({ title: '正在生成', mask: true })
    saveResultCard(this, 'resultCard', (ctx, width, height) => {
      drawMbtiCard(ctx, width, height, result)
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
    const result = this.data.stage === 'result' ? this.data.result : null
    return getMbtiToolShare(result).appMessage
  },

  onShareTimeline() {
    const result = this.data.stage === 'result' ? this.data.result : null
    return getMbtiToolShare(result).timeline
  }
})
