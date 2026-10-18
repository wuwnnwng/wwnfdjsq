const { evaluateScientificExpression } = require('../../../utils/calcEngine')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getCalcToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')
const { addHistory, removeHistory, presentHistory } = require('../../../utils/calcHistory')

function buildKeys(keyboardMode, invOn) {
  const switchKey =
    keyboardMode === 'basic'
      ? {
          id: 'switch',
          label: 'sin',
          subLabel: '函数',
          type: 'action',
          action: 'toggleKeyboard',
          tone: 'switch'
        }
      : {
          id: 'switch',
          label: '+',
          subLabel: '−×÷',
          type: 'action',
          action: 'toggleKeyboard',
          tone: 'switch'
        }

  const commonTail = [
    { id: 'n7', label: '7', type: 'input', value: '7' },
    { id: 'n8', label: '8', type: 'input', value: '8' },
    { id: 'n9', label: '9', type: 'input', value: '9' },
    { id: 'div', label: '÷', type: 'input', value: '/' },
    { id: 'n4', label: '4', type: 'input', value: '4' },
    { id: 'n5', label: '5', type: 'input', value: '5' },
    { id: 'n6', label: '6', type: 'input', value: '6' },
    { id: 'mul', label: '×', type: 'input', value: '*' },
    { id: 'n1', label: '1', type: 'input', value: '1' },
    { id: 'n2', label: '2', type: 'input', value: '2' },
    { id: 'n3', label: '3', type: 'input', value: '3' },
    { id: 'sub', label: '-', type: 'input', value: '-' },
    { id: 'n0', label: '0', type: 'input', value: '0' },
    { id: 'dot', label: '.', type: 'input', value: '.' },
    { id: 'pct', label: '%', type: 'input', value: '%' },
    { id: 'add', label: '+', type: 'input', value: '+' },
    { id: 'eq', label: '=', type: 'action', action: 'equal', tone: 'accent' }
  ]

  if (keyboardMode === 'basic') {
    return [
      switchKey,
      { id: 'lp', label: '(', type: 'input', value: '(', tone: 'soft' },
      { id: 'rp', label: ')', type: 'input', value: ')', tone: 'soft' },
      { id: 'clear', label: 'C', type: 'action', action: 'clear', tone: 'soft' },
      ...commonTail.slice(0, -1),
      { id: 'back', label: '←', type: 'action', action: 'backspace', tone: 'soft' },
      { id: 'sp1', type: 'noop', tone: 'ghost' },
      { id: 'sp2', type: 'noop', tone: 'ghost' },
      { id: 'eq', label: '=', type: 'action', action: 'equal', tone: 'accent' }
    ]
  }

  return [
    switchKey,
    {
      id: 'inv',
      label: 'INV',
      type: 'action',
      action: 'toggleInv',
      tone: invOn ? 'mode' : 'fn'
    },
    {
      id: 'log',
      label: invOn ? '10ˣ' : 'log',
      type: 'input',
      value: invOn ? 'pow10(' : 'log(',
      tone: 'fn'
    },
    {
      id: 'ln',
      label: invOn ? 'eˣ' : 'ln',
      type: 'input',
      value: invOn ? 'exp(' : 'ln(',
      tone: 'fn'
    },
    {
      id: 'sin',
      label: invOn ? 'asin' : 'sin',
      type: 'input',
      value: invOn ? 'asin(' : 'sin(',
      tone: 'fn'
    },
    {
      id: 'cos',
      label: invOn ? 'acos' : 'cos',
      type: 'input',
      value: invOn ? 'acos(' : 'cos(',
      tone: 'fn'
    },
    {
      id: 'tan',
      label: invOn ? 'atan' : 'atan',
      type: 'input',
      value: invOn ? 'atan(' : 'tan(',
      tone: 'fn'
    },
    { id: 'pi', label: 'π', type: 'input', value: 'pi', tone: 'fn' },
    { id: 'lp', label: '(', type: 'input', value: '(', tone: 'soft' },
    { id: 'rp', label: ')', type: 'input', value: ')', tone: 'soft' },
    { id: 'clear', label: 'C', type: 'action', action: 'clear', tone: 'soft' },
    { id: 'back', label: '←', type: 'action', action: 'backspace', tone: 'soft' },
    ...commonTail
  ]
}

const lastInput = createLastInput('calc', ['keyboardMode', 'invOn', 'expression', 'displayValue'])

