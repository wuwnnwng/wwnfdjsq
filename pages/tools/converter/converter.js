const {
  getConverterType,
  convertValue,
  convertAll,
  formatNumber,
  parseInput,
  setCurrencyUnits
} = require('../../../utils/converters')
const {
  loadExchangeRates,
  getExchangeRateDisplay
} = require('../../../utils/exchangeRate')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')

Page({
  data: {
    theme: getThemeId(),
    type: '',
    title: '',
    note: '',
    publishedAt: '',
    rateLoading: false,
    rateError: '',
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
    if (this.data.type === 'currency' && this._currencyShownOnce) {
      this.refreshExchangeRates(false)
    }
    this._currencyShownOnce = true
  },

  applyConverterConfig(config, callback) {
    if (!config) return
    wx.setNavigationBarTitle({ title: config.title })
    if (config.units && config.units.length) {
      setCurrencyUnits(config.type === 'currency' ? config.units : null)
    }
    this.setData(
      {
        type: config.type || this.data.type,
        title: config.title,
        note: config.note || '',
        publishedAt: config.publishedAt || '',
        digits: config.digits || 6,
        units: config.units,
        unitLabels: config.units.map((item) => item.label),
        fromIndex: 0,
        toIndex: Math.min(1, config.units.length - 1),
        showAll: this.data.showAll
      },
      () => {
        if (callback) callback()
        else this.recalculate()
      }
    )
  },

  initConverter(type) {
    if (type === 'currency') {
      setCurrencyUnits(getExchangeRateDisplay().units)
      this.applyConverterConfig(
        {
          type,
          title: '汇率换算',
          note: '',
          publishedAt: '',
          digits: 4,
          units: getExchangeRateDisplay().units,
          rateError: ''
        },
        () => {
          this.recalculate()
          this.refreshExchangeRates(false)
        }
      )
      return
    }

    const config = getConverterType(type)
    if (!config) {
      wx.showToast({ title: '工具不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
      return
    }

    this.applyConverterConfig(
      {
        type,
        ...config
      },
      () => {
        this.setData({ inputValue: '1', showAll: false }, () => this.recalculate())
      }
    )
  },

  async refreshExchangeRates(force) {
    if (this._rateLoading) return
    this._rateLoading = true
    this.setData({ rateLoading: true })
    try {
      const data = await loadExchangeRates({ force: !!force })
      setCurrencyUnits(data.units)
      this.setData({
        note: data.note,
        publishedAt: data.publishedAt,
        rateError: data.source === 'fallback' ? data.error || data.note : data.error || '',
        units: data.units,
        unitLabels: data.units.map((item) => item.label),
        rateLoading: false
      })
      this.recalculate()
    } catch (e) {
      this.setData({
        rateLoading: false,
        rateError: '汇率更新失败，请稍后重试'
      })
    } finally {
      this._rateLoading = false
    }
  },

  onRefreshRates() {
    if (this.data.type !== 'currency') return
    this.refreshExchangeRates(true)
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

    if (!fromUnit || !toUnit) {
      this.setData({
        resultValue: '',
        resultLabel: '',
        allResults: []
      })
      return
    }

    if (value === null) {
      this.setData({
        resultValue: '',
        resultLabel: toUnit.label,
        allResults: []
      })
      return
    }

    if (!Number.isFinite(value)) {
      this.setData({
        resultValue: '无效',
        resultLabel: toUnit.label,
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
