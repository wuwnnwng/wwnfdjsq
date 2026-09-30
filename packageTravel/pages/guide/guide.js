const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getGuideToolShare } = require('../../../utils/share')
const {
  provinces,
  placesOf,
  filterPlaces,
  findPlace,
  listsOf,
  regionOf,
  DEFAULT_CITY_ID,
  defaultPlaceId
} = require('../../utils/guideData')
const { createClickSfx } = require('../../utils/clickSfx')

function ranked(list, kind) {
  const marks = kind === 'food'
    ? ['🍜', '🥟', '🍲', '🥘', '🍖', '🌶️', '🥣', '🍢']
    : ['🏞️', '⛰️', '🏯', '🌉', '🌊', '🌸', '🛕', '🌅']
  return list.map((name, index) => ({
    no: index < 9 ? `0${index + 1}` : String(index + 1),
    name,
    tone: index % 6,
    mark: marks[index % marks.length]
  }))
}

function cityCards(list) {
  return list.map((item) => {
    const region = regionOf(item)
    return {
      id: item.id,
      name: item.name,
      region,
      showRegion: region !== item.name
    }
  })
}

Page({
  data: {
    theme: getThemeId(),
    keyword: '',
    browseId: '50',
    provinces: provinces(),
    cities: [],
    cityId: DEFAULT_CITY_ID,
    cityName: '',
    region: '',
    foods: [],
    sights: []
  },

  onLoad() {
    enableShareMenu()
    this._click = createClickSfx()
    this.showPlace(DEFAULT_CITY_ID)
    this.refreshList('', '50')
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onUnload() {
    if (this._click) this._click.destroy()
  },

  showPlace(id) {
    const place = findPlace(id)
    const lists = listsOf(place)
    this.setData({
      cityId: place.id,
      cityName: place.name,
      region: regionOf(place),
      foods: ranked(lists.foods, 'food'),
      sights: ranked(lists.sights, 'sight')
    })
  },

  refreshList(keyword, browseId) {
    const rows = keyword ? filterPlaces(keyword) : placesOf(browseId)
    this.setData({
      keyword,
      browseId,
      cities: cityCards(rows)
    })
  },

  onSearch(e) {
    const keyword = (e.detail && e.detail.value) || ''
    this.refreshList(keyword, this.data.browseId)
  },

  onPickProvince(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.data.browseId && !this.data.keyword) return
    if (this._click) this._click.play()
    this.refreshList('', id)
    this.showPlace(defaultPlaceId(id))
  },

  onPickCity(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    if (this._click) this._click.play()
    if (id === this.data.cityId) return
    this.showPlace(id)
  },

  onShareAppMessage() {
    return getGuideToolShare().appMessage
  },

  onShareTimeline() {
    return getGuideToolShare().timeline
  }
})
