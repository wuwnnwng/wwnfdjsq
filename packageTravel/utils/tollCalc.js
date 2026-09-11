/**
 * 高速过路费估算：各省客车一类至四类按公开费率计，不再套统一系数。
 * 同一省不同路段仍可能不同，结果仅供出行前估算。
 */

const ETC_DISCOUNT = 0.05

const VEHICLES = [
  { key: 'c1', name: '一类客车', short: '一类', hint: '9 座及以下轿车、SUV，车长小于 6 米', holidayEligible: true },
  { key: 'c2', name: '二类客车', short: '二类', hint: '10–19 座，或车长 6–8 米', holidayEligible: false },
  { key: 'c3', name: '三类客车', short: '三类', hint: '20–39 座，或车长 8–10 米', holidayEligible: false },
  { key: 'c4', name: '四类客车', short: '四类', hint: '40 座及以上，或车长不小于 10 米', holidayEligible: false }
]

const PROVINCES = [
  { id: 'bj', name: '北京', rates: { c1: 0.5, c2: 1, c3: 1.5, c4: 1.8 } },
  { id: 'tj', name: '天津', rates: { c1: 0.55, c2: 0.95, c3: 1.55, c4: 1.75 } },
  { id: 'he', name: '河北', rates: { c1: 0.4, c2: 0.7, c3: 1.1, c4: 1.4 }, note: '多数路段一类 0.40；少数路段一类 0.30 或 0.50。' },
  { id: 'sx', name: '山西', rates: { c1: 0.4, c2: 0.7, c3: 1.1, c4: 1.4 }, note: '道路加桥隧分开计价，表内为一类道路常见客车档。' },
  { id: 'nm', name: '内蒙古', rates: { c1: 0.4, c2: 0.4, c3: 0.5, c4: 0.7 } },
  { id: 'ln', name: '辽宁', rates: { c1: 0.45, c2: 0.8, c3: 1.15, c4: 1.45 } },
  { id: 'jl', name: '吉林', rates: { c1: 0.45, c2: 0.8, c3: 1.1, c4: 1.45 } },
  { id: 'hl', name: '黑龙江', rates: { c1: 0.45, c2: 0.8, c3: 1.1, c4: 1.45 } },
  { id: 'sh', name: '上海', rates: { c1: 0.6, c2: 0.6, c3: 0.9, c4: 0.9 }, note: '二类按一类、四类按三类计。' },
  { id: 'js', name: '江苏', rates: { c1: 0.45, c2: 0.68, c3: 0.9, c4: 0.9 }, note: '四车道常见一类 0.45；部分路段一类 0.50 或 0.55，四类常与三类同价。' },
  { id: 'zj', name: '浙江', rates: { c1: 0.4, c2: 0.4, c3: 0.8, c4: 1.2 }, note: '另有车次费：一/二类 5 元，三类 10 元，四类 15 元。' },
  { id: 'ah', name: '安徽', rates: { c1: 0.45, c2: 0.8, c3: 1.1, c4: 1.3 } },
  { id: 'fj', name: '福建', rates: { c1: 0.55, c2: 1.1, c3: 1.54, c4: 1.65 }, note: '一类常见 0.50 / 0.55 / 0.60，级差 1∶2∶2.8∶3。' },
  { id: 'jx', name: '江西', rates: { c1: 0.45, c2: 0.8, c3: 1.15, c4: 1.5 } },
  { id: 'sd', name: '山东', rates: { c1: 0.4, c2: 0.5, c3: 0.6, c4: 0.75 }, note: '2018 年前路段常见此档；新建改扩建多为 0.50 / 0.65 / 0.78 / 0.98。' },
  { id: 'ha', name: '河南', rates: { c1: 0.45, c2: 0.65, c3: 1, c4: 1.2 }, note: '一类常见 0.45–0.55，二至四类随路段上浮。' },
  { id: 'hb', name: '湖北', rates: { c1: 0.5, c2: 0.75, c3: 1.1, c4: 1.38 } },
  { id: 'hn', name: '湖南', rates: { c1: 0.4, c2: 0.7, c3: 1, c4: 1.2 }, note: '造价较低的四车道为此档；较高造价或六车道多为 0.50 / 0.80 / 1.10 / 1.30。' },
  { id: 'gd', name: '广东', rates: { c1: 0.45, c2: 0.68, c3: 0.9, c4: 1.35 }, note: '四车道一类 0.45，系数 1∶1.5∶2∶3；六车道一类 0.60。40 座以上按三类计。' },
  { id: 'gx', name: '广西', rates: { c1: 0.4, c2: 0.8, c3: 1.2, c4: 1.44 } },
  { id: 'hi', name: '海南', rates: { c1: 0, c2: 0, c3: 0, c4: 0 }, note: '海南大部分高速不单独收取通行费。' },
  { id: 'cq', name: '重庆', rates: { c1: 0.65, c2: 1.3, c3: 1.95, c4: 2.6 }, note: '客车级差 1∶2∶3∶4；多数路段一类 0.65，少数 0.50 或 0.60。' },
  { id: 'sc', name: '四川', rates: { c1: 0.5, c2: 1, c3: 1.5, c4: 2 }, note: '定价办法基本标准一类 0.50，客车级差 1∶2∶3∶4。老成渝等路段一类常见 0.35，新建按投资上浮。' },
  { id: 'gz', name: '贵州', rates: { c1: 0.5, c2: 0.75, c3: 1, c4: 1.75 }, note: '基本费率 0.50 元/公里，客车级差 1∶1.5∶2∶3.5；桥隧另计。' },
  { id: 'yn', name: '云南', rates: { c1: 0.5, c2: 1, c3: 1.5, c4: 2 }, note: '普通路段一类不超过 0.50，客车常见级差 1∶2∶3∶4；500 米以上桥隧另计。' },
  { id: 'xz', name: '西藏', rates: { c1: 0.5, c2: 0.75, c3: 1, c4: 1.5 }, note: '未查到全省统一客车四类表，表内按一类 0.50、级差 1∶1.5∶2∶3 估算，以当地公布为准。' },
  { id: 'sn', name: '陕西', rates: { c1: 0.4, c2: 0.6, c3: 0.8, c4: 1.2 }, note: '一类道路（一类客车 0.40）按 1∶1.5∶2∶3；二至四类道路一类客车为 0.50 / 0.60 / 0.70。' },
  { id: 'gs', name: '甘肃', rates: { c1: 0.4, c2: 0.5, c3: 0.6, c4: 0.75 } },
  { id: 'qh', name: '青海', rates: { c1: 0.4, c2: 0.58, c3: 0.83, c4: 1.21 } },
  { id: 'nx', name: '宁夏', rates: { c1: 0.3, c2: 0.5, c3: 0.7, c4: 0.85 } },
  { id: 'xj', name: '新疆', rates: { c1: 0.35, c2: 0.7, c3: 1.05, c4: 1.4 }, note: '政府还贷高速一类常见 0.35 元/小车·公里；南疆四地州一类常见 0.30。' },
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

function classRate(province, vehicleKey) {
  const rates = (province && province.rates) || getProvince(DEFAULT_PROVINCE_ID).rates
  const key = getVehicle(vehicleKey).key
  const value = Number(rates[key])
  return Number.isFinite(value) ? value : 0
}

function formatRateTable(province) {
  const item = province || getProvince(DEFAULT_PROVINCE_ID)
  return `一类 ${formatNumber(item.rates.c1)} / 二类 ${formatNumber(item.rates.c2)} / 三类 ${formatNumber(item.rates.c3)} / 四类 ${formatNumber(item.rates.c4)}`
}

function suggestRate(provinceId, vehicleKey) {
  return formatNumber(classRate(getProvince(provinceId), vehicleKey), 2)
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
    { label: '参考省份', value: province.name },
    { label: '本省客车费率', value: `${formatRateTable(province)} 元/公里` },
    { label: '本次采用', value: `${formatNumber(rate)} 元/公里` },
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

  let hint = '上表是该省客车常见公布费率，同一省不同路段仍可能不同，桥隧加收未逐条计入。结果仅供出行前估算，以收费站 / ETC 实际扣费为准。'
  if (province.note) hint = `${province.note} ${hint}`
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
  formatRateTable,
  suggestRate,
  calculateToll
}
