const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getGuideToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')
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

const lastInput = createLastInput('guide', ['cityId', 'browseId'])

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
    cityAnchor: '',
    cityName: '',
    region: '',
    foods: [],
    sights: []
  },

  onLoad() {
    enableShareMenu()
    this._click = createClickSfx()
    const saved = lastInput.restore()
    const place = findPlace(saved.cityId || DEFAULT_CITY_ID)
    const browseId = place.provinceId || saved.browseId || '50'
    this.showPlace(place.id)
    this.refreshList('', browseId, place.id)
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
    lastInput.flush(this, { cityId: place.id, browseId: place.provinceId })
  },

  focusCity(cities, cityId) {
    const anchor = cities.some((item) => item.id === cityId) ? `place-${cityId}` : ''
    this.setData({ cityAnchor: '' }, () => {
      if (anchor) this.setData({ cityAnchor: anchor })
    })
  },

  refreshList(keyword, browseId, focusId) {
    const rows = keyword ? filterPlaces(keyword) : placesOf(browseId)
    const cities = cityCards(rows)
    const activeId = focusId || this.data.cityId
    this.setData({
      keyword,
      browseId,
      cities
    })
    this.focusCity(cities, activeId)
  },

  onSearch(e) {
    const keyword = (e.detail && e.detail.value) || ''
    this.refreshList(keyword, this.data.browseId)
  },

  onPickProvince(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.data.browseId && !this.data.keyword) return
    if (this._click) this._click.play()
    const placeId = defaultPlaceId(id)
    this.refreshList('', id, placeId)
    this.showPlace(placeId)
  },

  onPickCity(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    if (this._click) this._click.play()
    if (id === this.data.cityId) return
    this.showPlace(id)
    this.focusCity(this.data.cities, id)
  },

  onShareAppMessage() {
    return getGuideToolShare().appMessage
  },

  onShareTimeline() {
    return getGuideToolShare().timeline
  }
})
