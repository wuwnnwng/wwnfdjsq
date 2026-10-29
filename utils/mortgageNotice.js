const TEMPLATE_ID = 'B1PjfE9EqEsrXxuTov1BiA5zD1rV2KSKx0LKIm2a-cs'

function requestMortgageSubscribe() {
  return new Promise((resolve) => {
    if (!wx.requestSubscribeMessage) {
      resolve(false)
      return
    }
    let accepted = false
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve(accepted)
    }
    try {
      wx.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID],
        success(res) {
          accepted = !!(res && res[TEMPLATE_ID] === 'accept')
        },
        complete: done
      })
    } catch (e) {
      done()
    }
  })
}

function miniprogramState() {
  try {
    const env = wx.getAccountInfoSync().miniProgram.envVersion
    if (env === 'develop') return 'developer'
    if (env === 'trial') return 'trial'
  } catch (e) {}
  return 'formal'
}

function addQuery(params, key, value) {
  const text = String(value == null ? '' : value).trim()
  if (!text) return
  params.push(`${key}=${encodeURIComponent(text)}`)
}

function buildNoticePage(shareInput) {
  if (!shareInput || typeof shareInput !== 'object') return ''
  const params = []
  if (shareInput.mode === 'remaining') {
    addQuery(params, 'w', 'r')
    addQuery(params, 'h', shareInput.method)
    addQuery(params, 'oy', shareInput.originalYears)
    addQuery(params, 'fd', shareInput.firstRepaymentDate)
    addQuery(params, 'ar', shareInput.manualAnnualRate)
    addQuery(params, 'mp', shareInput.monthPrincipal)
    addQuery(params, 'mi', shareInput.monthInterest)
    addQuery(params, 'rp', shareInput.remainingPrincipal)
    if (shareInput.earlyRepayment) addQuery(params, 'er', '1')
    addQuery(params, 'pt', shareInput.prepayType)
    addQuery(params, 'paw', shareInput.prepayAmountWan)
    addQuery(params, 'am', shareInput.adjustMode)
  } else if (shareInput.mode === 'new') {
    addQuery(params, 'w', 'n')
    addQuery(params, 't', shareInput.loanType)
    addQuery(params, 'h', shareInput.method)
    addQuery(params, 'ca', shareInput.commercialAmount)
    addQuery(params, 'cy', shareInput.commercialYears)
    addQuery(params, 'cr', shareInput.commercialRate)
    addQuery(params, 'pa', shareInput.providentAmount)
    addQuery(params, 'py', shareInput.providentYears)
    addQuery(params, 'pr', shareInput.providentRate)
    addQuery(params, 'vd', shareInput.valueDate)
  } else {
    return ''
  }
  const page = `pages/result/result?${params.join('&')}`
  return page.length > 900 ? '' : page
}

function queryText(query, key) {
  const value = query && query[key]
  return String(value == null ? '' : value).trim().slice(0, 32)
}

function parseNoticePageQuery(query) {
  if (!query || (query.w !== 'n' && query.w !== 'r')) return null
  if (query.w === 'r') {
    return {
      mode: 'remaining',
      method: queryText(query, 'h'),
      originalYears: queryText(query, 'oy'),
      firstRepaymentDate: queryText(query, 'fd'),
      manualAnnualRate: queryText(query, 'ar'),
      monthPrincipal: queryText(query, 'mp'),
      monthInterest: queryText(query, 'mi'),
      remainingPrincipal: queryText(query, 'rp'),
      earlyRepayment: query.er === '1' || query.er === 1,
      prepayType: queryText(query, 'pt') || 'full',
      prepayAmountWan: queryText(query, 'paw'),
      adjustMode: queryText(query, 'am') || 'shorten'
    }
  }
  return {
    mode: 'new',
    loanType: queryText(query, 't'),
    method: queryText(query, 'h'),
    commercialAmount: queryText(query, 'ca'),
    commercialYears: queryText(query, 'cy'),
    commercialRate: queryText(query, 'cr'),
    providentAmount: queryText(query, 'pa'),
    providentYears: queryText(query, 'py'),
    providentRate: queryText(query, 'pr'),
    valueDate: queryText(query, 'vd')
  }
}

function todayText(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function addMonthsDate(dateStr, monthsToAdd) {
  const parts = String(dateStr || '').split('-').map((item) => Number(item))
  if (!parts[0] || !parts[1]) return ''
  const day = parts[2] || 1
  const base = new Date(parts[0], parts[1] - 1 + Number(monthsToAdd || 0), 1)
  const maxDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  const safeDay = Math.min(day, maxDay)
  const month = String(base.getMonth() + 1).padStart(2, '0')
  return `${base.getFullYear()}-${month}-${String(safeDay).padStart(2, '0')}`
}

function firstRepayDate(result) {
  const input = (result && result.shareInput) || {}
  if (input.mode === 'remaining' && input.firstRepaymentDate) {
    const paid = result.derived && Number(result.derived.paidMonths)
    return addMonthsDate(input.firstRepaymentDate, paid >= 0 ? paid : 0)
  }
  if (input.valueDate) return addMonthsDate(input.valueDate, 1)
  return addMonthsDate(todayText(), 1)
}

function scheduleRemindRows(result) {
  const start = firstRepayDate(result)
  if (!start) return []
  return ((result && result.schedule) || []).map((item, index) => ({
    month: Number(item.month),
    repayDate: addMonthsDate(start, index),
    payment: item.payment
  })).filter((row) => row.month && row.repayDate)
}

function upcomingRemindRow(result) {
  const rows = scheduleRemindRows(result)
  const today = todayText()
  return rows.find((row) => row.repayDate >= today) || rows[0] || null
}

function callMortgageNotice(data) {
  if (!wx.cloud) return Promise.resolve(null)
  return wx.cloud.callFunction({
    name: 'mortgageNotice',
    data
  }).then((res) => (res && res.result) || null).catch((err) => {
    console.error('mortgageNotice', err)
    return null
  })
}

function ensureMortgageRemind(result) {
  const page = buildNoticePage(result && result.shareInput)
  const item = upcomingRemindRow(result)
  if (!page || !item) return Promise.resolve(null)
  return callMortgageNotice({
    action: 'ensure',
    page,
    item,
    miniprogramState: miniprogramState()
  })
}

function toggleMortgageRemind(payload) {
  return callMortgageNotice(Object.assign({
    action: 'toggle',
    miniprogramState: miniprogramState()
  }, payload))
}

function finishMortgageResult(page, result) {
  page.goResult(result)
}

module.exports = {
  TEMPLATE_ID,
  buildNoticePage,
  parseNoticePageQuery,
  requestMortgageSubscribe,
  scheduleRemindRows,
  upcomingRemindRow,
  ensureMortgageRemind,
  toggleMortgageRemind,
  finishMortgageResult
}
