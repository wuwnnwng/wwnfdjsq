const { evaluateExpression } = require('../../../utils/converters')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')

const KEYS = [
  { label: 'C', type: 'action', action: 'clear' },
  { label: '←', type: 'action', action: 'backspace' },
  { label: '%', type: 'input', value: '%' },
  { label: '÷', type: 'input', value: '/' },
  { label: '7', type: 'input', value: '7' },
  { label: '8', type: 'input', value: '8' },
  { label: '9', type: 'input', value: '9' },
  { label: '×', type: 'input', value: '*' },
  { label: '4', type: 'input', value: '4' },
  { label: '5', type: 'input', value: '5' },
  { label: '6', type: 'input', value: '6' },
  { label: '-', type: 'input', value: '-' },
  { label: '1', type: 'input', value: '1' },
  { label: '2', type: 'input', value: '2' },
  { label: '3', type: 'input', value: '3' },
  { label: '+', type: 'input', value: '+' },
  { label: '0', type: 'input', value: '0', wide: true },
  { label: '.', type: 'input', value: '.' },
  { label: '=', type: 'action', action: 'equal' }
]

Page({
  data: {
    theme: getThemeId(),
    keys: KEYS,
    expression: '',
    displayValue: '0',
    errorText: ''
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onKeyTap(e) {
    const { type, value, action } = e.currentTarget.dataset
    if (type === 'input') {
      this.appendInput(value)
      return
    }
    if (action === 'clear') {
      this.setData({ expression: '', displayValue: '0', errorText: '' })
      return
    }
    if (action === 'backspace') {
      const expression = this.data.expression.slice(0, -1)
      this.setData({
        expression,
        displayValue: expression || '0',
        errorText: ''
      })
      return
    }
    if (action === 'equal') {
      this.calculate()
    }
  },

  appendInput(value) {
    const expression = `${this.data.expression}${value}`
    this.setData({
      expression,
      displayValue: expression,
      errorText: ''
    })
  },

  calculate() {
    const result = evaluateExpression(this.data.expression)
    if (!result.ok) {
      this.setData({
        errorText: result.error || '无法计算',
        displayValue: '错误'
      })
      return
    }
    this.setData({
      expression: result.value,
      displayValue: result.value,
      errorText: ''
    })
  }
})
