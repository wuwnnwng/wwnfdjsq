/**
 * 工资薪金个人所得税（综合所得）
 * 依据：个人所得税法及《个人所得税扣缴申报管理办法（试行）》
 * 工资薪金按「累计预扣法」计算本期应预扣预缴税额。
 * 年终奖单独计税沿用月度税率表（奖金÷12 确定税率），政策以当年财政部、税务总局公告为准。
 */

const MONTHLY_DEDUCTION = 5000

const ANNUAL_BRACKETS = [
  { max: 36000, rate: 0.03, quick: 0 },
  { max: 144000, rate: 0.1, quick: 2520 },
  { max: 300000, rate: 0.2, quick: 16920 },
  { max: 420000, rate: 0.25, quick: 31920 },
  { max: 660000, rate: 0.3, quick: 52920 },
  { max: 960000, rate: 0.35, quick: 85920 },
  { max: Infinity, rate: 0.45, quick: 181920 }
]

const MONTHLY_BRACKETS = [
  { max: 3000, rate: 0.03, quick: 0 },
  { max: 12000, rate: 0.1, quick: 210 },
  { max: 25000, rate: 0.2, quick: 1410 },
  { max: 35000, rate: 0.25, quick: 2660 },
  { max: 55000, rate: 0.3, quick: 4410 },
  { max: 80000, rate: 0.35, quick: 7160 },
  { max: Infinity, rate: 0.45, quick: 15160 }
]

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return 0
  const n = Number(String(value).trim())
  return Number.isFinite(n) ? n : NaN
}

