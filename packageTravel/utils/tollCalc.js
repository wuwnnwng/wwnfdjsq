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
  { id: 'he', name: '河北', rates: { c1: 0.4, c2: 0.6, c3: 1.06, c4: 1.28 }, note: '京沪、京台河北段集团公开表：一类 0.40、二类 0.60、三类 1.06、四类 1.28。大广、京港澳石磁、青银、荣乌等为 0.40 / 0.70 / 1.10 / 1.36，石黄一类 0.30。' },
  { id: 'sx', name: '山西', rates: { c1: 0.36, c2: 0.54, c3: 0.87, c4: 1.41 }, note: '省政府乙类道路公开表：一类 0.36、二类 0.54、三类 0.87、四类 1.41。甲类为 0.39 / 0.63 / 1.03 / 1.545，晋阳等丁类一类 0.30；桥隧另计。' },
  { id: 'nm', name: '内蒙古', rates: { c1: 0.4, c2: 0.4, c3: 0.5, c4: 0.7 } },
  { id: 'ln', name: '辽宁', rates: { c1: 0.45, c2: 0.8, c3: 1.15, c4: 1.45 } },
  { id: 'jl', name: '吉林', rates: { c1: 0.45, c2: 0.8, c3: 1.1, c4: 1.45 } },
  { id: 'hl', name: '黑龙江', rates: { c1: 0.45, c2: 0.8, c3: 1.1, c4: 1.45 }, note: '省交通运输厅黑交规〔2020〕3号、〔2026〕1号全省公开表：一类 0.45、二类 0.80、三类 1.10、四类 1.45。不含哈尔滨机场专用高速（按次计）。' },
  { id: 'sh', name: '上海', rates: { c1: 0.6, c2: 0.6, c3: 0.9, c4: 0.9 }, note: '二类按一类、四类按三类计。' },
  { id: 'js', name: '江苏', rates: { c1: 0.55, c2: 0.825, c3: 1.1, c4: 1.1 }, note: '厅里近年开征通知（常宜、溧高）公开表：一类 0.55、二类 0.825、三类 1.10，四类与三类同价。宁沪等存量路段为 0.45 / 0.675 / 0.90 / 0.90。' },
  { id: 'zj', name: '浙江', rates: { c1: 0.4, c2: 0.4, c3: 0.8, c4: 1.2 }, note: '另有车次费：一/二类 5 元，三类 10 元，四类 15 元。' },
  { id: 'ah', name: '安徽', rates: { c1: 0.45, c2: 0.8, c3: 1.1, c4: 1.3 } },
  { id: 'fj', name: '福建', rates: { c1: 0.6, c2: 1.2, c3: 1.68, c4: 1.8 }, note: '闽政文〔2025〕287号等新建路一类 0.60，对应公开四类 0.60 / 1.20 / 1.68 / 1.80。福厦漳、福银存量路为 0.55 / 1.10 / 1.54 / 1.65。' },
  { id: 'jx', name: '江西', rates: { c1: 0.45, c2: 0.8, c3: 1.15, c4: 1.5 } },
  { id: 'sd', name: '山东', rates: { c1: 0.5, c2: 0.65, c3: 0.78, c4: 0.98 }, note: '省交通运输厅客车信息公开表（2018 年后新建改扩建）：一类 0.50、二类 0.65、三类 0.78、四类 0.98。2018 年前开通的高速为 0.40 / 0.50 / 0.60 / 0.75。' },
  { id: 'ha', name: '河南', rates: { c1: 0.45, c2: 0.65, c3: 0.85, c4: 1 }, note: '中原高速等公开表常见档：一类 0.45、二类 0.65、三类 0.85、四类 1.00。京港澳郑漯为 0.45 / 0.70 / 1.00 / 1.30。' },
  { id: 'hb', name: '湖北', rates: { c1: 0.4, c2: 0.6, c3: 0.8, c4: 1 }, note: '鄂交发客车附件主干档（汉宜、京珠、武黄、黄黄、孝襄、襄十等）：一类 0.40、二类 0.60、三类 0.80、四类 1.00。另有 0.50 / 0.75 / 1.00 / 1.25 等更高档。' },
  { id: 'hn', name: '湖南', rates: { c1: 0.5, c2: 0.8, c3: 1.1, c4: 1.3 }, note: '省厅信息公开表第 2 套（造价不低于 6000 万元/公里的四车道及六车道）：一类 0.50、二类 0.80、三类 1.10、四类 1.30。第 1 套老四车道为 0.40 / 0.70 / 1.00 / 1.20。' },
  { id: 'gd', name: '广东', rates: { c1: 0.6, c2: 0.9, c3: 1.2, c4: 1.2 }, note: '粤交费〔2019〕830 号六车道：一类 0.60、二类 0.90、三类 1.20；40 座以上按三类计，故四类同为 1.20。四车道一类 0.45、二类 0.675、三类/四类 0.90。' },
  { id: 'gx', name: '广西', rates: { c1: 0.5, c2: 0.8, c3: 1.2, c4: 1.45 }, note: '2008 年后通车及近年改扩建公开表：一类 0.50、二类 0.80、三类 1.20、四类 1.45。2007 年底前建成路段一类 0.40；桥隧另计。' },
  { id: 'hi', name: '海南', rates: { c1: 0, c2: 0, c3: 0, c4: 0 }, note: '海南大部分高速不单独收取通行费。' },
  { id: 'cq', name: '重庆', rates: { c1: 0.65, c2: 1.3, c3: 1.95, c4: 2.6 }, note: '多数路段公开单价一类 0.65、二类 1.30、三类 1.95、四类 2.60。少数路段一类 0.50 或 0.60。' },
  { id: 'sc', name: '四川', rates: { c1: 0.5, c2: 1, c3: 1.5, c4: 2 }, note: '定价办法基本标准公开单价：一类 0.50、二类 1.00、三类 1.50、四类 2.00。老成渝等路段一类常见 0.35。' },
  { id: 'gz', name: '贵州', rates: { c1: 0.5, c2: 0.75, c3: 1, c4: 1.75 }, note: '基本费率公开单价：一类 0.50、二类 0.75、三类 1.00、四类 1.75。桥隧另计。' },
  { id: 'yn', name: '云南', rates: { c1: 0.5, c2: 0.9, c3: 1.25, c4: 1.75 }, note: '云政发〔2019〕33 号经营性高速普通路段一类不超过 0.50，1 至 4 类计费系数 1.0∶1.8∶2.5∶3.5，对应 0.50 / 0.90 / 1.25 / 1.75。500 米以上桥隧另计。' },
  { id: 'xz', name: '西藏', rates: { c1: 0, c2: 0, c3: 0, c4: 0 }, note: '现有高等级公路（拉贡、拉林等）免费通行，不单独收取通行费。' },
  { id: 'sn', name: '陕西', rates: { c1: 0.6, c2: 1.06, c3: 1.36, c4: 1.63 }, note: '省政府近年批复公开表（西宝改扩建、马泾高速等）：一类 0.60、二类 1.06、三类 1.36、四类 1.63。部分存量路段一类仍按 0.40 计，桥隧另计。' },
  { id: 'gs', name: '甘肃', rates: { c1: 0.5, c2: 0.6, c3: 0.9, c4: 1.3 }, note: '甘政函〔2020〕117 号公开表（平天、甜永、双达、静庄等）：一类 0.50、二类 0.60、三类 0.90、四类 1.30。部分存量路仍为 0.35 / 0.55 / 0.80 / 1.25。' },
  { id: 'qh', name: '青海', rates: { c1: 0.48, c2: 0.7, c3: 1, c4: 1.45 }, note: '省交通运输厅 2024 年公开表中 G6 平安至西宁、马场垣至平安、扎麻隆至倒淌河等：一类 0.48、二类 0.70、三类 1.00、四类 1.45。部分路段为 0.40 / 0.58 / 0.83 / 1.21。' },
  { id: 'nx', name: '宁夏', rates: { c1: 0.45, c2: 0.75, c3: 1.05, c4: 1.28 }, note: '厅里近年批复公开表（S50 海平高速）：一类 0.45、二类 0.75、三类 1.05、四类 1.28。存量路段一类仍可能是 0.30。' },
  { id: 'xj', name: '新疆', rates: { c1: 0.45, c2: 0.675, c3: 0.9, c4: 1.62 }, note: '自治区交通厅现行公开表：一类 0.45、二类 0.675、三类 0.90、四类 1.62 元/公里。一路一价，桥隧另计。' },
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

function formatRate(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  const thousandths = Math.round(n * 1000)
  if (thousandths % 10 === 0) return (thousandths / 1000).toFixed(2)
  return (thousandths / 1000).toFixed(3)
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
  return `一类 ${formatRate(item.rates.c1)} / 二类 ${formatRate(item.rates.c2)} / 三类 ${formatRate(item.rates.c3)} / 四类 ${formatRate(item.rates.c4)}`
}

function suggestRate(provinceId, vehicleKey) {
  return formatRate(classRate(getProvince(provinceId), vehicleKey))
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

  const parts = [`${formatNumber(distance, 1)} 公里 × ${formatRate(rate)} 元/公里`]
  if (trips > 1) parts.push('往返 × 2')
  if (extraFee > 0) parts.push(`附加 ${formatMoney(extraFee)} 元`)
  if (holidayApplied) parts.push('节假日免费')
  else if (etcApplied) parts.push('ETC 95 折')

  const rows = [
    { label: '车型', value: vehicle.name },
    { label: '参考省份', value: province.name },
    { label: '本省客车费率', value: `${formatRateTable(province)} 元/公里` },
    { label: '本次采用', value: `${formatRate(rate)} 元/公里` },
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
