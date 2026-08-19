const {
  getConverterType,
  convertValue,
  convertAll,
  formatNumber,
  parseInput
} = require('../../../utils/converters')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')

Page({
  data: {
    theme: getThemeId(),
    type: '',
    title: '',
    note: '',
    digits: 6,
    units: [],
    unitLabels: [],
    fromIndex: 0,
    toIndex: 1,
    inputValue: '1',
    resultValue: '',
    resultLabel: '',
    showAll: false,
    allResults: []
  },

  onLoad(options) {
    const type = options.type || 'length'
    this.initConverter(type)
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  initConverter(type) {
    const config = getConverterType(type)
    if (!config) {
      wx.showToast({ title: '工具不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
      return
    }

    wx.setNavigationBarTitle({ title: config.title })

    this.setData(
      {
        type,
        title: config.title,
        note: config.note || '',
        digits: config.digits || 6,
        units: config.units,
        unitLabels: config.units.map((item) => item.label),
        fromIndex: 0,
        toIndex: Math.min(1, config.units.length - 1),
        inputValue: '1',
        showAll: false
      },
      () => this.recalculate()
    )
  },

  recalculate() {
    const {
      type,
      units,
      fromIndex,
      toIndex,
      inputValue,
      digits,
      showAll
    } = this.data
    const value = parseInput(inputValue)
    const fromUnit = units[fromIndex]
    const toUnit = units[toIndex]

    if (value === null) {
      this.setData({
        resultValue: '',
        resultLabel: toUnit ? toUnit.label : '',
        allResults: []
      })
      return
    }

    if (!Number.isFinite(value)) {
      this.setData({
        resultValue: '无效',
        resultLabel: toUnit ? toUnit.label : '',
        allResults: []
      })
      return
    }

    const converted = convertValue(type, value, fromUnit.key, toUnit.key)
    const patch = {
      resultValue: formatNumber(converted, digits),
      resultLabel: toUnit.label
    }

    if (showAll) {
      patch.allResults = convertAll(type, value, fromUnit.key).map((item) => ({
        key: item.key,
        label: item.label,
        value: formatNumber(item.value, digits)
      }))
    }

    this.setData(patch)
  },

  onInputChange(e) {
    this.setData({ inputValue: e.detail.value }, () => this.recalculate())
  },

  onFromUnitChange(e) {
    this.setData({ fromIndex: Number(e.detail.value) }, () => this.recalculate())
  },

  onToUnitChange(e) {
    this.setData({ toIndex: Number(e.detail.value) }, () => this.recalculate())
  },

  onSwapUnits() {
    const { fromIndex, toIndex } = this.data
    this.setData({ fromIndex: toIndex, toIndex: fromIndex }, () => this.recalculate())
  },

  onToggleAll() {
    this.setData({ showAll: !this.data.showAll }, () => this.recalculate())
  }
})
