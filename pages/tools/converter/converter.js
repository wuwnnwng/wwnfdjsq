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
const { findUnitIndex } = require('../../../utils/currencyNames')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')

Page({
  data: {
    theme: getThemeId(),
    type: '',
    title: '',
    note: '',
    publishedAt: '',
    unitCount: 0,
    rateLoading: false,
    rateError: '',
    currencySearch: '',
    digits: 6,
    units: [],
    pickerUnits: [],
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

  getDefaultCurrencyIndices(units) {
    const fromIndex = findUnitIndex(units, 'cny')
    const toIndex = findUnitIndex(units, 'usd')
    return {
      fromIndex: fromIndex >= 0 ? fromIndex : 0,
      toIndex: toIndex >= 0 ? toIndex : Math.min(1, units.length - 1)
    }
  },

  resolveCurrencyIndices(units, prevUnits, prevFromIndex, prevToIndex) {
    if (!prevUnits || !prevUnits.length) {
      return this.getDefaultCurrencyIndices(units)
    }
    const fromKey = prevUnits[prevFromIndex] && prevUnits[prevFromIndex].key
    const toKey = prevUnits[prevToIndex] && prevUnits[prevToIndex].key
    let fromIndex = findUnitIndex(units, fromKey)
    let toIndex = findUnitIndex(units, toKey)
    if (fromIndex < 0 || toIndex < 0) {
      return this.getDefaultCurrencyIndices(units)
    }
    return { fromIndex, toIndex }
  },

  filterCurrencyUnits(units, keyword) {
    const text = String(keyword || '')
      .trim()
      .toLowerCase()
    if (!text) return units
    return units.filter((item) => {
      return (
        item.key.indexOf(text) >= 0 ||
        String(item.code || '')
          .toLowerCase()
          .indexOf(text) >= 0 ||
        String(item.label || '')
          .toLowerCase()
          .indexOf(text) >= 0
      )
    })
  },

  applyPickerUnits(units, keyword) {
    const pickerUnits =
      this.data.type === 'currency' ? this.filterCurrencyUnits(units, keyword) : units
    return {
      pickerUnits,
      unitLabels: pickerUnits.map((item) => item.label)
    }
  },

  applyConverterConfig(config, callback) {
    if (!config) return
    wx.setNavigationBarTitle({ title: config.title })

    const units = config.units || []
    if (config.type === 'currency') {
      setCurrencyUnits(units.length ? units : null)
    }

    const pickerPatch = this.applyPickerUnits(units, this.data.currencySearch)
    let fromIndex = config.fromIndex
    let toIndex = config.toIndex
    if (fromIndex == null || toIndex == null) {
      const defaults = this.getDefaultCurrencyIndices(pickerPatch.pickerUnits)
      fromIndex = defaults.fromIndex
      toIndex = defaults.toIndex
    }

    this.setData(
      {
        type: config.type || this.data.type,
        title: config.title,
        note: config.note || '',
        publishedAt: config.publishedAt || '',
        unitCount: config.unitCount || units.length,
        digits: config.digits || 6,
        units,
        pickerUnits: pickerPatch.pickerUnits,
        unitLabels: pickerPatch.unitLabels,
        fromIndex,
        toIndex,
        showAll: config.resetShowAll ? false : this.data.showAll
      },
      () => {
        if (callback) callback()
        else this.recalculate()
      }
    )
  },

  initConverter(type) {
    if (type === 'currency') {
      const cached = getExchangeRateDisplay()
      setCurrencyUnits(cached.units)
      this.applyConverterConfig(
        {
          type,
          title: '汇率换算',
          note: '',
          publishedAt: '',
          unitCount: cached.unitCount,
          digits: 4,
          units: cached.units,
          resetShowAll: true,
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
        ...config,
        resetShowAll: true
      },
      () => {
        this.setData({ inputValue: '1', currencySearch: '' }, () => this.recalculate())
      }
    )
  },

  async refreshExchangeRates(force) {
    if (this._rateLoading) return
    this._rateLoading = true
    this.setData({ rateLoading: true })
    try {
      const prevUnits = this.data.units
      const prevFromIndex = this.data.fromIndex
      const prevToIndex = this.data.toIndex
      const data = await loadExchangeRates({ force: !!force })
      setCurrencyUnits(data.units)
      const indices = this.resolveCurrencyIndices(
        data.units,
        prevUnits,
        prevFromIndex,
        prevToIndex
      )
      const pickerPatch = this.applyPickerUnits(data.units, this.data.currencySearch)
      const fromIndex = findUnitIndex(pickerPatch.pickerUnits, data.units[indices.fromIndex].key)
      const toIndex = findUnitIndex(pickerPatch.pickerUnits, data.units[indices.toIndex].key)

      this.setData({
        note: data.note,
        publishedAt: data.publishedAt,
        unitCount: data.unitCount,
        rateError: data.source === 'fallback' ? data.error || '' : data.error || '',
        units: data.units,
        pickerUnits: pickerPatch.pickerUnits,
        unitLabels: pickerPatch.unitLabels,
        fromIndex: fromIndex >= 0 ? fromIndex : 0,
        toIndex: toIndex >= 0 ? toIndex : Math.min(1, pickerPatch.pickerUnits.length - 1),
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

  onCurrencySearch(e) {
    const currencySearch = e.detail.value
    const pickerPatch = this.applyPickerUnits(this.data.units, currencySearch)
    const fromKey = this.data.pickerUnits[this.data.fromIndex]?.key
    const toKey = this.data.pickerUnits[this.data.toIndex]?.key
    let fromIndex = findUnitIndex(pickerPatch.pickerUnits, fromKey)
    let toIndex = findUnitIndex(pickerPatch.pickerUnits, toKey)
    if (fromIndex < 0) fromIndex = 0
    if (toIndex < 0) toIndex = pickerPatch.pickerUnits.length > 1 ? 1 : 0

    this.setData(
      {
        currencySearch,
        pickerUnits: pickerPatch.pickerUnits,
        unitLabels: pickerPatch.unitLabels,
        fromIndex,
        toIndex
      },
      () => this.recalculate()
    )
  },

  recalculate() {
    const { type, pickerUnits, fromIndex, toIndex, inputValue, digits, showAll, units } =
      this.data
    const value = parseInput(inputValue)
    const fromUnit = pickerUnits[fromIndex]
    const toUnit = pickerUnits[toIndex]

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

    if (showAll && type === 'currency') {
      patch.allResults = units.map((item) => ({
        key: item.key,
        label: item.label,
        value: formatNumber(convertValue(type, value, fromUnit.key, item.key), digits)
      }))
    } else if (showAll) {
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
