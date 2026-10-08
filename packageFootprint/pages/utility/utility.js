const {
  PROVINCE_NAMES,
  DISCLAIMER,
  citiesOf,
  countiesOf,
  cityCount,
  readLastCity,
  writeLastCity,
  present,
  searchCities
} = require('../../utils/utilityRates')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getUtilityToolShare } = require('../../../utils/share')

function pickerOf(view) {
  return {
    pickerRange: [PROVINCE_NAMES, citiesOf(view.province), countiesOf(view.province, view.city)],
    pickerValue: [
      view.provinceIndex < 0 ? 0 : view.provinceIndex,
      view.cityIndex < 0 ? 0 : view.cityIndex,
      view.countyIndex < 0 ? 0 : view.countyIndex
    ]
  }
}

Page({
  data: {
    theme: getThemeId(),
    disclaimer: DISCLAIMER,
    cityTotal: cityCount(),
    keyword: '',
    matches: [],
    pickerRange: [PROVINCE_NAMES, ['北京'], ['东城']],
    pickerValue: [0, 0, 0],
    place: '北京',
    elec: null,
    gas: null
  },

  onLoad() {
    enableShareMenu()
    this.showCity(readLastCity())
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  showCity(pair) {
    const view = present(pair.province, pair.city, pair.county)
    writeLastCity(view.province, view.city, view.county)
    this.setData(Object.assign({
      keyword: '',
      matches: []
    }, pickerOf(view), {
      place: view.place,
      elec: view.elec,
      gas: view.gas
    }))
  },

  onColumn(e) {
    const column = e.detail.column
    const value = e.detail.value
    const current = this.data.pickerValue || [0, 0, 0]
    if (column === 0) {
      const province = PROVINCE_NAMES[value] || PROVINCE_NAMES[0]
      const cities = citiesOf(province)
      const city = cities[0] || ''
      this.setData({
        'pickerRange[1]': cities,
        'pickerRange[2]': countiesOf(province, city),
        pickerValue: [value, 0, 0]
      })
      return
    }
    if (column === 1) {
      const province = PROVINCE_NAMES[current[0]] || PROVINCE_NAMES[0]
      const city = citiesOf(province)[value] || citiesOf(province)[0]
      this.setData({
        'pickerRange[2]': countiesOf(province, city),
        pickerValue: [current[0], value, 0]
      })
    }
  },

  onPick(e) {
    const value = e.detail.value || [0, 0, 0]
    const province = PROVINCE_NAMES[value[0]] || PROVINCE_NAMES[0]
    const cities = citiesOf(province)
    const city = cities[value[1]] || cities[0]
    const counties = countiesOf(province, city)
    const county = counties[value[2]] || counties[0]
    this.showCity({ province, city, county })
  },

  onSearch(e) {
    const keyword = (e.detail && e.detail.value) || ''
    this.setData({
      keyword,
      matches: searchCities(keyword)
    })
  },

  onClearSearch() {
    this.setData({ keyword: '', matches: [] })
  },

  onPickMatch(e) {
    const province = e.currentTarget.dataset.province
    const city = e.currentTarget.dataset.city
    const county = e.currentTarget.dataset.county
    if (!province || !city || !county) return
    this.showCity({ province, city, county })
  },

  onShareAppMessage() {
    return getUtilityToolShare().appMessage
  },

  onShareTimeline() {
    return getUtilityToolShare().timeline
  }
})
