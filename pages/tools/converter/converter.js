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
const { enableShareMenu, getConverterToolShare } = require('../../../utils/share')
const {
  calcPickerSheetLayout,
  listenKeyboardHeight,
  unlistenKeyboardHeight
} = require('../../../utils/pickerKeyboard')

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
    digits: 6,
    units: [],
    unitLabels: [],
    fromIndex: 0,
    toIndex: 1,
    inputValue: '1',
    resultValue: '',
    resultLabel: '',
    showAll: false,
    allResults: [],
    showCurrencyPicker: false,
    currencyPickerTarget: 'from',
    currencyPickerSearch: '',
    currencyPickerUnits: [],
    currencyPickerActiveKey: '',
    pickerKeyboardOffset: 0,
    pickerKeyboardOpen: false,
    pickerSheetMaxHeight: 0,
    pickerListHeight: 0
  },

  onLoad(options) {
    enableShareMenu()
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

  preventMove() {},

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

  applyConverterConfig(config, callback) {
    if (!config) return
    wx.setNavigationBarTitle({ title: config.title })

    const units = config.units || []
    if (config.type === 'currency') {
      setCurrencyUnits(units.length ? units : null)
    }

    let fromIndex = config.fromIndex
    let toIndex = config.toIndex
    if (fromIndex == null || toIndex == null) {
      const defaults = this.getDefaultCurrencyIndices(units)
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
        unitLabels: units.map((item) => item.label),
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
          publishedAt: cached.publishedAt || '',
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
        this.setData({ inputValue: '1' }, () => this.recalculate())
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

      this.setData({
        note: '',
        publishedAt: data.publishedAt,
        unitCount: data.unitCount,
        rateError: data.source === 'fallback' ? data.error || '' : data.error || '',
        units: data.units,
        unitLabels: data.units.map((item) => item.label),
        fromIndex: indices.fromIndex,
        toIndex: indices.toIndex,
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

  applyPickerKeyboardLayout(height) {
    const layout = calcPickerSheetLayout(height)
    this.setData({
      pickerKeyboardOffset: layout.offset,
      pickerKeyboardOpen: layout.keyboardOpen,
      pickerSheetMaxHeight: layout.sheetMaxHeight,
      pickerListHeight: layout.listHeight
    })
  },

  listenPickerKeyboard() {
    if (this._onPickerKeyboardHeight) return
    this._onPickerKeyboardHeight = (res) => {
      if (!this.data.showCurrencyPicker) return
      this.applyPickerKeyboardLayout(res && res.height)
    }
    listenKeyboardHeight(this._onPickerKeyboardHeight)
  },

  unlistenPickerKeyboard() {
    unlistenKeyboardHeight(this._onPickerKeyboardHeight)
    this._onPickerKeyboardHeight = null
  },

  onPickerKeyboardHeight(e) {
    if (!this.data.showCurrencyPicker) return
    this.applyPickerKeyboardLayout(e.detail && e.detail.height)
  },

  resetCurrencyPicker() {
    this.unlistenPickerKeyboard()
    this.setData({
      showCurrencyPicker: false,
      currencyPickerSearch: '',
      currencyPickerUnits: [],
      pickerKeyboardOffset: 0,
      pickerKeyboardOpen: false,
      pickerSheetMaxHeight: 0,
      pickerListHeight: 0
    })
  },

  onOpenCurrencyPicker(e) {
    const target = e.currentTarget.dataset.target
    if (!target || this.data.type !== 'currency') return
    const activeKey =
      target === 'from'
        ? this.data.units[this.data.fromIndex]?.key
        : this.data.units[this.data.toIndex]?.key
    const layout = calcPickerSheetLayout(0)
    this.listenPickerKeyboard()
    this.setData({
      showCurrencyPicker: true,
      currencyPickerTarget: target,
      currencyPickerSearch: '',
      currencyPickerUnits: this.data.units,
      currencyPickerActiveKey: activeKey || '',
      pickerKeyboardOffset: layout.offset,
      pickerKeyboardOpen: layout.keyboardOpen,
      pickerSheetMaxHeight: layout.sheetMaxHeight,
      pickerListHeight: layout.listHeight
    })
  },

  onCloseCurrencyPicker() {
    this.resetCurrencyPicker()
  },

  onUnload() {
    this.unlistenPickerKeyboard()
  },

  onCurrencyPickerSearch(e) {
    const currencyPickerSearch = e.detail.value
    this.setData({
      currencyPickerSearch,
      currencyPickerUnits: this.filterCurrencyUnits(this.data.units, currencyPickerSearch)
    })
  },

  onPickCurrency(e) {
    const key = e.currentTarget.dataset.key
    const index = findUnitIndex(this.data.units, key)
    if (index < 0) return
    this.resetCurrencyPicker()
    const patch = {}
    if (this.data.currencyPickerTarget === 'from') {
      patch.fromIndex = index
    } else {
      patch.toIndex = index
    }
    this.setData(patch, () => this.recalculate())
  },

  recalculate() {
    const { type, units, fromIndex, toIndex, inputValue, digits, showAll } = this.data
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
  },

  onShareAppMessage() {
    return getConverterToolShare(this.data.type).appMessage
  },

  onShareTimeline() {
    return getConverterToolShare(this.data.type).timeline
  }
})
