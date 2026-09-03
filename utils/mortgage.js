/**
 * 房贷计算工具
 * 支持：公积金贷 / 商贷 / 组合贷 / 已有贷款剩余计划 / 提前还款测算
 * 还款方式：等额本息 / 等额本金 / 先息后本
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

const MIN_LOAN_YEARS = 1
const MAX_LOAN_YEARS = 40
const METHOD_LIST = ['equalInterest', 'equalPrincipal', 'interestFirst']

function isValidLoanYears(years) {
  const n = Number(years)
  return Number.isInteger(n) && n >= MIN_LOAN_YEARS && n <= MAX_LOAN_YEARS
}

function normalizeMethod(method) {
  return METHOD_LIST.indexOf(method) >= 0 ? method : 'equalInterest'
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

function pushScheduleItem(schedule, month, payment, principalPart, interest, remaining) {
  schedule.push({
    month,
    payment: round2(payment),
    principal: round2(principalPart),
    interest: round2(interest),
    remaining: round2(remaining)
  })
}

/**
 * 按「元 + 期数」计算单笔贷款 减少月供 年限不变
 */
function calculateLoanByYuan(principalYuan, months, annualRatePercent, method) {
  const principal = round2(toNumber(principalYuan))
  const totalMonths = Math.max(0, Math.round(toNumber(months)))
  const monthlyRate = toNumber(annualRatePercent) / 100 / 12
  const normalizedMethod = normalizeMethod(method)

  if (principal <= 0 || totalMonths <= 0) {
    return emptyLoanResult()
  }

  const schedule = []
  let remaining = principal
  let totalPayment = 0
  let totalInterest = 0

  if (normalizedMethod === 'equalPrincipal') {
    const monthlyPrincipal = principal / totalMonths

    for (let i = 1; i <= totalMonths; i += 1) {
      const interest = remaining * monthlyRate
      const principalPart = i === totalMonths ? remaining : monthlyPrincipal
      const payment = principalPart + interest

      remaining = Math.max(0, remaining - principalPart)
      totalPayment += payment
      totalInterest += interest
      pushScheduleItem(schedule, i, payment, principalPart, interest, remaining)
    }
  } else if (normalizedMethod === 'interestFirst') {
    // 先息后本：前期只还利息，到期一次还清本金
    for (let i = 1; i <= totalMonths; i += 1) {
      const interest = remaining * monthlyRate
      const principalPart = i === totalMonths ? remaining : 0
      const payment = principalPart + interest

      remaining = Math.max(0, remaining - principalPart)
      totalPayment += payment
      totalInterest += interest
      pushScheduleItem(schedule, i, payment, principalPart, interest, remaining)
    }
  } else {
    // 等额本息
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
      pushScheduleItem(schedule, i, payment, principalPart, interest, remaining)
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
      remaining: round2(a.remaining + b.remaining),
      commercial: {
        payment: round2(a.payment),
        principal: round2(a.principal),
        interest: round2(a.interest),
        remaining: round2(a.remaining)
      },
      provident: {
        payment: round2(b.payment),
        principal: round2(b.principal),
        interest: round2(b.interest),
        remaining: round2(b.remaining)
      }
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
  const method = normalizeMethod(options.method)
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

function parseDateParts(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const parts = dateStr.split('-').map((item) => Number(item))
  if (parts.length < 2) return null
  const [year, month, day = 1] = parts
  if (!year || !month || month < 1 || month > 12) return null
  const safeDay = day >= 1 && day <= 31 ? day : 1
  return { year, month, day: safeDay }
}

function formatDateParts(parts) {
  if (!parts) return ''
  const mm = String(parts.month).padStart(2, '0')
  const dd = String(parts.day).padStart(2, '0')
  return `${parts.year}-${mm}-${dd}`
}

function addMonthsToDate(dateStr, monthsToAdd) {
  const start = parseDateParts(dateStr)
  if (!start) return ''
  const base = new Date(Date.UTC(start.year, start.month - 1, 1))
  base.setUTCMonth(base.getUTCMonth() + monthsToAdd)
  const year = base.getUTCFullYear()
  const month = base.getUTCMonth() + 1
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const day = Math.min(start.day, maxDay)
  return formatDateParts({ year, month, day })
}

/**
 * 下次还款日 = 首次还款日 + 已还期数 个月
 */
function resolveNextRepaymentDate(firstRepaymentDate, paidMonths) {
  if (!(paidMonths >= 0)) return ''
  return addMonthsToDate(firstRepaymentDate, paidMonths)
}

/**
 * 已还期数（按年月差，不含“当月再 +1”）
 * 例：首次 2021-09，当前 2026-08
 * → (2026-2021)*12 + (8-9) = 59 期
 * → 剩余 360-59=301 期 → 25.08 年
 */
function countPaidMonths(firstRepaymentDate, now = new Date()) {
  const start = parseDateParts(firstRepaymentDate)
  if (!start) return -1

  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1
  return (nowYear - start.year) * 12 + (nowMonth - start.month)
}

/**
 * 根据最近一次还款本金/利息/剩余本金等，反推执行利率与剩余年限
 * 也可直接填写当前执行利率，跳过最近一期本金/利息
 * 约定：剩余本金 = 还完最近一次还款本金后的余额
 * 因此期初本金 = 剩余本金 + 最近一次还款本金，月利率 = 最近一次还款利息 / 期初本金
 */
function deriveRemainingLoanInfo(options, now = new Date()) {
  const method = normalizeMethod(options.method)
  const originalYears = toNumber(options.originalYears)
  const monthPrincipal = toNumber(options.monthPrincipal)
  const monthInterest = toNumber(options.monthInterest)
  const remainingPrincipal = toNumber(options.remainingPrincipal)
  const firstRepaymentDate = options.firstRepaymentDate
  const manualRateRaw = options.manualAnnualRate
  const hasManualRate =
    manualRateRaw !== undefined &&
    manualRateRaw !== null &&
    String(manualRateRaw).trim() !== ''
  const manualAnnualRate = toNumber(manualRateRaw)

  if (!isValidLoanYears(originalYears)) {
    return { ok: false, message: `首次贷款期限请填 ${MIN_LOAN_YEARS}-${MAX_LOAN_YEARS} 的整数` }
  }

  if (!parseDateParts(firstRepaymentDate)) {
    return { ok: false, message: '请选择首次还款日期' }
  }

  if (!(remainingPrincipal > 0)) {
    return { ok: false, message: '请填写剩余本金' }
  }

  let monthlyRate
  let annualRatePercent
  let beginPrincipal = remainingPrincipal

  if (hasManualRate) {
    if (!(manualAnnualRate >= 0)) {
      return { ok: false, message: '请填写有效的当前执行利率' }
    }
    annualRatePercent = manualAnnualRate
    monthlyRate = annualRatePercent / 100 / 12
  } else {
    // 先息后本每月通常不还本金，允许最近一次还款本金为 0
    if (method === 'interestFirst') {
      if (!(monthPrincipal >= 0)) {
        return { ok: false, message: '请填写最近一次还款本金' }
      }
    } else if (!(monthPrincipal > 0)) {
      return { ok: false, message: '请填写最近一次还款本金' }
    }

    if (!(monthInterest >= 0)) {
      return { ok: false, message: '请填写最近一次还款利息' }
    }

    beginPrincipal = remainingPrincipal + monthPrincipal
    monthlyRate = monthInterest / beginPrincipal
    annualRatePercent = monthlyRate * 12 * 100
  }

  const totalMonths = Math.round(originalYears * 12)
  const paidMonths = countPaidMonths(firstRepaymentDate, now)

  if (paidMonths < 0) {
    return { ok: false, message: '首次还款日期不能晚于当前日期' }
  }

  if (paidMonths > totalMonths) {
    return { ok: false, message: '已超过原贷款总期数，请检查输入' }
  }

  const remainingMonths = totalMonths - paidMonths
  if (remainingMonths <= 0) {
    return { ok: false, message: '贷款已还清或无剩余期数' }
  }

  // 年份仅用于页面展示；实际重算一律传剩余期数
  const remainingYearsDisplay = round2(remainingMonths / 12).toFixed(2)

  return {
    ok: true,
    originalYears,
    firstRepaymentDate,
    hasManualRate,
    monthPrincipal: hasManualRate ? 0 : round2(monthPrincipal),
    monthInterest: hasManualRate ? 0 : round2(monthInterest),
    remainingPrincipal: round2(remainingPrincipal),
    beginPrincipal: round2(beginPrincipal),
    monthlyRate,
    annualRatePercent,
    annualRateDisplay: round4(annualRatePercent).toFixed(4),
    totalMonths,
    paidMonths,
    remainingMonths,
    remainingYears: Number(remainingYearsDisplay),
    remainingYearsDisplay,
    remainingYearsText: `${remainingYearsDisplay}年`
  }
}

/**
 * 等额本息：固定月供反推所需期数
 */
function monthsNeededForEqualInterest(principal, monthlyPayment, monthlyRate) {
  const p = toNumber(principal)
  const m = toNumber(monthlyPayment)
  if (!(p > 0) || !(m > 0)) return 0

  if (monthlyRate <= 0) {
    return Math.max(1, Math.ceil(p / m))
  }

  const denom = m - p * monthlyRate
  if (denom <= 0) {
    // 月供不足以覆盖利息，无法缩短到有效期数
    return -1
  }

  const n = Math.log(m / denom) / Math.log(1 + monthlyRate)
  return Math.max(1, Math.ceil(n))
}

/**
 * 部分提前还款后：缩短年限（月供基本不变）
 */
function recalculateShortenTerm(newPrincipal, baseline, annualRatePercent, method) {
  const monthlyRate = toNumber(annualRatePercent) / 100 / 12
  let months

  if (method === 'equalPrincipal') {
    const monthlyPrincipal =
      baseline.months > 0 ? baseline.principal / baseline.months : 0
    if (!(monthlyPrincipal > 0)) {
      return { ok: false, message: '无法按原本金摊还额缩短年限' }
    }
    months = Math.max(1, Math.ceil(newPrincipal / monthlyPrincipal))
  } else if (method === 'interestFirst') {
    const ratio = baseline.principal > 0 ? newPrincipal / baseline.principal : 1
    months = Math.max(1, Math.ceil((baseline.months || 1) * ratio))
  } else {
    months = monthsNeededForEqualInterest(
      newPrincipal,
      baseline.firstMonthPayment,
      monthlyRate
    )
    if (months < 0) {
      return { ok: false, message: '提前还款后月供不足以覆盖利息，请改用减少月供' }
    }
  }

  return {
    ok: true,
    loan: calculateLoanByYuan(newPrincipal, months, annualRatePercent, method)
  }
}

/**
 * 一次性提前还清：当期利息 + 全部剩余本金，形成 1 期结清计划
 */
function buildFullPrepayLoan(remainingPrincipal, annualRatePercent) {
  const principal = round2(remainingPrincipal)
  const monthlyRate = toNumber(annualRatePercent) / 100 / 12
  const interest = round2(principal * monthlyRate)
  const payment = round2(principal + interest)
  const schedule = []
  pushScheduleItem(schedule, 1, payment, principal, interest, 0)

  return {
    principal,
    months: 1,
    monthlyRate,
    firstMonthPayment: payment,
    lastMonthPayment: payment,
    totalPayment: payment,
    totalInterest: interest,
    schedule
  }
}

function parseEarlyRepaymentOptions(options, remainingPrincipal) {
  const enabled = !!options.earlyRepayment
  if (!enabled) {
    return { ok: true, enabled: false }
  }

  const prepayType = options.prepayType === 'full' ? 'full' : 'partial'
  if (prepayType === 'full') {
    return {
      ok: true,
      enabled: true,
      prepayType: 'full',
      prepayAmountYuan: round2(remainingPrincipal),
      adjustMode: ''
    }
  }

  const prepayWanRaw = String(options.prepayAmountWan || '').trim()
  const prepayWan = Number(prepayWanRaw)
  if (!prepayWanRaw || !Number.isInteger(prepayWan) || prepayWan < 1) {
    return { ok: false, message: '部分还款金额请填正整数（万元）' }
  }

  const prepayAmountYuan = prepayWan * 10000
  if (prepayAmountYuan >= remainingPrincipal) {
    return {
      ok: false,
      message: '部分还款须小于剩余本金，否则请选一次性提前还清'
    }
  }

  const adjustMode = options.adjustMode === 'reduce' ? 'reduce' : 'shorten'
  return {
    ok: true,
    enabled: true,
    prepayType: 'partial',
    prepayAmountYuan,
    prepayAmountWan: prepayWan,
    adjustMode
  }
}

/**
 * 已有贷款：反推利率/剩余年限后，按剩余本金重算还款计划
 * 可选：提前还款测算（一次性还清 / 部分还款 + 缩短年限或减少月供）
 */
function calculateRemainingMortgage(options) {
  const method = normalizeMethod(options.method)
  const derived = deriveRemainingLoanInfo(options)

  if (!derived.ok) {
    return { ok: false, message: derived.message }
  }

  const baseline = calculateLoanByYuan(
    derived.remainingPrincipal,
    derived.remainingMonths,
    derived.annualRatePercent,
    method
  )

  const early = parseEarlyRepaymentOptions(options, derived.remainingPrincipal)
  if (!early.ok) {
    return { ok: false, message: early.message }
  }

  let loan = baseline
  let earlyInfo = null
  const nextRepaymentDate = resolveNextRepaymentDate(
    derived.firstRepaymentDate,
    derived.paidMonths
  )

  // 是否提前还款
  if (early.enabled) {
    // 一次性结清
    if (early.prepayType === 'full') {
      loan = buildFullPrepayLoan(derived.remainingPrincipal, derived.annualRatePercent)
      earlyInfo = {
        enabled: true,
        prepayType: 'full',
        adjustMode: '',
        prepayAmountYuan: early.prepayAmountYuan,
        afterPrincipal: 0,
        afterMonths: 1,
        baselineInterest: baseline.totalInterest,
        interestSaved: round2(baseline.totalInterest - loan.totalInterest),
        nextRepaymentDate
      }
    } else {
      const afterPrincipal = round2(derived.remainingPrincipal - early.prepayAmountYuan)
      let afterLoan

      if (early.adjustMode === 'reduce') {
        afterLoan = calculateLoanByYuan(
          afterPrincipal,
          derived.remainingMonths,
          derived.annualRatePercent,
          method
        )
      } else {
        const shortened = recalculateShortenTerm(
          afterPrincipal,
          baseline,
          derived.annualRatePercent,
          method
        )
        if (!shortened.ok) {
          return { ok: false, message: shortened.message }
        }
        afterLoan = shortened.loan
      }

      // 还款计划：第 1 期为提前还款本金，其后为剩余贷款计划
      const schedule = []
      pushScheduleItem(schedule, 1, early.prepayAmountYuan, early.prepayAmountYuan, 0, afterPrincipal)
      afterLoan.schedule.forEach((item) => {
        schedule.push({
          ...item,
          month: item.month + 1
        })
      })

      const totalInterest = round2(afterLoan.totalInterest)
      const totalPayment = round2(early.prepayAmountYuan + afterLoan.totalPayment)
      // 等额本金每月递减：取调整后剩余计划相邻两期，勿用「提前还款当期」去减
      const afterMonthlyDecrease =
        method === 'equalPrincipal' && afterLoan.schedule.length > 1
          ? round2(afterLoan.schedule[0].payment - afterLoan.schedule[1].payment)
          : 0

      loan = {
        principal: derived.remainingPrincipal,
        months: schedule.length,
        monthlyRate: afterLoan.monthlyRate,
        firstMonthPayment: schedule[0].payment,
        lastMonthPayment: schedule[schedule.length - 1].payment,
        totalPayment,
        totalInterest,
        schedule,
        // 提前还款后的常规月供（第 2 期起），便于结果页展示
        afterFirstMonthPayment: afterLoan.firstMonthPayment,
        afterMonthlyDecrease
      }

      earlyInfo = {
        enabled: true,
        prepayType: 'partial',
        adjustMode: early.adjustMode,
        prepayAmountYuan: early.prepayAmountYuan,
        prepayAmountWan: early.prepayAmountWan,
        afterPrincipal,
        afterMonths: afterLoan.months,
        afterFirstMonthPayment: afterLoan.firstMonthPayment,
        afterMonthlyDecrease,
        baselineInterest: baseline.totalInterest,
        baselineMonths: baseline.months,
        baselineFirstMonthPayment: baseline.firstMonthPayment,
        interestSaved: round2(baseline.totalInterest - totalInterest),
        nextRepaymentDate
      }
    }
  }

  const remainingYearsDisplay = earlyInfo
    ? round2((earlyInfo.afterMonths || loan.months) / 12).toFixed(2)
    : derived.remainingYearsDisplay

  const displayExtra = {
    annualRate: derived.annualRateDisplay,
    remainingYears: remainingYearsDisplay,
    remainingYearsText: `${remainingYearsDisplay}年`,
    paidMonths: String(derived.paidMonths),
    remainingMonths: String(
      earlyInfo ? earlyInfo.afterMonths || loan.months : derived.remainingMonths
    ),
    earlyPrepayAmount: earlyInfo
      ? formatMoneyWithComma(earlyInfo.prepayAmountYuan)
      : '',
    interestSaved: earlyInfo ? formatMoneyWithComma(earlyInfo.interestSaved) : '',
    afterMonthlyPayment:
      earlyInfo && earlyInfo.prepayType === 'partial'
        ? formatMoneyWithComma(earlyInfo.afterFirstMonthPayment)
        : '',
    baselineMonthlyPayment: earlyInfo
      ? formatMoneyWithComma(
          earlyInfo.baselineFirstMonthPayment || baseline.firstMonthPayment
        )
      : ''
  }

  if (
    earlyInfo &&
    earlyInfo.prepayType === 'partial' &&
    method === 'equalPrincipal'
  ) {
    displayExtra.monthlyDecrease = formatMoneyWithComma(
      earlyInfo.afterMonthlyDecrease || 0
    )
  }

  const result = buildMortgageResult({
    mode: 'remaining',
    loanType: 'remaining',
    method,
    commercial: loan,
    provident: emptyLoanResult(),
    schedule: loan.schedule,
    extra: {
      derived,
      earlyRepayment: earlyInfo,
      display: displayExtra
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
  normalizeMethod,
  isValidLoanYears,
  MIN_LOAN_YEARS,
  MAX_LOAN_YEARS,
  METHOD_LIST,
  formatMoney,
  formatMoneyWithComma,
  round2,
  round4
}
