/**
 * 房贷计算工具
 * 支持：公积金贷 / 商贷 / 组合贷 / 已有贷款剩余计划
 * 还款方式：等额本息 / 等额本金
 */

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function round4(n) {
  return Math.round((n + Number.EPSILON) * 10000) / 10000
}

function formatMoney(n) {
  return round2(n).toFixed(2)
}

function formatMoneyWithComma(n) {
  const fixed = formatMoney(n)
  const [intPart, decimal] = fixed.split('.')
  const withComma = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${withComma}.${decimal}`
}

function emptyLoanResult() {
  return {
    principal: 0,
    months: 0,
    monthlyRate: 0,
    firstMonthPayment: 0,
    lastMonthPayment: 0,
    totalPayment: 0,
    totalInterest: 0,
    schedule: []
  }
}

/**
 * 按「元 + 期数」计算单笔贷款
 */
function calculateLoanByYuan(principalYuan, months, annualRatePercent, method) {
  const principal = round2(toNumber(principalYuan))
  const totalMonths = Math.max(0, Math.round(toNumber(months)))
  const monthlyRate = toNumber(annualRatePercent) / 100 / 12

  if (principal <= 0 || totalMonths <= 0) {
    return emptyLoanResult()
  }

  const schedule = []
  let remaining = principal
  let totalPayment = 0
  let totalInterest = 0

  if (method === 'equalPrincipal') {
    const monthlyPrincipal = principal / totalMonths

    for (let i = 1; i <= totalMonths; i += 1) {
      const interest = remaining * monthlyRate
      const principalPart = i === totalMonths ? remaining : monthlyPrincipal
      const payment = principalPart + interest

      remaining = Math.max(0, remaining - principalPart)
      totalPayment += payment
      totalInterest += interest

      schedule.push({
        month: i,
        payment: round2(payment),
        principal: round2(principalPart),
        interest: round2(interest),
        remaining: round2(remaining)
      })
    }
  } else {
    let monthlyPayment
    if (monthlyRate === 0) {
      monthlyPayment = principal / totalMonths
    } else {
      const factor = Math.pow(1 + monthlyRate, totalMonths)
      monthlyPayment = (principal * monthlyRate * factor) / (factor - 1)
    }

    for (let i = 1; i <= totalMonths; i += 1) {
      const interest = remaining * monthlyRate
      let principalPart = monthlyPayment - interest
      let payment = monthlyPayment

      if (i === totalMonths) {
        principalPart = remaining
        payment = principalPart + interest
      }

      remaining = Math.max(0, remaining - principalPart)
      totalPayment += payment
      totalInterest += interest

      schedule.push({
        month: i,
        payment: round2(payment),
        principal: round2(principalPart),
        interest: round2(interest),
        remaining: round2(remaining)
      })
    }
  }

  return {
    principal: round2(principal),
    months: totalMonths,
    monthlyRate,
    firstMonthPayment: schedule[0] ? schedule[0].payment : 0,
    lastMonthPayment: schedule.length ? schedule[schedule.length - 1].payment : 0,
    totalPayment: round2(totalPayment),
    totalInterest: round2(totalInterest),
    schedule
  }
}

/**
 * 单笔贷款计算（金额单位：万元，年限：年）
 */
function calculateLoan(principalWan, years, annualRatePercent, method) {
  return calculateLoanByYuan(
    toNumber(principalWan) * 10000,
    toNumber(years) * 12,
    annualRatePercent,
    method
  )
}

function mergeSchedules(left, right) {
  const len = Math.max(left.length, right.length)
  const schedule = []

  for (let i = 0; i < len; i += 1) {
    const a = left[i] || { payment: 0, principal: 0, interest: 0, remaining: 0 }
    const b = right[i] || { payment: 0, principal: 0, interest: 0, remaining: 0 }
    schedule.push({
      month: i + 1,
      payment: round2(a.payment + b.payment),
      principal: round2(a.principal + b.principal),
      interest: round2(a.interest + b.interest),
      remaining: round2(a.remaining + b.remaining)
    })
  }

  return schedule
}

function buildMortgageResult({
  mode,
  loanType,
  method,
  commercial,
  provident,
  schedule,
  extra = {}
}) {
  const totalPrincipal = round2(commercial.principal + provident.principal)
  const totalInterest = round2(commercial.totalInterest + provident.totalInterest)
  const totalPayment = round2(commercial.totalPayment + provident.totalPayment)
  const months = Math.max(commercial.months, provident.months)
  const firstMonthPayment = schedule[0] ? schedule[0].payment : 0
  const lastMonthPayment = schedule.length ? schedule[schedule.length - 1].payment : 0
  const principalRatio = totalPayment > 0 ? (totalPrincipal / totalPayment) * 100 : 0
  const interestRatio = totalPayment > 0 ? (totalInterest / totalPayment) * 100 : 0

  return {
    mode: mode || 'new',
    loanType,
    method,
    commercial,
    provident,
    months,
    totalPrincipal,
    totalInterest,
    totalPayment,
    firstMonthPayment: round2(firstMonthPayment),
    lastMonthPayment: round2(lastMonthPayment),
    principalRatio: round2(principalRatio),
    interestRatio: round2(interestRatio),
    schedule,
    ...extra,
    display: {
      totalPrincipal: formatMoneyWithComma(totalPrincipal),
      totalInterest: formatMoneyWithComma(totalInterest),
      totalPayment: formatMoneyWithComma(totalPayment),
      firstMonthPayment: formatMoneyWithComma(firstMonthPayment),
      lastMonthPayment: formatMoneyWithComma(lastMonthPayment),
      monthlyDecrease:
        method === 'equalPrincipal' && schedule.length > 1
          ? formatMoneyWithComma(schedule[0].payment - schedule[1].payment)
          : '0.00',
      ...(extra.display || {})
    }
  }
}

/**
 * 新贷款统一入口
 */
function calculateMortgage(options) {
  const method = options.method === 'equalPrincipal' ? 'equalPrincipal' : 'equalInterest'
  const loanType = options.loanType || 'commercial'

  let commercial = emptyLoanResult()
  let provident = emptyLoanResult()

  if (loanType === 'commercial' || loanType === 'combo') {
    commercial = calculateLoan(
      options.commercialAmount,
      options.commercialYears,
      options.commercialRate,
      method
    )
  }

  if (loanType === 'provident' || loanType === 'combo') {
    provident = calculateLoan(
      options.providentAmount,
      options.providentYears,
      options.providentRate,
      method
    )
  }

  const schedule =
    loanType === 'combo'
      ? mergeSchedules(commercial.schedule, provident.schedule)
      : loanType === 'provident'
        ? provident.schedule
        : commercial.schedule

  return buildMortgageResult({
    mode: 'new',
    loanType,
    method,
    commercial,
    provident,
    schedule
  })
}

function parseYearMonth(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const parts = dateStr.split('-').map((item) => Number(item))
  if (parts.length < 2) return null
  const [year, month] = parts
  if (!year || !month || month < 1 || month > 12) return null
  return { year, month }
}

/**
 * 首次还款月到当前月（含当月）已还期数
 */
function countPaidMonths(firstRepaymentDate, now = new Date()) {
  const start = parseYearMonth(firstRepaymentDate)
  if (!start) return -1

  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1
  return (nowYear - start.year) * 12 + (nowMonth - start.month) + 1
}

/**
 * 根据当月本金/利息/剩余本金等，反推执行利率与剩余年限
 * 约定：剩余本金 = 还完当月本金后的余额
 * 因此期初本金 = 剩余本金 + 当月还款本金，月利率 = 当月利息 / 期初本金
 */
function deriveRemainingLoanInfo(options, now = new Date()) {
  const originalYears = toNumber(options.originalYears)
  const monthPrincipal = toNumber(options.monthPrincipal)
  const monthInterest = toNumber(options.monthInterest)
  const remainingPrincipal = toNumber(options.remainingPrincipal)
  const firstRepaymentDate = options.firstRepaymentDate

  if (!(originalYears >= 1 && originalYears <= 30) || !Number.isInteger(originalYears)) {
    return { ok: false, message: '首次贷款期限请填 1-30 的整数' }
  }

  if (!parseYearMonth(firstRepaymentDate)) {
    return { ok: false, message: '请选择首次还款日期' }
  }

  if (!(monthPrincipal > 0)) {
    return { ok: false, message: '请填写当月还款本金' }
  }

  if (!(monthInterest >= 0)) {
    return { ok: false, message: '请填写当月还款利息' }
  }

  if (!(remainingPrincipal > 0)) {
    return { ok: false, message: '请填写剩余本金' }
  }

  const beginPrincipal = remainingPrincipal + monthPrincipal
  const monthlyRate = monthInterest / beginPrincipal
  const annualRatePercent = monthlyRate * 12 * 100

  const totalMonths = Math.round(originalYears * 12)
  const paidMonths = countPaidMonths(firstRepaymentDate, now)

  if (paidMonths < 1) {
    return { ok: false, message: '首次还款日期不能晚于当前月份' }
  }

  if (paidMonths > totalMonths) {
    return { ok: false, message: '已超过原贷款总期数，请检查输入' }
  }

  const remainingMonthsRaw = totalMonths - paidMonths
  if (remainingMonthsRaw <= 0) {
    return { ok: false, message: '贷款已还清或无剩余期数' }
  }

  // 年份保留两位小数，再反推期数，保证展示与重算一致
  const remainingYears = round2(remainingMonthsRaw / 12)
  const remainingMonths = Math.round(remainingYears * 12)

  if (remainingMonths <= 0) {
    return { ok: false, message: '贷款已还清或无剩余期数' }
  }

  return {
    ok: true,
    originalYears,
    firstRepaymentDate,
    monthPrincipal: round2(monthPrincipal),
    monthInterest: round2(monthInterest),
    remainingPrincipal: round2(remainingPrincipal),
    beginPrincipal: round2(beginPrincipal),
    monthlyRate,
    annualRatePercent,
    annualRateDisplay: round4(annualRatePercent).toFixed(4),
    totalMonths,
    paidMonths,
    remainingMonths,
    remainingMonthsRaw,
    remainingYears,
    remainingYearsDisplay: remainingYears.toFixed(2),
    remainingYearsText: `${remainingYears.toFixed(2)}年`
  }
}

/**
 * 已有贷款：反推利率/剩余年限后，按剩余本金重算还款计划
 */
function calculateRemainingMortgage(options) {
  const method = options.method === 'equalPrincipal' ? 'equalPrincipal' : 'equalInterest'
  const derived = deriveRemainingLoanInfo(options)

  if (!derived.ok) {
    return { ok: false, message: derived.message }
  }

  const loan = calculateLoanByYuan(
    derived.remainingPrincipal,
    derived.remainingMonths,
    derived.annualRatePercent,
    method
  )

  const result = buildMortgageResult({
    mode: 'remaining',
    loanType: 'remaining',
    method,
    commercial: loan,
    provident: emptyLoanResult(),
    schedule: loan.schedule,
    extra: {
      derived,
      display: {
        annualRate: derived.annualRateDisplay,
        remainingYears: derived.remainingYearsDisplay,
        remainingYearsText: derived.remainingYearsText,
        paidMonths: String(derived.paidMonths),
        remainingMonths: String(derived.remainingMonths)
      }
    }
  })

  return { ok: true, result }
}

module.exports = {
  calculateMortgage,
  calculateRemainingMortgage,
  deriveRemainingLoanInfo,
  calculateLoan,
  calculateLoanByYuan,
  formatMoney,
  formatMoneyWithComma,
  round2,
  round4
}
