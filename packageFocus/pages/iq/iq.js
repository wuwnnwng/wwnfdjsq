const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu } = require('../../../utils/share')
const { listForms, getForm, scoreAttempt } = require('../../utils/iqEngine')

const PAGE_PATH = '/packageFocus/pages/iq/iq'
const KEYS = ['A', 'B', 'C', 'D']
const DOMAIN_NAME = {
  verbal: '词语关系',
  number: '数量关系',
  space: '空间变换',
  reason: '逻辑推理'
}

function blankAnswers(total) {
  const list = []
  for (let i = 0; i < total; i++) list.push(-1)
  return list
}

function questionView(form, index, answers) {
  const item = form.items[index]
  const picked = answers[index]
  return {
    no: index + 1,
    total: form.items.length,
    domainName: DOMAIN_NAME[item.domain] || '',
    prompt: item.prompt,
    rows: (item.rows || []).map((row, n) => ({
      n,
      cells: row.map((text, i) => ({ i, text }))
    })),
    options: item.options.map((text, i) => ({
      key: KEYS[i] || '',
      text,
      on: picked === i
    })),
    canPrev: index > 0,
    isLast: index === form.items.length - 1,
    progress: Math.round(((index + 1) / form.items.length) * 100)
  }
}

Page({
  data: {
    theme: getThemeId(),
    stage: 'pick',
    childForms: [],
    adultForms: [],
    formName: '',
    ageText: '',
    no: 1,
    total: 16,
    domainName: '',
    prompt: '',
    rows: [],
    options: [],
    canPrev: false,
    isLast: false,
    progress: 0,
    showMisses: false,
    result: null,
    retainBack: false
  },

  onLoad() {
    enableShareMenu()
    const forms = listForms()
    this.setData({
      childForms: forms.filter((item) => item.group === 'child'),
      adultForms: forms.filter((item) => item.group === 'adult')
    })
    this._form = null
    this._answers = []
    this._index = 0
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  showQuestion() {
    const view = questionView(this._form, this._index, this._answers)
    this.setData(Object.assign({ stage: 'quiz' }, view))
  },

  onStart(e) {
    const form = getForm(e.currentTarget.dataset.id)
    if (!form) return
    this._form = form
    this._answers = blankAnswers(form.items.length)
    this._index = 0
    this.setData({
      formName: form.name,
      ageText: form.ageText,
      showMisses: false,
      result: null,
      retainBack: true
    })
    this.showQuestion()
  },

  onPick(e) {
    const at = Number(e.currentTarget.dataset.index)
    if (!(at >= 0)) return
    this._answers[this._index] = at
    this.showQuestion()
  },

  onPrev() {
    if (this._index <= 0) return
    this._index -= 1
    this.showQuestion()
  },

  onNext() {
    if (this._answers[this._index] < 0) {
      wx.showToast({ title: '请先选择一个答案', icon: 'none' })
      return
    }
    if (this._index >= this._form.items.length - 1) {
      this.finish()
      return
    }
    this._index += 1
    this.showQuestion()
  },

  finish() {
    const result = scoreAttempt(this._form.id, this._answers)
    this.setData({
      stage: 'result',
      showMisses: false,
      result,
      retainBack: true
    })
  },

  onToggleMisses() {
    this.setData({ showMisses: !this.data.showMisses })
  },

  leavePick() {
    this._form = null
    this._answers = []
    this.setData({ stage: 'pick', result: null, showMisses: false, retainBack: false })
  },

  onBack() {
    if (this.data.stage !== 'quiz') {
      this.leavePick()
      return
    }
    wx.showModal({
      title: '离开测试',
      content: '现在离开，这次作答不会保存。',
      confirmText: '离开',
      success: (res) => {
        if (!res.confirm) return
        this.leavePick()
      }
    })
  },

  onRetainBack() {
    if (this._backing) return
    this._backing = true
    const stage = this.data.stage
    this.setData({ retainBack: false })
    if (stage === 'quiz') {
      wx.showModal({
        title: '离开测试',
        content: '现在离开，这次作答不会保存。',
        confirmText: '离开',
        complete: () => {
          this._backing = false
        },
        success: (res) => {
          if (res.confirm) {
            this.leavePick()
            return
          }
          if (this.data.stage === 'quiz') this.setData({ retainBack: true })
        }
      })
      return
    }
    this.leavePick()
    this._backing = false
  },

  onRetry() {
    this.leavePick()
  },

  sharePayload() {
    const result = this.data.result
    if (this.data.stage === 'result' && result && result.report) {
      return {
        title: result.formName + '（' + result.ageText + '）估算区间 ' + result.low + '–' + result.high,
        path: PAGE_PATH
      }
    }
    return {
      title: 'IQ智力测试｜小小便民工具箱',
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
