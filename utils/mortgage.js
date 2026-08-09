/**
 * 房贷计算工具
 * 支持：公积金贷 / 商贷 / 组合贷
 * 还款方式：等额本息 / 等额本金
 */

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
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

/**
 * 单笔贷款计算
 * @param {number} principalWan 贷款本金（万元）
 * @param {number} years 贷款年限
 * @param {number} annualRatePercent 年利率（%）
 * @param {'equalInterest'|'equalPrincipal'} method 还款方式
 */
function calculateLoan(principalWan, years, annualRatePercent, method) {
  const principal = round2(toNumber(principalWan) * 10000)
  const months = Math.max(0, Math.round(toNumber(years) * 12))
  const monthlyRate = toNumber(annualRatePercent) / 100 / 12

  if (principal <= 0 || months <= 0) {
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

  const schedule = []
  let remaining = principal
  let totalPayment = 0
  let totalInterest = 0

  if (method === 'equalPrincipal') {
    const monthlyPrincipal = principal / months

    for (let i = 1; i <= months; i += 1) {
      const interest = remaining * monthlyRate
      const principalPart = i === months ? remaining : monthlyPrincipal
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
    // 等额本息
    let monthlyPayment
    if (monthlyRate === 0) {
      monthlyPayment = principal / months
    } else {
      const factor = Math.pow(1 + monthlyRate, months)
      monthlyPayment = (principal * monthlyRate * factor) / (factor - 1)
    }

    for (let i = 1; i <= months; i += 1) {
      const interest = remaining * monthlyRate
      let principalPart = monthlyPayment - interest
      let payment = monthlyPayment

      if (i === months) {
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
    months,
    monthlyRate,
    firstMonthPayment: schedule[0] ? schedule[0].payment : 0,
    lastMonthPayment: schedule.length ? schedule[schedule.length - 1].payment : 0,
    totalPayment: round2(totalPayment),
    totalInterest: round2(totalInterest),
    schedule
  }
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

/**
 * 统一入口
 * @param {object} options
 * @param {'provident'|'commercial'|'combo'} options.loanType
 * @param {'equalInterest'|'equalPrincipal'} options.method
 * @param {number} options.commercialAmount 商贷金额（万元）
 * @param {number} options.commercialYears
 * @param {number} options.commercialRate
 * @param {number} options.providentAmount 公积金金额（万元）
 * @param {number} options.providentYears
 * @param {number} options.providentRate
 */
function calculateMortgage(options) {
  const method = options.method === 'equalPrincipal' ? 'equalPrincipal' : 'equalInterest'
  const loanType = options.loanType || 'commercial'

  let commercial = calculateLoan(0, 0, 0, method)
  let provident = calculateLoan(0, 0, 0, method)

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

  const totalPrincipal = round2(commercial.principal + provident.principal)
  const totalInterest = round2(commercial.totalInterest + provident.totalInterest)
  const totalPayment = round2(commercial.totalPayment + provident.totalPayment)
  const months = Math.max(commercial.months, provident.months)
  const firstMonthPayment = schedule[0] ? schedule[0].payment : 0
  const lastMonthPayment = schedule.length ? schedule[schedule.length - 1].payment : 0

  const principalRatio = totalPayment > 0 ? (totalPrincipal / totalPayment) * 100 : 0
  const interestRatio = totalPayment > 0 ? (totalInterest / totalPayment) * 100 : 0

  return {
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
    display: {
      totalPrincipal: formatMoneyWithComma(totalPrincipal),
      totalInterest: formatMoneyWithComma(totalInterest),
      totalPayment: formatMoneyWithComma(totalPayment),
      firstMonthPayment: formatMoneyWithComma(firstMonthPayment),
      lastMonthPayment: formatMoneyWithComma(lastMonthPayment),
      monthlyDecrease:
        method === 'equalPrincipal' && schedule.length > 1
          ? formatMoneyWithComma(schedule[0].payment - schedule[1].payment)
          : '0.00'
    }
  }
}

module.exports = {
  calculateMortgage,
  calculateLoan,
  formatMoney,
  formatMoneyWithComma,
  round2
}
