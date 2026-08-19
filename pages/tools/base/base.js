const { convertBase, sanitizeBaseInput } = require('../../../utils/converters')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getBaseToolShare } = require('../../../utils/share')

const BASE_OPTIONS = [
  { key: 2, label: '二进制' },
  { key: 8, label: '八进制' },
  { key: 10, label: '十进制' },
  { key: 16, label: '十六进制' }
]

Page({
  data: {
    theme: getThemeId(),
    baseOptions: BASE_OPTIONS,
    baseLabels: BASE_OPTIONS.map((item) => item.label),
    baseIndex: 2,
    inputValue: '255',
    binary: '',
    octal: '',
    decimalText: '',
    hex: '',
    errorText: ''
  },

  onLoad() {
    enableShareMenu()
    this.recalculate()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  recalculate() {
    const base = BASE_OPTIONS[this.data.baseIndex].key
    const result = convertBase(this.data.inputValue, base)

    if (result.empty) {
      this.setData({
        binary: '',
        octal: '',
        decimalText: '',
        hex: '',
        errorText: ''
      })
      return
    }

    if (!result.valid) {
      this.setData({
        binary: '无效',
        octal: '无效',
        decimalText: '无效',
        hex: '无效',
        errorText: '请输入合法整数'
      })
      return
    }

    this.setData({
      binary: result.binary,
      octal: result.octal,
      decimalText: result.decimalText,
      hex: result.hex,
      errorText: ''
    })
  },

  onInputChange(e) {
    const base = BASE_OPTIONS[this.data.baseIndex].key
    const inputValue = sanitizeBaseInput(e.detail.value, base)
    this.setData({ inputValue }, () => this.recalculate())
  },

  onBaseChange(e) {
    this.setData({ baseIndex: Number(e.detail.value) }, () => this.recalculate())
  },

  onShareAppMessage() {
    return getBaseToolShare().appMessage
  },

  onShareTimeline() {
    return getBaseToolShare().timeline
  }
})
