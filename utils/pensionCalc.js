/**
 * 城镇职工基本养老金估算
 * 基础养老金 + 个人账户养老金，并按工资相对社平工资打档位标签
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
const PERSONAL_RATE = 0.08
const MIN_INDEX = 0.6
const MAX_INDEX = 3

const SALARY_BANDS = [
  { id: 'floor', name: '保底档', maxIndex: 0.6, hint: '工资不高于社平 60%，按缴费下限计算', color: '#94a3b8' },
  { id: 'basic', name: '普通档', maxIndex: 1, hint: '工资不高于当地社平工资', color: '#60a5fa' },
  { id: 'mid', name: '中等档', maxIndex: 1.5, hint: '工资略高于社平工资', color: '#34d399' },
  { id: 'upper', name: '中高档', maxIndex: 2, hint: '工资明显高于社平工资', color: '#fbbf24' },
  { id: 'high', name: '较高档', maxIndex: 3, hint: '工资接近缴费上限', color: '#fb923c' },
  { id: 'cap', name: '封顶档', maxIndex: Infinity, hint: '工资达到或超过社平 300%，按缴费上限计算', color: '#f87171' }
]

const TRACK_MIN = 0.3
const TRACK_MAX = 3.4

function parseNumber(text) {
  const raw = String(text == null ? '' : text)
    .trim()
    .replace(/,/g, '')
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : NaN
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

function bandOf(rawIndex) {
  if (rawIndex >= MAX_INDEX) return SALARY_BANDS[SALARY_BANDS.length - 1]
  return SALARY_BANDS.find((item) => rawIndex <= item.maxIndex) || SALARY_BANDS[SALARY_BANDS.length - 1]
}

function markerPercentOf(rawIndex) {
  const pct = ((Number(rawIndex) - TRACK_MIN) / (TRACK_MAX - TRACK_MIN)) * 100
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

function calculatePension({
  salaryText,
  averageText,
  yearsText,
  retireAge,
  returnText
}) {
  const salary = parseNumber(salaryText)
  const average = parseNumber(averageText)
  const years = parseNumber(yearsText)
  const returnRaw = returnText == null || String(returnText).trim() === '' ? 0 : parseNumber(returnText)

  if (salary === null || average === null || years === null) {
    return { valid: false, message: '请输入月工资、社平工资和缴费年限' }
  }
  if (!Number.isFinite(salary) || !Number.isFinite(average) || !Number.isFinite(years)) {
    return { valid: false, message: '请输入有效数字' }
  }
  if (salary <= 0 || salary > 1e7) return { valid: false, message: '月工资请输入合理金额' }
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

  return {
    valid: true,
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
    heroText: formatMoney(monthly),
    formulaText: `${band.name} · 缴费指数 ${formatIndex(contribIndex)}`,
    heroSub: `替代率约 ${formatPercent(replacement)}（相对当前月工资）`,
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
    bands: SALARY_BANDS.map((item) => ({
      id: item.id,
      name: item.name,
      active: item.id === band.id
    }))
  }
}

module.exports = {
  SALARY_BANDS,
  RETIRE_AGES,
  PAYOUT_MONTHS,
  TRACK_MIN,
  TRACK_MAX,
  calculatePension,
  bandOf
}
