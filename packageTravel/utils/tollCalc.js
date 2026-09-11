/**
 * 高速过路费估算：里程 × 车型费率 + 附加，再按 ETC / 节假日规则折算。
 * 各省路段实际费率不同，结果仅供出行前估算。
 */

const ETC_DISCOUNT = 0.05

const VEHICLES = [
  { key: 'c1', name: '一类客车', short: '一类', hint: '9 座及以下轿车、SUV，车长小于 6 米', coeff: 1, holidayEligible: true },
  { key: 'c2', name: '二类客车', short: '二类', hint: '10–19 座，或车长 6–8 米', coeff: 1.8, holidayEligible: false },
  { key: 'c3', name: '三类客车', short: '三类', hint: '20–39 座，或车长 8–10 米', coeff: 2.5, holidayEligible: false },
  { key: 'c4', name: '四类客车', short: '四类', hint: '40 座及以上，或车长不小于 10 米', coeff: 3, holidayEligible: false }
]

const PROVINCES = [
  { id: 'bj', name: '北京', baseRate: 0.5 },
  { id: 'tj', name: '天津', baseRate: 0.49 },
  { id: 'he', name: '河北', baseRate: 0.4 },
  { id: 'sx', name: '山西', baseRate: 0.39 },
  { id: 'nm', name: '内蒙古', baseRate: 0.4 },
  { id: 'ln', name: '辽宁', baseRate: 0.4 },
  { id: 'jl', name: '吉林', baseRate: 0.4 },
  { id: 'hl', name: '黑龙江', baseRate: 0.45 },
  { id: 'sh', name: '上海', baseRate: 0.6 },
  { id: 'js', name: '江苏', baseRate: 0.45 },
  { id: 'zj', name: '浙江', baseRate: 0.4 },
  { id: 'ah', name: '安徽', baseRate: 0.45 },
  { id: 'fj', name: '福建', baseRate: 0.55 },
  { id: 'jx', name: '江西', baseRate: 0.45 },
  { id: 'sd', name: '山东', baseRate: 0.4 },
  { id: 'ha', name: '河南', baseRate: 0.45 },
  { id: 'hb', name: '湖北', baseRate: 0.45 },
  { id: 'hn', name: '湖南', baseRate: 0.5 },
  { id: 'gd', name: '广东', baseRate: 0.45 },
  { id: 'gx', name: '广西', baseRate: 0.4 },
  { id: 'hi', name: '海南', baseRate: 0.5 },
  { id: 'cq', name: '重庆', baseRate: 0.55 },
  { id: 'sc', name: '四川', baseRate: 0.42 },
  { id: 'gz', name: '贵州', baseRate: 0.55 },
  { id: 'yn', name: '云南', baseRate: 0.5 },
  { id: 'xz', name: '西藏', baseRate: 0.5 },
  { id: 'sn', name: '陕西', baseRate: 0.4 },
  { id: 'gs', name: '甘肃', baseRate: 0.4 },
  { id: 'qh', name: '青海', baseRate: 0.4 },
  { id: 'nx', name: '宁夏', baseRate: 0.4 },
  { id: 'xj', name: '新疆', baseRate: 0.4 }
]

const DEFAULT_PROVINCE_ID = 'gd'
const PROVINCE_NAMES = PROVINCES.map((item) => item.name)
const PROVINCE_BY_ID = {}
PROVINCES.forEach((item, index) => {
  item.index = index
  PROVINCE_BY_ID[item.id] = item
})

function parseNumber(text) {
  const raw = String(text == null ? '' : text)
    .trim()
    .replace(/,/g, '')
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : NaN
}

function formatNumber(value, digits) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(digits == null ? 2 : digits)
}

function formatMoney(value) {
  return formatNumber(value, 2)
}

function getVehicle(key) {
  return VEHICLES.find((item) => item.key === key) || VEHICLES[0]
}

function getProvince(id) {
  return PROVINCE_BY_ID[id] || PROVINCE_BY_ID[DEFAULT_PROVINCE_ID]
}

function getProvinceByIndex(index) {
  return PROVINCES[Number(index)] || PROVINCES[0]
}

function suggestRate(provinceId, vehicleKey) {
  const province = getProvince(provinceId)
  const vehicle = getVehicle(vehicleKey)
  return formatNumber(province.baseRate * vehicle.coeff, 2)
}

