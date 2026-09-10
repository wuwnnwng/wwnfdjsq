const {
  PROVINCE_NAMES,
  DEFAULT_PROVINCE_ID,
  getProvince,
  getProvinceByIndex,
  readLastProvinceId,
  writeLastProvinceId,
  loadOilPrices
} = require('../../../utils/oilPrice')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getOilPriceToolShare } = require('../../../utils/share')

function emptyView() {
  const province = getProvince(readLastProvinceId() || DEFAULT_PROVINCE_ID)
  return {
    provinceId: province.id,
    provinceName: province.name,
    provinceIndex: province.index,
    gradeKey: 'p92',
    gradeLabel: '92号汽油',
    heroPriceText: '--',
    heroChangeText: '',
    heroChangeDir: 'flat',
    cards: [],
    list: [],
    date: '',
    note: '',
    error: ''
  }
}

Page({
  data: Object.assign(
    {
      theme: getThemeId(),
      loading: false,
      provinceNames: PROVINCE_NAMES
    },
    emptyView()
  ),

  onLoad() {
    enableShareMenu()
    this.setData(emptyView())
    this.refresh()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  applyView(view) {
    this.setData({
      loading: false,
      provinceId: view.provinceId,
      provinceName: view.provinceName,
      provinceIndex: view.provinceIndex,
      gradeKey: view.gradeKey,
      gradeLabel: view.gradeLabel,
      heroPriceText: view.heroPriceText,
      heroChangeText: view.heroChangeText,
      heroChangeDir: view.heroChangeDir,
      cards: view.cards || [],
      list: view.list || [],
      date: view.date || '',
      note: view.note || '',
      error: view.error || ''
    })
  },

  async refresh(options) {
    const silent = !!(this.data.cards && this.data.cards.length) && !(options && options.force)
    if (!silent) this.setData({ loading: true, error: '' })
    const view = await loadOilPrices({
      force: !!(options && options.force),
      provinceId: (options && options.provinceId) || readLastProvinceId(),
      gradeKey: (options && options.gradeKey) || this.data.gradeKey
    })
    if (view.provinceId) writeLastProvinceId(view.provinceId)
    this.applyView(view)
  },

  onRefresh() {
    this.refresh({ force: true })
  },

  onProvinceChange(e) {
    const province = getProvinceByIndex(e.detail.value)
    if (!province || province.id === this.data.provinceId) return
    writeLastProvinceId(province.id)
    this.refresh({ provinceId: province.id })
  },

  onSelectProvince(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.data.provinceId) return
    writeLastProvinceId(id)
    this.refresh({ provinceId: id })
  },

  onSelectGrade(e) {
    const key = e.currentTarget.dataset.key
    if (!key || key === this.data.gradeKey) return
    this.refresh({ gradeKey: key })
  },

  onGoFuel() {
    const card = (this.data.cards || []).find((item) => item.key === this.data.gradeKey)
    const price = card && card.price != null ? String(card.price) : ''
    const pages = getCurrentPages()
    const prev = pages.length >= 2 ? pages[pages.length - 2] : null
    if (prev && prev.route === 'pages/tools/fuel/fuel' && prev.applyOilPrice) {
      prev.applyOilPrice(price)
      wx.navigateBack()
      return
    }
    const query = price ? `?kind=fuel&price=${encodeURIComponent(price)}` : '?kind=fuel'
    wx.navigateTo({
      url: `/pages/tools/fuel/fuel${query}`
    })
  },

  onShareAppMessage() {
    return getOilPriceToolShare().appMessage
  },

  onShareTimeline() {
    return getOilPriceToolShare().timeline
  }
})
