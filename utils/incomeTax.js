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

/** 专项附加扣除现行标准（月预扣常用项，大病医疗仅汇算清缴故不纳入）。 */
const ADDITIONAL_COUNT_MAX = 6
const ADDITIONAL_STANDARDS = {
  infantPerChild: 2000,
  childPerChild: 2000,
  continueDegree: 400,
  continueVocational: 3600,
  housingLoan: 1000,
  rentHigh: 1500,
  rentMid: 1100,
  rentLow: 800,
  elderOnly: 3000,
  elderShareCap: 1500,
  pensionMonthCap: 1000
}

const DEFAULT_ADDITIONAL_SELECTION = {
  infantOn: false,
  infantCount: 1,
  childOn: false,
  childCount: 1,
  continueOn: false,
  continueType: 'degree',
  housingType: 'none',
  rentLevel: 'high',
  elderOn: false,
  elderType: 'only',
  elderShare: '1500',
  pensionOn: false,
  pensionPay: '1000'
}

function toBool(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function clampCount(value, min, max) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function clampMoney(value, max) {
  const n = toNumber(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return round2(Math.min(max, n))
}

function amountOrDash(on, amount) {
  return on && amount > 0 ? formatMoney(amount) : '—'
}

function calculateAdditionalDeduction(selection) {
  const source = selection || {}
  const infantOn = toBool(source.infantOn)
  const infantCount = clampCount(source.infantCount, 1, ADDITIONAL_COUNT_MAX)
  const childOn = toBool(source.childOn)
  const childCount = clampCount(source.childCount, 1, ADDITIONAL_COUNT_MAX)
  const continueOn = toBool(source.continueOn)
  const continueType = source.continueType === 'vocational' ? 'vocational' : 'degree'
  const housingType =
    source.housingType === 'loan' || source.housingType === 'rent' ? source.housingType : 'none'
  const rentLevel =
    source.rentLevel === 'mid' || source.rentLevel === 'low' ? source.rentLevel : 'high'
  const elderOn = toBool(source.elderOn)
  const elderType = source.elderType === 'share' ? 'share' : 'only'
  const elderShareNum = clampMoney(source.elderShare, ADDITIONAL_STANDARDS.elderShareCap)
  const elderShare = formatInsuranceInput(elderShareNum || ADDITIONAL_STANDARDS.elderShareCap)
  const pensionOn = toBool(source.pensionOn)
  const pensionPay =
    source.pensionPay == null ? DEFAULT_ADDITIONAL_SELECTION.pensionPay : String(source.pensionPay)
  const pensionPayNum = clampMoney(pensionPay, ADDITIONAL_STANDARDS.pensionMonthCap)

  const infantAmount = infantOn ? ADDITIONAL_STANDARDS.infantPerChild * infantCount : 0
  const childAmount = childOn ? ADDITIONAL_STANDARDS.childPerChild * childCount : 0
  const continueMonthly =
    continueOn && continueType === 'degree' ? ADDITIONAL_STANDARDS.continueDegree : 0
  const continueOnce =
    continueOn && continueType === 'vocational' ? ADDITIONAL_STANDARDS.continueVocational : 0
  const continueAmount = continueMonthly + continueOnce
  const rentAmount =
    rentLevel === 'mid'
      ? ADDITIONAL_STANDARDS.rentMid
      : rentLevel === 'low'
        ? ADDITIONAL_STANDARDS.rentLow
        : ADDITIONAL_STANDARDS.rentHigh
  const housingOn = housingType !== 'none'
  const housingAmount =
    housingType === 'loan'
      ? ADDITIONAL_STANDARDS.housingLoan
      : housingType === 'rent'
        ? rentAmount
        : 0
  const elderAmount = elderOn
    ? elderType === 'only'
      ? ADDITIONAL_STANDARDS.elderOnly
      : elderShareNum
    : 0
  const pensionAmount = pensionOn ? pensionPayNum : 0

  const monthlyTotal = round2(
    infantAmount + childAmount + continueMonthly + housingAmount + elderAmount + pensionAmount
  )
  const onceTotal = round2(continueOnce)
  const total = round2(monthlyTotal + onceTotal)
  const hintParts = []
  if (infantOn && infantAmount) hintParts.push(infantCount > 1 ? `婴幼儿×${infantCount}` : '婴幼儿')
  if (childOn && childAmount) hintParts.push(childCount > 1 ? `子女教育×${childCount}` : '子女教育')
  if (continueOn && continueAmount) {
    hintParts.push(continueType === 'vocational' ? '职业资格' : '继续教育')
  }
  if (housingType === 'loan') hintParts.push('房贷利息')
  if (housingType === 'rent') hintParts.push('住房租金')
  if (elderOn && elderAmount) hintParts.push('赡养老人')
  if (pensionOn && pensionAmount) hintParts.push('个人养老金')

  return {
    infantOn,
    infantCount,
    infantAmountText: amountOrDash(infantOn, infantAmount),
    childOn,
    childCount,
    childAmountText: amountOrDash(childOn, childAmount),
    continueOn,
    continueType,
    continueAmountText: amountOrDash(continueOn, continueAmount),
    housingType,
    housingOn,
    rentLevel,
    housingAmountText: amountOrDash(housingOn, housingAmount),
    elderOn,
    elderType,
    elderShare,
    elderAmountText: amountOrDash(elderOn, elderAmount),
    pensionOn,
    pensionPay,
    pensionAmountText: amountOrDash(pensionOn, pensionAmount),
    monthlyTotal,
    onceTotal,
    total,
    totalText: formatMoney(total),
    totalInput: formatInsuranceInput(total),
    monthlyInput: formatInsuranceInput(monthlyTotal),
    onceInput: formatInsuranceInput(onceTotal),
    hint: hintParts.join(' · '),
    emptyHint: '点击选择扣除项目'
  }
}

function additionalFieldView(pack, included) {
  const counted = included ? pack.total : 0
  let hint = pack.emptyHint
  if (pack.total > 0) {
    hint = included ? pack.hint : `可扣 ${pack.totalText} 元 · 暂不计入本月`
  }
  return {
    additional: formatInsuranceInput(counted),
    additionalMonthly: included ? pack.monthlyInput : '0',
    additionalOnce: included ? pack.onceInput : '0',
    additionalHint: hint,
    additionalIncluded: !!included
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
  const additionalOnce = Math.max(0, toNumber(input.additionalOnce))
  const exempt = Math.max(0, toNumber(input.exempt))
  const monthIndex = clampMonth(input.monthIndex)
  const paidTaxBefore = input.paidTaxBefore === '' || input.paidTaxBefore == null
    ? null
    : toNumber(input.paidTaxBefore)

  if (!Number.isFinite(gross) || gross < 0) {
    return { valid: false, message: '请输入正确的税前应发工资' }
  }
  if (
    !Number.isFinite(insurance) ||
    !Number.isFinite(additional) ||
    !Number.isFinite(additionalOnce) ||
    !Number.isFinite(exempt)
  ) {
    return { valid: false, message: '请检查扣除项金额' }
  }
  if (paidTaxBefore != null && !Number.isFinite(paidTaxBefore)) {
    return { valid: false, message: '请检查累计已预扣税额' }
  }

  const thisMonthAdditional = round2(additional + additionalOnce)
  const monthlyRecurringBase = gross - exempt - MONTHLY_DEDUCTION - insurance - additional
  const monthlyTaxableBase = monthlyRecurringBase - additionalOnce

  function cumulativeTaxable(months) {
    const once = months >= monthIndex ? additionalOnce : 0
    return round2(Math.max(0, monthlyRecurringBase * months - once))
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
    additional: round2(thisMonthAdditional),
    additionalMonthly: round2(additional),
    additionalOnce: round2(additionalOnce),
    exempt: round2(exempt),
    deduction: MONTHLY_DEDUCTION,
    monthlyTaxableBase: round2(monthlyTaxableBase),
    cumulativeIncome: round2(gross * monthIndex),
    cumulativeDeduction: round2(MONTHLY_DEDUCTION * monthIndex),
    cumulativeInsurance: round2(insurance * monthIndex),
    cumulativeAdditional: round2(additional * monthIndex + additionalOnce),
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
      {
        label: '专项附加扣除',
        value: formatMoney(thisMonthAdditional),
        role: 'minus',
        hint: additionalOnce > 0 ? '含当年一次性扣除' : ''
      },
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
  const additionalOnce = Math.max(0, toNumber(input.additionalOnce))
  if (!Number.isFinite(bonus) || bonus < 0) {
    return { valid: false, message: '请输入正确的全年一次性奖金' }
  }
  if (!Number.isFinite(gross) || gross < 0) {
    return { valid: false, message: '并入综合所得需填写月薪，以便测算全年税负' }
  }
  const yearIncome = gross * 12 + bonus
  const yearDeduction = MONTHLY_DEDUCTION * 12 + insurance * 12 + additional * 12 + additionalOnce
  const yearTaxable = Math.max(0, yearIncome - yearDeduction)
  const withBonus = taxByTable(yearTaxable, ANNUAL_BRACKETS)
  const withoutBonus = taxByTable(Math.max(0, gross * 12 - yearDeduction), ANNUAL_BRACKETS)
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
  ADDITIONAL_STANDARDS,
  DEFAULT_ADDITIONAL_SELECTION,
  formatMoney,
  formatPercent,
  formatRateText,
  clampRate,
  calculateInsurance,
  calculateAdditionalDeduction,
  additionalFieldView,
  calculateMonthlySalaryTax,
  calculateAnnualBonusSeparate,
  calculateAnnualBonusMerged,
  compareBonusMethods
}