function calculateToll(input) {
  const vehicle = getVehicle(input && input.vehicleKey)
  const province = getProvince(input && input.provinceId)
  const distance = parseNumber(input && input.distanceText)
  const rate = parseNumber(input && input.rateText)
  const extraRaw = parseNumber(input && input.extraText)
  const extra = extraRaw === null ? 0 : extraRaw

  if (distance === null || rate === null) {
    return { valid: false, message: '请输入高速里程和每公里费率' }
  }
  if (!Number.isFinite(distance) || !Number.isFinite(rate) || !Number.isFinite(extra)) {
    return { valid: false, message: '请输入有效数字' }
  }
  if (distance <= 0) return { valid: false, message: '高速里程须大于 0' }
  if (rate < 0) return { valid: false, message: '费率不能为负数' }
  if (extra < 0) return { valid: false, message: '附加费不能为负数' }

  const trips = input && input.roundTrip ? 2 : 1
  const tripDistance = distance * trips
  const baseFee = distance * rate * trips
  const extraFee = extra * trips
  const gross = baseFee + extraFee
  const holidayApplied = !!(input && input.holidayFree && vehicle.holidayEligible)
  const holidayIgnored = !!(input && input.holidayFree && !vehicle.holidayEligible)
  const etcApplied = !!(!holidayApplied && input && input.etcOn)
  const discount = holidayApplied ? gross : etcApplied ? gross * ETC_DISCOUNT : 0
  const payable = Math.max(0, gross - discount)
  const rounded = Math.round(payable)
  const perKm = tripDistance > 0 ? payable / tripDistance : 0

  const parts = [`${formatNumber(distance, 1)} 公里 × ${formatNumber(rate)} 元/公里`]
  if (trips > 1) parts.push('往返 × 2')
  if (extraFee > 0) parts.push(`附加 ${formatMoney(extraFee)} 元`)
  if (holidayApplied) parts.push('节假日免费')
  else if (etcApplied) parts.push('ETC 95 折')

  const rows = [
    { label: '车型', value: vehicle.name },
    { label: '参考省份', value: `${province.name} · 一类参考 ${formatNumber(province.baseRate)} 元/公里` },
    { label: trips > 1 ? '往返里程' : '高速里程', value: `${formatNumber(tripDistance, 1)} 公里` },
    { label: '基础通行费', value: `${formatMoney(baseFee)} 元` }
  ]
  if (extraFee > 0) {
    rows.push({ label: trips > 1 ? '附加费（往返）' : '桥梁隧道等附加', value: `${formatMoney(extraFee)} 元` })
  }
  rows.push({ label: '优惠前合计', value: `${formatMoney(gross)} 元` })
  if (holidayApplied) {
    rows.push({ label: '节假日减免', value: `-${formatMoney(discount)} 元` })
  } else if (etcApplied) {
    rows.push({ label: 'ETC 优惠', value: `-${formatMoney(discount)} 元` })
  }
  rows.push(
    { label: '估算过路费', value: `${formatMoney(payable)} 元` },
    { label: '四舍五入到元', value: `${rounded} 元` },
    { label: '折合每公里', value: `${formatNumber(perKm, 3)} 元` }
  )

  let hint = '各省各路段费率不同，桥梁隧道和差异化收费未逐条计入。结果仅供出行前估算，以收费站 / ETC 实际扣费为准。'
  if (holidayApplied) {
    hint = '春节、清明、劳动节、国庆期间，7 座及以下小型客车通常免费通行。免费时段以当年通知为准。'
  } else if (holidayIgnored) {
    hint = '节假日免费一般只覆盖 7 座及以下小型客车（一类客车）。当前车型仍按正常费率估算。'
  }

  return {
    valid: true,
    formulaText: parts.join(' · '),
    heroText: `${rounded} 元`,
    subText: holidayApplied
      ? '节假日小型客车免费通行'
      : `估算 ${formatMoney(payable)} 元${etcApplied ? '（已含 ETC 95 折）' : ''}`,
    hint,
    rows,
    payable,
    rounded
  }
}

module.exports = {
  ETC_DISCOUNT,
  VEHICLES,
  PROVINCES,
  PROVINCE_NAMES,
  DEFAULT_PROVINCE_ID,
  getVehicle,
  getProvince,
  getProvinceByIndex,
  suggestRate,
  calculateToll
}
