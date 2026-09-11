const {
  VEHICLES,
  PROVINCE_NAMES,
  DEFAULT_PROVINCE_ID,
  getVehicle,
  getProvince,
  getProvinceByIndex,
  formatRateTable,
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
    rateTable: formatRateTable(getProvince(DEFAULT_PROVINCE_ID)),
    vehicleKey: 'c1',
    vehicleHint: getVehicle('c1').hint,
    distance: '200',
    rate: suggestRate(DEFAULT_PROVINCE_ID, 'c1'),
    extra: '',
    roundTrip: false,
    etcOn: true,
    holidayFree: false,
    detailOpen: false,
    showTip: false,
    tipTitle: '',
    tipText: '',
    result: null
  },

  onLoad(options) {
    enableShareMenu()
    const restored = lastInput.restore()
    const provinceId = resolveProvinceId(restored.provinceId)
    const vehicleKey = restored.vehicleKey && getVehicle(restored.vehicleKey).key === restored.vehicleKey
      ? restored.vehicleKey
      : 'c1'
    const province = getProvince(provinceId)
    const incomingDistance = options && String(options.distance || '').trim()
    const patch = {
      provinceId,
      provinceName: province.name,
      provinceIndex: province.index,
      rateTable: formatRateTable(province),
      vehicleKey,
      vehicleHint: getVehicle(vehicleKey).hint,
      rate: suggestRate(provinceId, vehicleKey)
    }
    if (incomingDistance) patch.distance = incomingDistance
    else if (restored.distance) patch.distance = restored.distance
    if (restored.extra !== undefined) patch.extra = restored.extra
    if (typeof restored.roundTrip === 'boolean') patch.roundTrip = restored.roundTrip
    if (typeof restored.etcOn === 'boolean') patch.etcOn = restored.etcOn
    if (typeof restored.holidayFree === 'boolean') patch.holidayFree = restored.holidayFree
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
      rateTable: formatRateTable(province),
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

  onToggleDetail() {
    this.setData({ detailOpen: !this.data.detailOpen })
  },

  onShowProvinceTip() {
    const province = getProvince(this.data.provinceId)
    const parts = [`本省客车常见费率 ${formatRateTable(province)} 元/公里。`]
    if (province.note) parts.push(province.note)
    parts.push('切换省份或车型会带出该省一类至四类公布费率，同一省不同路段仍可能不同，也可按实际路段自己改。')
    this.setData({
      showTip: true,
      tipTitle: '参考省份',
      tipText: parts.join('\n\n')
    })
  },

  onShowHolidayTip() {
    this.setData({
      showTip: true,
      tipTitle: '节假日免费',
      tipText: '春节、清明、劳动节、国庆的一类客车通常免费通行。打开后一类客车按 0 元估算，免费时段以当年通知为准。'
    })
  },

  onHideTip() {
    this.setData({ showTip: false })
  },

  preventMove() {},

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
