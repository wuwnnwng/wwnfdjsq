const {
  VEHICLES,
  PROVINCE_NAMES,
  DEFAULT_PROVINCE_ID,
  getVehicle,
  getProvince,
  getProvinceByIndex,
  suggestRate,
  calculateToll
} = require('../../utils/tollCalc')
const { readLastProvinceId } = require('../../utils/oilPrice')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getTollToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')

const lastInput = createLastInput('toll', [
  'provinceId',
  'vehicleKey',
  'distance',
  'rate',
  'extra',
  'roundTrip',
  'etcOn',
  'holidayFree'
])

function resolveProvinceId(savedId) {
  if (savedId && getProvince(savedId).id === savedId) return savedId
  const oilId = readLastProvinceId()
  if (oilId && getProvince(oilId).id === oilId) return oilId
  return DEFAULT_PROVINCE_ID
}

Page({
  data: {
    theme: getThemeId(),
    vehicles: VEHICLES,
    provinceNames: PROVINCE_NAMES,
    provinceId: DEFAULT_PROVINCE_ID,
    provinceName: getProvince(DEFAULT_PROVINCE_ID).name,
    provinceIndex: getProvince(DEFAULT_PROVINCE_ID).index,
    vehicleKey: 'c1',
    vehicleHint: getVehicle('c1').hint,
    distance: '200',
    rate: suggestRate(DEFAULT_PROVINCE_ID, 'c1'),
    extra: '',
    roundTrip: false,
    etcOn: true,
    holidayFree: false,
    result: null
  },

  onLoad() {
    enableShareMenu()
    const restored = lastInput.restore()
    const provinceId = resolveProvinceId(restored.provinceId)
    const vehicleKey = restored.vehicleKey && getVehicle(restored.vehicleKey).key === restored.vehicleKey
      ? restored.vehicleKey
      : 'c1'
    const province = getProvince(provinceId)
    const patch = {
      provinceId,
      provinceName: province.name,
      provinceIndex: province.index,
      vehicleKey,
      vehicleHint: getVehicle(vehicleKey).hint
    }
    if (restored.distance) patch.distance = restored.distance
    if (restored.extra !== undefined) patch.extra = restored.extra
    if (typeof restored.roundTrip === 'boolean') patch.roundTrip = restored.roundTrip
    if (typeof restored.etcOn === 'boolean') patch.etcOn = restored.etcOn
    if (typeof restored.holidayFree === 'boolean') patch.holidayFree = restored.holidayFree
    patch.rate = restored.rate || suggestRate(provinceId, vehicleKey)
    this.setData(patch, () => this.recalculate())
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onHide() {
    lastInput.flush(this)
  },

  onUnload() {
    lastInput.flush(this)
  },

  onProvinceChange(e) {
    const province = getProvinceByIndex(e.detail.value)
    if (!province || province.id === this.data.provinceId) return
    this.setData({
      provinceId: province.id,
      provinceName: province.name,
      provinceIndex: province.index,
      rate: suggestRate(province.id, this.data.vehicleKey)
    }, () => this.recalculate())
  },

  onSwitchVehicle(e) {
    const vehicleKey = e.currentTarget.dataset.key
    if (!vehicleKey || vehicleKey === this.data.vehicleKey) return
    const vehicle = getVehicle(vehicleKey)
    this.setData({
      vehicleKey: vehicle.key,
      vehicleHint: vehicle.hint,
      rate: suggestRate(this.data.provinceId, vehicle.key)
    }, () => this.recalculate())
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: e.detail.value }, () => this.recalculate())
  },

  onToggle(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: !this.data[field] }, () => this.recalculate())
  },

  recalculate() {
    const result = calculateToll({
      provinceId: this.data.provinceId,
      vehicleKey: this.data.vehicleKey,
      distanceText: this.data.distance,
      rateText: this.data.rate,
      extraText: this.data.extra,
      roundTrip: this.data.roundTrip,
      etcOn: this.data.etcOn,
      holidayFree: this.data.holidayFree
    })
    this.setData({ result }, () => lastInput.save(this))
  },

  onGoFuel() {
    wx.navigateTo({
      url: '/packageTravel/pages/fuel/fuel'
    })
  },

  onGoOilPrice() {
    wx.navigateTo({
      url: '/packageTravel/pages/oilprice/oilprice'
    })
  },

  onShareAppMessage() {
    return getTollToolShare().appMessage
  },

  onShareTimeline() {
    return getTollToolShare().timeline
  }
})
