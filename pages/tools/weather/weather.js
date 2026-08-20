const {
  HOT_CITIES,
  DEFAULT_PLACE,
  getLastPlace,
  getSavedPlaces,
  rememberPlace,
  forgetPlace,
  loadWeather,
  searchCities,
  placeFromLocation,
  buildPlace
} = require('../../../utils/weatherApi')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getWeatherToolShare } = require('../../../utils/share')
const {
  calcPickerSheetLayout,
  listenKeyboardHeight,
  unlistenKeyboardHeight
} = require('../../../utils/pickerKeyboard')

Page({
  data: {
    theme: getThemeId(),
    loading: false,
    error: '',
    place: buildPlace(DEFAULT_PLACE),
    icon: '🌤️',
    text: '--',
    temperature: '--',
    apparent: '--',
    humidity: '--',
    wind: '--',
    precipitation: 0,
    todayMin: '--',
    todayMax: '--',
    sunrise: '--',
    sunset: '--',
    updatedAt: '',
    hourly: [],
    daily: [],
    showCityPicker: false,
    cityKeyword: '',
    citySearching: false,
    cityResults: [],
    pickerKeyboardOffset: 0,
    pickerKeyboardOpen: false,
    pickerSheetMaxHeight: 0,
    pickerListHeight: 0,
    savedCities: [],
    hotCities: []
  },

  onLoad() {
    enableShareMenu()
    this.syncSavedCities()
    const saved = getLastPlace()
    if (saved) {
      this.refreshWeather(saved)
      return
    }
    this.refreshWeather(DEFAULT_PLACE)
    this.locate(true)
  },

  syncSavedCities(list) {
    const savedCities = list || getSavedPlaces()
    const savedIds = {}
    savedCities.forEach((item) => {
      savedIds[item.id] = true
    })
    this.setData({
      savedCities,
      hotCities: HOT_CITIES.map(buildPlace).filter((item) => item && !savedIds[item.id])
    })
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  preventMove() {},

  applyWeather(result) {
    this.setData({
      loading: false,
      error: result.error || '',
      place: result.place,
      icon: result.icon,
      text: result.text,
      temperature: result.temperature,
      apparent: result.apparent,
      humidity: result.humidity,
      wind: result.wind,
      precipitation: result.precipitation,
      todayMin: result.todayMin,
      todayMax: result.todayMax,
      sunrise: result.sunrise,
      sunset: result.sunset,
      updatedAt: result.updatedAt,
      hourly: result.hourly || [],
      daily: result.daily || []
    })
  },

  async refreshWeather(place, options) {
    const nextPlace = buildPlace(place) || this.data.place || DEFAULT_PLACE
    this.setData({
      loading: true,
      error: '',
      place: nextPlace
    })
    const result = await loadWeather(nextPlace, options)
    this.applyWeather(result)
  },

  onRefresh() {
    this.refreshWeather(this.data.place, { force: true })
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
      if (!this.data.showCityPicker) return
      this.applyPickerKeyboardLayout(res && res.height)
    }
    listenKeyboardHeight(this._onPickerKeyboardHeight)
  },

  unlistenPickerKeyboard() {
    unlistenKeyboardHeight(this._onPickerKeyboardHeight)
    this._onPickerKeyboardHeight = null
  },

  onPickerKeyboardHeight(e) {
    if (!this.data.showCityPicker) return
    this.applyPickerKeyboardLayout(e.detail && e.detail.height)
  },

  resetCityPicker() {
    this.unlistenPickerKeyboard()
    this.setData({
      showCityPicker: false,
      cityKeyword: '',
      citySearching: false,
      cityResults: [],
      pickerKeyboardOffset: 0,
      pickerKeyboardOpen: false,
      pickerSheetMaxHeight: 0,
      pickerListHeight: 0
    })
  },

  onOpenCityPicker() {
    const layout = calcPickerSheetLayout(0)
    this.listenPickerKeyboard()
    this.syncSavedCities()
    this.setData({
      showCityPicker: true,
      cityKeyword: '',
      citySearching: false,
      cityResults: [],
      pickerKeyboardOffset: layout.offset,
      pickerKeyboardOpen: layout.keyboardOpen,
      pickerSheetMaxHeight: layout.sheetMaxHeight,
      pickerListHeight: layout.listHeight
    })
  },

  onCloseCityPicker() {
    this.resetCityPicker()
  },

  onUnload() {
    this.unlistenPickerKeyboard()
  },

  onCitySearchInput(e) {
    const keyword = e.detail.value
    this.setData({ cityKeyword: keyword })
    if (this._searchTimer) clearTimeout(this._searchTimer)
    const q = String(keyword || '').trim()
    if (!q) {
      this.setData({ citySearching: false, cityResults: [] })
      return
    }
    this.setData({ citySearching: true })
    this._searchTimer = setTimeout(() => {
      this.runCitySearch(q)
    }, 360)
  },

  async runCitySearch(keyword) {
    const results = await searchCities(keyword)
    if (String(this.data.cityKeyword || '').trim() !== keyword) return
    this.setData({
      citySearching: false,
      cityResults: results
    })
  },

  onSelectCity(e) {
    const index = Number(e.currentTarget.dataset.index)
    const source = e.currentTarget.dataset.source
    const list =
      source === 'search'
        ? this.data.cityResults
        : source === 'saved'
          ? this.data.savedCities
          : this.data.hotCities
    const place = list[index]
    if (!place) return
    this.syncSavedCities(rememberPlace(place))
    this.resetCityPicker()
    this.refreshWeather(place)
  },

  onRemoveSavedCity(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    this.syncSavedCities(forgetPlace(id))
  },

  onLocate() {
    this.locate(false)
  },

  locate(silent) {
    const fail = (err) => {
      if (silent) return
      const denied = err && (err.errMsg || '').indexOf('auth deny') >= 0
      if (denied) {
        wx.showModal({
          title: '需要位置权限',
          content: '开启位置权限后，可查看你所在城市的天气',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) wx.openSetting()
          }
        })
        return
      }
      wx.showToast({ title: '定位失败，可手动选择城市', icon: 'none' })
    }

    const success = (res) => {
      const place = placeFromLocation(res.latitude, res.longitude)
      if (!silent) {
        this.syncSavedCities(rememberPlace(place))
      }
      this.refreshWeather(place)
    }

    const run = () => {
      wx.getLocation({
        type: 'gcj02',
        success,
        fail
      })
    }

    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation'] === false) {
          fail({ errMsg: 'auth deny' })
          return
        }
        run()
      },
      fail: run
    })
  },

  onShareAppMessage() {
    return getWeatherToolShare().appMessage
  },

  onShareTimeline() {
    return getWeatherToolShare().timeline
  }
})