function round2(value) {
  if (!Number.isFinite(value)) return NaN
  return Math.round(value * 100) / 100
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return '—'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const parts = abs.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${parts[0]}.${parts[1]}`
}

function formatPercent(rate) {
  if (!Number.isFinite(rate)) return '—'
  return `${Math.round(rate * 100)}%`
}

const INSURANCE_ITEMS = [
  { key: 'pension', field: 'pensionRate', label: '养老保险', short: '养老', defaultRate: '8' },
  { key: 'medical', field: 'medicalRate', label: '医疗保险', short: '医疗', defaultRate: '2' },
  { key: 'unemployment', field: 'unemploymentRate', label: '失业保险', short: '失业', defaultRate: '0.5' },
  { key: 'housing', field: 'housingRate', label: '住房公积金', short: '公积金', defaultRate: '12' }
]

const DEFAULT_INSURANCE_RATES = {
  pensionRate: '8',
  medicalRate: '2',
  unemploymentRate: '0.5',
  housingRate: '12'
}

function formatRateText(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n - Math.round(n)) < 1e-8) return String(Math.round(n))
  return String(Math.round(n * 1000) / 1000)
}

function formatInsuranceInput(value) {
  const n = round2(value)
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n - Math.round(n)) < 1e-8) return String(Math.round(n))
  return n.toFixed(2)
}

function parseRate(text) {
  if (text === '' || text == null) return 0
  const n = Number(String(text).trim())
  return Number.isFinite(n) ? n : NaN
}

function clampRate(value) {
  const n = parseRate(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(40, n)
}

function calculateInsurance(gross, rates) {
  const g = Math.max(0, toNumber(gross) || 0)
  const source = rates || {}
  const items = INSURANCE_ITEMS.map((meta) => {
    const raw = source[meta.field]
    const rateNum = clampRate(raw)
    const amount = round2((g * rateNum) / 100)
    return {
      key: meta.key,
      field: meta.field,
      label: meta.label,
      short: meta.short,
      rate: raw == null || raw === '' ? '' : String(raw),
      rateNum,
      amount,
      amountText: formatMoney(amount)
    }
  })
  const total = round2(items.reduce((sum, item) => sum + item.amount, 0))
  return {
    items,
    total,
    totalText: formatMoney(total),
    totalInput: formatInsuranceInput(total),
    hint: items.map((item) => `${item.short} ${formatRateText(item.rateNum)}%`).join(' · '),
    rateSumText: `${formatRateText(items.reduce((sum, item) => sum + item.rateNum, 0))}%`
  }
}

function findBracket(amount, table) {
  const taxable = Math.max(0, Number(amount) || 0)
  for (let i = 0; i < table.length; i += 1) {
    if (taxable <= table[i].max) return table[i]
  }
  return table[table.length - 1]
}

function taxByTable(taxable, table) {
  const amount = Math.max(0, taxable)
  const bracket = findBracket(amount, table)
  return {
    taxable: round2(amount),
    tax: round2(Math.max(0, amount * bracket.rate - bracket.quick)),
    rate: bracket.rate,
    quick: bracket.quick
  }
}

function clampMonth(month) {
  const n = Math.round(Number(month) || 1)
  if (n < 1) return 1
  if (n > 12) return 12
  return n
}

/**
 * 累计预扣法：默认按本月收入水平向前复原 1～n 月（专项扣除同步）。
 * 若传入 paidTaxBefore，则本期税额 = 累计应纳税额 − 已预扣税额。
 */
function calculateMonthlySalaryTax(input) {
  const gross = toNumber(input.gross)
  const insurance = Math.max(0, toNumber(input.insurance))
  const additional = Math.max(0, toNumber(input.additional))
  const exempt = Math.max(0, toNumber(input.exempt))
  const monthIndex = clampMonth(input.monthIndex)
  const paidTaxBefore = input.paidTaxBefore === '' || input.paidTaxBefore == null
    ? null
    : toNumber(input.paidTaxBefore)

  if (!Number.isFinite(gross) || gross < 0) {
    return { valid: false, message: '请输入正确的税前应发工资' }
  }
  if (!Number.isFinite(insurance) || !Number.isFinite(additional) || !Number.isFinite(exempt)) {
    return { valid: false, message: '请检查扣除项金额' }
  }
  if (paidTaxBefore != null && !Number.isFinite(paidTaxBefore)) {
    return { valid: false, message: '请检查累计已预扣税额' }
  }

  const monthlyTaxableBase = gross - exempt - MONTHLY_DEDUCTION - insurance - additional

  function cumulativeTaxable(months) {
    return round2(Math.max(0, monthlyTaxableBase * months))
  }

  const taxableN = cumulativeTaxable(monthIndex)
  const taxN = taxByTable(taxableN, ANNUAL_BRACKETS)
  const taxPrev =
    monthIndex > 1 ? taxByTable(cumulativeTaxable(monthIndex - 1), ANNUAL_BRACKETS).tax : 0
  const alreadyPaid = paidTaxBefore == null ? taxPrev : Math.max(0, paidTaxBefore)
  const thisMonthTax = round2(Math.max(0, taxN.tax - alreadyPaid))
  const netPay = round2(gross - insurance - thisMonthTax)

  return {
    valid: true,
    message: '',
    monthIndex,
    gross: round2(gross),
    insurance: round2(insurance),
    additional: round2(additional),
    exempt: round2(exempt),
    deduction: MONTHLY_DEDUCTION,
    monthlyTaxableBase: round2(monthlyTaxableBase),
    cumulativeIncome: round2(gross * monthIndex),
    cumulativeDeduction: round2(MONTHLY_DEDUCTION * monthIndex),
    cumulativeInsurance: round2(insurance * monthIndex),
    cumulativeAdditional: round2(additional * monthIndex),
    cumulativeTaxable: taxableN,
    cumulativeTax: taxN.tax,
    alreadyPaid: round2(alreadyPaid),
    thisMonthTax,
    netPay,
    rate: taxN.rate,
    quick: taxN.quick,
    rateText: formatPercent(taxN.rate),
    thisMonthTaxText: formatMoney(thisMonthTax),
    netPayText: formatMoney(netPay),
    cumulativeTaxableText: formatMoney(taxableN),
    cumulativeTaxText: formatMoney(taxN.tax),
    flowMonth: [
      { label: '税前应发', value: formatMoney(gross), role: 'in' },
      { label: '三险一金（个人）', value: formatMoney(insurance), role: 'minus' },
      { label: '减除费用', value: formatMoney(MONTHLY_DEDUCTION), role: 'minus', hint: '5000 元 / 月' },
      { label: '专项附加扣除', value: formatMoney(additional), role: 'minus' },
      { label: '本月应纳税所得额', value: formatMoney(Math.max(0, monthlyTaxableBase)), role: 'sum' }
    ],
    flowYear: [
      { label: `累计应纳税所得额（1–${monthIndex}月）`, value: formatMoney(taxableN), role: 'in' },
      { label: '适用预扣率', value: formatPercent(taxN.rate), role: 'plain' },
      { label: '速算扣除数', value: formatMoney(taxN.quick), role: 'plain' },
      { label: '累计应纳税额', value: formatMoney(taxN.tax), role: 'in' },
      { label: '累计已预扣税额', value: formatMoney(alreadyPaid), role: 'minus' },
      { label: '本期应预扣预缴', value: formatMoney(thisMonthTax), role: 'hero' }
    ]
  }
}

function calculateAnnualBonusSeparate(bonus) {
  const amount = toNumber(bonus)
  if (!Number.isFinite(amount) || amount < 0) {
    return { valid: false, message: '请输入正确的全年一次性奖金' }
  }
  const monthlyAvg = amount / 12
  const bracket = findBracket(monthlyAvg, MONTHLY_BRACKETS)
  const tax = round2(Math.max(0, amount * bracket.rate - bracket.quick))
  return {
    valid: true,
    method: 'separate',
    bonus: round2(amount),
    monthlyAvg: round2(monthlyAvg),
    rate: bracket.rate,
    quick: bracket.quick,
    tax,
    net: round2(amount - tax),
    rateText: formatPercent(bracket.rate),
    taxText: formatMoney(tax),
    netText: formatMoney(amount - tax),
    boundaryHint: amount > 36000 && amount < 38500
  }
}

/**
 * 年终奖并入综合所得：按当年 1–12 月工资水平 + 奖金，一次适用综合所得税率表。
 */
function calculateAnnualBonusMerged(input) {
  const bonus = toNumber(input.bonus)
  const gross = toNumber(input.gross)
  const insurance = Math.max(0, toNumber(input.insurance))
  const additional = Math.max(0, toNumber(input.additional))
  if (!Number.isFinite(bonus) || bonus < 0) {
    return { valid: false, message: '请输入正确的全年一次性奖金' }
  }
  if (!Number.isFinite(gross) || gross < 0) {
    return { valid: false, message: '并入综合所得需填写月薪，以便测算全年税负' }
  }
  const yearIncome = gross * 12 + bonus
  const yearTaxable = Math.max(
    0,
    yearIncome - MONTHLY_DEDUCTION * 12 - insurance * 12 - additional * 12
  )
  const withBonus = taxByTable(yearTaxable, ANNUAL_BRACKETS)
  const withoutBonus = taxByTable(
    Math.max(0, gross * 12 - MONTHLY_DEDUCTION * 12 - insurance * 12 - additional * 12),
    ANNUAL_BRACKETS
  )
  const tax = round2(Math.max(0, withBonus.tax - withoutBonus.tax))
  return {
    valid: true,
    method: 'merged',
    bonus: round2(bonus),
    yearTaxable: round2(yearTaxable),
    rate: withBonus.rate,
    quick: withBonus.quick,
    tax,
    net: round2(bonus - tax),
    rateText: formatPercent(withBonus.rate),
    taxText: formatMoney(tax),
    netText: formatMoney(bonus - tax),
    yearTaxableText: formatMoney(yearTaxable)
  }
}

function compareBonusMethods(input) {
  const separate = calculateAnnualBonusSeparate(input.bonus)
  const merged = calculateAnnualBonusMerged(input)
  if (!separate.valid) return { valid: false, message: separate.message, separate, merged }
  let better = 'separate'
  let betterLabel = '单独计税'
  if (merged.valid && merged.tax < separate.tax) {
    better = 'merged'
    betterLabel = '并入综合所得'
  }
  const saving =
    separate.valid && merged.valid ? round2(Math.abs(separate.tax - merged.tax)) : 0
  return {
    valid: true,
    message: '',
    separate,
    merged,
    better,
    betterLabel,
    saving,
    savingText: formatMoney(saving)
  }
}

module.exports = {
  MONTHLY_DEDUCTION,
  ANNUAL_BRACKETS,
  MONTHLY_BRACKETS,
  INSURANCE_ITEMS,
  DEFAULT_INSURANCE_RATES,
  formatMoney,
  formatPercent,
  formatRateText,
  clampRate,
  calculateInsurance,
  calculateMonthlySalaryTax,
  calculateAnnualBonusSeparate,
  calculateAnnualBonusMerged,
  compareBonusMethods
}
