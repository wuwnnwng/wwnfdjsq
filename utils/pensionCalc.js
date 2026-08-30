/**
 * 养老金估算：职工养老、灵活就业、城乡居民
 * 职工 / 灵活就业按城镇职工公式；城乡居民按年缴费 + 基础养老金
 */

const PAYOUT_MONTHS = {
  50: 195,
  51: 193,
  52: 188,
  53: 186,
  54: 185,
  55: 170,
  56: 164,
  57: 158,
  58: 152,
  59: 145,
  60: 139,
  61: 132,
  62: 125,
  63: 117,
  64: 109,
  65: 101,
  66: 93,
  67: 84,
  68: 75,
  69: 65,
  70: 56
}

const RETIRE_AGES = [50, 55, 60, 63, 65]
const RESIDENT_RETIRE_AGES = [60, 65]
const PERSONAL_RATE = 0.08
const FLEXIBLE_RATE = 0.2
const MIN_INDEX = 0.6
const MAX_INDEX = 3

const PENSION_TYPES = [
  { id: 'employee', name: '职工养老', kicker: '单位缴 · 个人缴' },
  { id: 'flexible', name: '灵活就业', kicker: '自己缴社保' },
  { id: 'resident', name: '城乡居民', kicker: '按年缴费' }
]

const SALARY_BANDS = [
  { id: 'floor', name: '保底档', maxIndex: 0.6, hint: '基数不高于社平 60%，按缴费下限计算', color: '#94a3b8' },
  { id: 'basic', name: '普通档', maxIndex: 1, hint: '基数不高于当地社平工资', color: '#60a5fa' },
  { id: 'mid', name: '中等档', maxIndex: 1.5, hint: '基数略高于社平工资', color: '#34d399' },
  { id: 'upper', name: '中高档', maxIndex: 2, hint: '基数明显高于社平工资', color: '#fbbf24' },
  { id: 'high', name: '较高档', maxIndex: 3, hint: '基数接近缴费上限', color: '#fb923c' },
  { id: 'cap', name: '封顶档', maxIndex: Infinity, hint: '基数达到或超过社平 300%，按缴费上限计算', color: '#f87171' }
]

const { DEFAULT_SUBSIDIES, subsidyOfFee } = require('./pensionRegionData')
const RESIDENT_GRADES = DEFAULT_SUBSIDIES

const RESIDENT_BANDS = [
  { id: 'floor', name: '基础档', maxFee: 500 },
  { id: 'basic', name: '普通档', maxFee: 1000 },
  { id: 'mid', name: '中等档', maxFee: 3000 },
  { id: 'upper', name: '较高档', maxFee: 5000 },
  { id: 'high', name: '高档', maxFee: Infinity }
]

const TRACK_MIN = 0.3
const TRACK_MAX = 3.4
const RESIDENT_TRACK_MAX = 9000

function parseNumber(text) {
  const raw = String(text == null ? '' : text)
    .trim()
    .replace(/,/g, '')
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : NaN
}

function salaryBoundsOf(average) {
  const avg = Number(average)
  if (!Number.isFinite(avg) || avg <= 0) return null
  return {
    min: Math.round(avg * MIN_INDEX),
    max: Math.round(avg * MAX_INDEX)
  }
}

function clampSalaryToBounds(salaryText, averageText) {
  const salary = parseNumber(salaryText)
  const average = parseNumber(averageText)
  const bounds = salaryBoundsOf(average)
  if (salary === null || !Number.isFinite(salary) || !bounds) {
    return { changed: false }
  }
  if (salary < bounds.min) {
    return { changed: true, side: 'floor', salary: bounds.min, salaryText: String(bounds.min), ...bounds }
  }
  if (salary > bounds.max) {
    return { changed: true, side: 'cap', salary: bounds.max, salaryText: String(bounds.max), ...bounds }
  }
  return { changed: false, salary, ...bounds }
}

function salaryRangeTip(type, side, value) {
  const field = type === 'flexible' ? '缴费基数' : '月工资'
  if (side === 'floor') {
    return `${field}不能低于当地社平工资的 60%（保底档），已调整为 ${formatMoney(value)} 元`
  }
  return `${field}不能高于当地社平工资的 300%（封顶档），已调整为 ${formatMoney(value)} 元`
}

function formatMoney(value, digits) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const places = digits == null ? 0 : digits
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const fixed = abs.toFixed(places)
  const parts = fixed.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (places === 0) return sign + parts[0]
  return sign + parts.join('.')
}