Page({
  data: {
    theme: getThemeId(),
    keyboardMode: 'basic',
    invOn: false,
    keys: buildKeys('basic', false),
    expression: '',
    displayValue: '0',
    errorText: '',
    historyOpen: false,
    historyKeyword: '',
    historyTotal: 0,
    historyMatch: 0,
    historyPage: 1,
    historyPageCount: 1,
    historyRows: []
  },

  onLoad() {
    enableShareMenu()
    const saved = lastInput.restore()
    const keyboardMode = saved.keyboardMode === 'scientific' ? 'scientific' : 'basic'
    const invOn = !!saved.invOn
    this.setData(Object.assign({
      keyboardMode,
      invOn,
      keys: buildKeys(keyboardMode, invOn),
      expression: saved.expression != null ? saved.expression : '',
      displayValue: saved.displayValue != null ? saved.displayValue : saved.expression || '0'
    }, presentHistory('', 1)))
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onHide() {
    lastInput.flush(this)
  },

  onUnload() {
    lastInput.flush(this)
  },

  persistCalc() {
    lastInput.save(this)
  },

  refreshKeys() {
    this.setData({
      keys: buildKeys(this.data.keyboardMode, this.data.invOn)
    })
  },

  onKeyTap(e) {
    const { type, value, action } = e.currentTarget.dataset
    if (type === 'noop') return
    if (type === 'input') {
      this.appendInput(value)
      return
    }
    if (action === 'toggleKeyboard') {
      const keyboardMode = this.data.keyboardMode === 'basic' ? 'scientific' : 'basic'
      this.setData({ keyboardMode }, () => {
        this.refreshKeys()
        this.persistCalc()
      })
      return
    }
    if (action === 'toggleInv') {
      this.setData({ invOn: !this.data.invOn }, () => {
        this.refreshKeys()
        this.persistCalc()
      })
      return
    }
    if (action === 'clear') {
      this.setData({ expression: '', displayValue: '0', errorText: '' }, () => this.persistCalc())
      return
    }
    if (action === 'backspace') {
      const expression = this.data.expression.slice(0, -1)
      this.setData(
        {
          expression,
          displayValue: expression || '0',
          errorText: ''
        },
        () => this.persistCalc()
      )
      return
    }
    if (action === 'equal') {
      this.calculate()
    }
  },

  appendInput(value) {
    const expression = `${this.data.expression}${value}`
    this.setData(
      {
        expression,
        displayValue: expression,
        errorText: ''
      },
      () => this.persistCalc()
    )
  },

  historyView(keyword, page) {
    return presentHistory(keyword == null ? this.data.historyKeyword : keyword, page || this.data.historyPage)
  },

  onToggleHistory() {
    const historyOpen = !this.data.historyOpen
    this.setData(Object.assign({ historyOpen }, this.historyView(this.data.historyKeyword, historyOpen ? 1 : this.data.historyPage)))
  },

  onHistoryInput(e) {
    const historyKeyword = (e.detail && e.detail.value) || ''
    this.setData(Object.assign({ historyKeyword }, this.historyView(historyKeyword, 1)))
  },

  onHistoryClear() {
    this.setData(Object.assign({ historyKeyword: '' }, this.historyView('', 1)))
  },

  onHistoryPrev() {
    if (this.data.historyPage <= 1) return
    this.setData(this.historyView(this.data.historyKeyword, this.data.historyPage - 1))
  },

  onHistoryNext() {
    if (this.data.historyPage >= this.data.historyPageCount) return
    this.setData(this.historyView(this.data.historyKeyword, this.data.historyPage + 1))
  },

  onContinueHistory(e) {
    const id = e.currentTarget.dataset.id
    const row = (this.data.historyRows || []).find((item) => item.id === id)
    if (!row) return
    this.setData({
      historyOpen: false,
      expression: row.result,
      displayValue: row.result,
      errorText: ''
    }, () => this.persistCalc())
  },

  onDeleteHistory(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.showModal({
      title: '删除记录',
      content: '删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return
        const removed = removeHistory(id)
        if (!removed.ok) {
          wx.showToast({ title: removed.message || '没有删除成功', icon: 'none' })
          return
        }
        this.setData(this.historyView(this.data.historyKeyword, this.data.historyPage))
      }
    })
  },

  calculate() {
    const source = this.data.expression
    const result = evaluateScientificExpression(source)
    if (!result.ok) {
      this.setData({
        errorText: result.error || '无法计算',
        displayValue: '错误'
      }, () => this.persistCalc())
      return
    }
    const saved = addHistory(source, result.value)
    const history = this.historyView(this.data.historyKeyword, this.data.historyPage)
    if (!saved.ok && saved.message) wx.showToast({ title: saved.message, icon: 'none' })
    this.setData(Object.assign({
      expression: result.value,
      displayValue: result.value,
      errorText: ''
    }, history), () => this.persistCalc())
  },

  onShareAppMessage() {
    return getCalcToolShare().appMessage
  },

  onShareTimeline() {
    return getCalcToolShare().timeline
  }
})