function formatIndex(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

function formatPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n.toFixed(1)}%`
}

function typeMeta(type) {
  return PENSION_TYPES.find((item) => item.id === type) || PENSION_TYPES[0]
}

function bandOf(rawIndex) {
  if (rawIndex >= MAX_INDEX) return SALARY_BANDS[SALARY_BANDS.length - 1]
  return SALARY_BANDS.find((item) => rawIndex <= item.maxIndex) || SALARY_BANDS[SALARY_BANDS.length - 1]
}

function residentBandOf(fee) {
  return RESIDENT_BANDS.find((item) => fee <= item.maxFee) || RESIDENT_BANDS[RESIDENT_BANDS.length - 1]
}

function markerPercentOf(rawIndex) {
  const pct = ((Number(rawIndex) - TRACK_MIN) / (TRACK_MAX - TRACK_MIN)) * 100
  return Math.round(Math.max(0, Math.min(100, pct)) * 10) / 10
}

function residentMarkerOf(fee) {
  const pct = (Number(fee) / RESIDENT_TRACK_MAX) * 100
  return Math.round(Math.max(0, Math.min(100, pct)) * 10) / 10
}

function payoutMonthsOf(age) {
  const key = Math.round(Number(age))
  if (PAYOUT_MONTHS[key]) return PAYOUT_MONTHS[key]
  const ages = Object.keys(PAYOUT_MONTHS).map(Number).sort((a, b) => a - b)
  if (key <= ages[0]) return PAYOUT_MONTHS[ages[0]]
  if (key >= ages[ages.length - 1]) return PAYOUT_MONTHS[ages[ages.length - 1]]
  return PAYOUT_MONTHS[60]
}

function futureValueAnnuity(annualDeposit, years, rate) {
  if (years <= 0) return 0
  if (!rate) return annualDeposit * years
  const factor = (Math.pow(1 + rate, years) - 1) / rate
  return annualDeposit * factor
}

function subsidyOf(fee, grades) {
  return subsidyOfFee(fee, grades && grades.length ? grades : RESIDENT_GRADES)
}

function calculateEmployeeLike({ type, salaryText, averageText, yearsText, retireAge, returnText }) {
  const isFlexible = type === 'flexible'
  const salary = parseNumber(salaryText)
  const average = parseNumber(averageText)
  const years = parseNumber(yearsText)
  const returnRaw = returnText == null || String(returnText).trim() === '' ? 0 : parseNumber(returnText)
  const meta = typeMeta(type)

  if (salary === null || average === null || years === null) {
    return { valid: false, message: isFlexible ? '请输入缴费基数、社平工资和缴费年限' : '请输入月工资、社平工资和缴费年限' }
  }
  if (!Number.isFinite(salary) || !Number.isFinite(average) || !Number.isFinite(years)) {
    return { valid: false, message: '请输入有效数字' }
  }
  if (salary <= 0 || salary > 1e7) {
    return { valid: false, message: isFlexible ? '缴费基数请输入合理金额' : '月工资请输入合理金额' }
  }
  if (average < 1000 || average > 1e6) return { valid: false, message: '社平工资请输入 1000 元以上' }
  if (years < 15 || years > 50) return { valid: false, message: '缴费年限请输入 15–50 年（满 15 年才能按月领取）' }
  if (returnRaw === null || !Number.isFinite(returnRaw) || returnRaw < 0 || returnRaw > 12) {
    return { valid: false, message: '账户年化请输入 0–12' }
  }

  const age = Number(retireAge) || 60
  const rawIndex = salary / average
  const contribIndex = Math.min(MAX_INDEX, Math.max(MIN_INDEX, rawIndex))
  const contribBase = contribIndex * average
  const floored = rawIndex < MIN_INDEX
  const capped = rawIndex > MAX_INDEX
  const band = bandOf(rawIndex)

  const basicPension = ((average + contribBase) / 2) * years * 0.01
  const annualPersonal = contribBase * PERSONAL_RATE * 12
  const accountBalance = futureValueAnnuity(annualPersonal, years, returnRaw / 100)
  const payoutMonths = payoutMonthsOf(age)
  const accountPension = accountBalance / payoutMonths
  const monthly = basicPension + accountPension
  const replacement = (monthly / salary) * 100
  const selfPay = contribBase * FLEXIBLE_RATE

  return {
    valid: true,
    type,
    typeName: meta.name,
    showSalaryTrack: true,
    salary,
    average,
    years,
    retireAge: age,
    bandId: band.id,
    bandName: band.name,
    bandHint: band.hint,
    bandColor: band.color,
    markerPercent: markerPercentOf(rawIndex),
    rawIndex,
    contribIndex,
    contribBase,
    floored,
    capped,
    basicPension,
    accountBalance,
    accountPension,
    monthly,
    replacement,
    payoutMonths,
    selfPay,
    heroText: formatMoney(monthly),
    formulaText: `${meta.name} · ${band.name} · 缴费指数 ${formatIndex(contribIndex)}`,
    heroSub: isFlexible
      ? `每月自缴约 ${formatMoney(selfPay)} 元 · 替代率 ${formatPercent(replacement)}`
      : `替代率约 ${formatPercent(replacement)}（相对当前月工资）`,
    salaryText: formatMoney(salary),
    averageText: formatMoney(average),
    contribBaseText: formatMoney(contribBase),
    indexText: formatIndex(contribIndex),
    rawIndexText: formatIndex(rawIndex),
    basicText: formatMoney(basicPension),
    accountText: formatMoney(accountPension),
    accountBalanceText: formatMoney(accountBalance),
    monthlyText: formatMoney(monthly),
    replacementText: formatPercent(replacement),
    payoutMonthsText: `${payoutMonths} 个月`,
    yearsText: `${years} 年`,
    returnText: formatPercent(returnRaw),
    selfPayText: formatMoney(selfPay),
    payRateText: `${Math.round(FLEXIBLE_RATE * 100)}%`,
    bands: SALARY_BANDS.map((item) => ({
      id: item.id,
      name: item.name,
      active: item.id === band.id
    })),
    rows: [
      { label: isFlexible ? '缴费基数' : '月工资', value: `${formatMoney(salary)} 元` },
      { label: '缴费基数（核定）', value: `${formatMoney(contribBase)} 元 / 月` },
      { label: '缴费指数', value: `${formatIndex(contribIndex)}${floored ? '（已保底）' : ''}${capped ? '（已封顶）' : ''}` },
      { label: '基础养老金', value: `${formatMoney(basicPension)} 元 / 月` },
      { label: '个人账户养老金', value: `${formatMoney(accountPension)} 元 / 月` },
      { label: '个人账户储存额', value: `${formatMoney(accountBalance)} 元` },
      ...(isFlexible ? [{ label: '每月自己缴纳', value: `${formatMoney(selfPay)} 元（约 ${Math.round(FLEXIBLE_RATE * 100)}%）` }] : []),
      { label: '计发月数', value: `${payoutMonths} 个月` },
      { label: '预估月养老金', value: `${formatMoney(monthly)} 元` },
      { label: '替代率', value: formatPercent(replacement) }
    ],
    note: isFlexible
      ? '灵活就业按各地规定以缴费基数的约 20% 自己缴纳（8% 进个人账户，其余进统筹）。已按所选省份填入社平工资和账户年化，数字可改。未计入过渡性养老金和退休后调整，结果仅供参考。'
      : '假设缴费基数、社平工资保持当前水平，未计入过渡性养老金、职业年金及退休后调整。已按所选省份填入社平工资和账户年化，数字可改。',
    tipText: isFlexible
      ? '灵活就业人员参加职工养老保险，一般按当地社平工资的 60%–300% 自选缴费基数，自己承担约 20% 的缴费。养老金算法与职工相同：基础养老金 + 个人账户养老金。个人账户仍按基数的 8% 记账。'
      : '按城镇职工基本养老保险：月养老金 ≈ 基础养老金 + 个人账户养老金。基础养老金 =（社平工资 + 缴费基数）÷ 2 × 缴费年限 × 1%；个人账户按缴费基数 8% 逐年滚存后，再除以退休年龄对应的计发月数。缴费基数不得低于社平 60%、不得高于 300%。'
  }
}

function calculateResident({
  annualFeeText,
  subsidyText,
  basicText,
  yearsText,
  retireAge,
  returnText
}) {
  const annualFee = parseNumber(annualFeeText)
  const years = parseNumber(yearsText)
  const basicRaw = parseNumber(basicText)
  const subsidyRaw = subsidyText == null || String(subsidyText).trim() === '' ? null : parseNumber(subsidyText)
  const returnRaw = returnText == null || String(returnText).trim() === '' ? 0 : parseNumber(returnText)
  const meta = typeMeta('resident')

  if (annualFee === null || years === null || basicRaw === null) {
    return { valid: false, message: '请输入年缴费、基础养老金和缴费年限' }
  }
  if (!Number.isFinite(annualFee) || !Number.isFinite(years) || !Number.isFinite(basicRaw)) {
    return { valid: false, message: '请输入有效数字' }
  }
  if (annualFee < 100 || annualFee > 50000) return { valid: false, message: '年缴费请输入 100–50000 元' }
  if (basicRaw < 50 || basicRaw > 5000) return { valid: false, message: '当地基础养老金请输入合理金额' }
  if (years < 15 || years > 50) return { valid: false, message: '缴费年限请输入 15–50 年（满 15 年才能按月领取）' }
  if (returnRaw === null || !Number.isFinite(returnRaw) || returnRaw < 0 || returnRaw > 12) {
    return { valid: false, message: '账户年化请输入 0–12' }
  }
  const subsidy = subsidyRaw == null || !Number.isFinite(subsidyRaw) ? subsidyOf(annualFee) : subsidyRaw
  if (subsidy < 0 || subsidy > 2000) return { valid: false, message: '政府补贴请输入合理金额' }

  const age = Number(retireAge) || 60
  const band = residentBandOf(annualFee)
  const annualIn = annualFee + subsidy
  const accountBalance = futureValueAnnuity(annualIn, years, returnRaw / 100)
  const payoutMonths = payoutMonthsOf(age)
  const accountPension = accountBalance / payoutMonths
  const monthly = basicRaw + accountPension

  return {
    valid: true,
    type: 'resident',
    typeName: meta.name,
    showSalaryTrack: false,
    years,
    retireAge: age,
    bandId: band.id,
    bandName: band.name,
    bandHint: `年缴费 ${formatMoney(annualFee)} 元，对应${band.name}`,
    markerPercent: residentMarkerOf(annualFee),
    basicPension: basicRaw,
    accountBalance,
    accountPension,
    monthly,
    payoutMonths,
    heroText: formatMoney(monthly),
    formulaText: `${meta.name} · ${band.name}`,
    heroSub: `基础养老金 ${formatMoney(basicRaw)} 元 + 个人账户 ${formatMoney(accountPension)} 元`,
    basicText: formatMoney(basicRaw),
    accountText: formatMoney(accountPension),
    accountBalanceText: formatMoney(accountBalance),
    monthlyText: formatMoney(monthly),
    payoutMonthsText: `${payoutMonths} 个月`,
    yearsText: `${years} 年`,
    returnText: formatPercent(returnRaw),
    subsidyText: formatMoney(subsidy),
    annualFeeText: formatMoney(annualFee),
    bands: RESIDENT_BANDS.map((item) => ({
      id: item.id,
      name: item.name,
      active: item.id === band.id
    })),
    rows: [
      { label: '年缴费档次', value: `${formatMoney(annualFee)} 元` },
      { label: '政府补贴', value: `${formatMoney(subsidy)} 元 / 年` },
      { label: '当地基础养老金', value: `${formatMoney(basicRaw)} 元 / 月` },
      { label: '个人账户养老金', value: `${formatMoney(accountPension)} 元 / 月` },
      { label: '个人账户储存额', value: `${formatMoney(accountBalance)} 元` },
      { label: '计发月数', value: `${payoutMonths} 个月` },
      { label: '预估月养老金', value: `${formatMoney(monthly)} 元` }
    ],
    note: '城乡居民养老按「当地基础养老金 + 个人账户÷计发月数」估算。已按所选省份填入基础养老金、补贴和账户年化，县市标准可能更高，数字可改。',
    tipText:
      '城乡居民养老保险由个人按年缴费，政府给予补贴。领取时：月养老金 = 当地基础养老金 + 个人账户储存额 ÷ 计发月数。基础养老金由各地公布，个人账户为每年缴费加补贴后滚存。与职工养老不是同一套制度。'
  }
}

function calculatePension(input) {
  const type = (input && input.type) || 'employee'
  if (type === 'resident') return calculateResident(input)
  return calculateEmployeeLike({ ...input, type: type === 'flexible' ? 'flexible' : 'employee' })
}

module.exports = {
  SALARY_BANDS,
  RESIDENT_BANDS,
  RESIDENT_GRADES,
  PENSION_TYPES,
  RETIRE_AGES,
  RESIDENT_RETIRE_AGES,
  PAYOUT_MONTHS,
  TRACK_MIN,
  TRACK_MAX,
  MIN_INDEX,
  MAX_INDEX,
  calculatePension,
  subsidyOf,
  bandOf,
  salaryBoundsOf,
  clampSalaryToBounds,
  salaryRangeTip
}
