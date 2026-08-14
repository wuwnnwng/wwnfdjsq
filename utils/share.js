/**
 * 开启右上角「转发好友 / 分享朋友圈」菜单
 */
function enableShareMenu() {
  if (!wx.showShareMenu) return
  wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  })
}

function getShareAppMessage() {
  return {
    title: '房贷计算器｜公积金、商贷、组合贷一键算清',
    path: '/pages/index/index'
  }
}

function getShareTimeline() {
  return {
    title: '房贷计算器｜公积金、商贷、组合贷一键算清',
    query: ''
  }
}

function round2(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round((x + Number.EPSILON) * 100) / 100
}

/**
 * 计算结果分享文案
 */
function buildResultShareTitle({
  loanTypeLabel,
  methodLabel,
  paymentLabel,
  summaryPayment
}) {
  const typePart = [loanTypeLabel, methodLabel].filter(Boolean).join('·')
  const payPart = [paymentLabel, summaryPayment ? `${summaryPayment} 元` : '']
    .filter(Boolean)
    .join(' ')
  if (typePart && payPart) return `${typePart}｜${payPart}`
  if (payPart) return `房贷计算结果｜${payPart}`
  return '房贷计算器｜查看我的计算结果'
}

function buildBaseSnap(view) {
  const early = view.earlyInfo || {}
  const display = view.display || {}
  return {
    v: 2,
    lt: view.loanTypeLabel || '',
    ml: view.methodLabel || '',
    pl: view.paymentLabel || '',
    sp: view.summaryPayment || '',
    mo: Number(view.months) || 0,
    ir: view.isRemaining ? 1 : 0,
    ie: view.isEarlyRepayment ? 1 : 0,
    if: view.isFullPrepay ? 1 : 0,
    ip: view.isPartialPrepay ? 1 : 0,
    tp: display.totalPrincipal || '',
    ti: display.totalInterest || '',
    tt: display.totalPayment || '',
    ar: display.annualRate || '',
    ry: display.remainingYears || '',
    md: display.monthlyDecrease || '',
    ea: early.prepayAmount || '',
    es: early.interestSaved || '',
    ey: early.afterYears || '',
    et: early.typeLabel || '',
    ej: early.adjustLabel || '',
    em: early.afterMonths || '',
    ed: early.nextRepaymentDate || '',
    pc: Number(view.piePrincipal) || 0,
    pi: Number(view.pieInterest) || 0,
    // sc: [[pay, principal, interest, remaining], ...]
    sc: [],
    st: 0
  }
}

function packSchedule(list, maxLen) {
  const rows = []
  let text = '[]'
  const source = Array.isArray(list) ? list : []

  for (let i = 0; i < source.length; i += 1) {
    const item = source[i] || {}
    const next = rows.concat([[
      round2(item.payment),
      round2(item.principal),
      round2(item.interest),
      round2(item.remaining)
    ]])
    const encoded = JSON.stringify(next)
    if (encoded.length > maxLen) break
    rows.push(next[next.length - 1])
    text = encoded
  }

  return {
    rows,
    truncated: rows.length < source.length,
    packedLen: text.length
  }
}

/**
 * 压缩计算结果（含提前还款说明 + 尽量完整的还款计划）
 * 分享 path 有长度限制，计划过长时自动截断并标记
 */
function encodeResultShareQuery(view) {
  try {
    const snap = buildBaseSnap(view)
    const baseLen = encodeURIComponent(JSON.stringify(snap)).length
    // path 总长约 1024，预留前缀与余量
    const budget = Math.max(200, 900 - baseLen)
    const packed = packSchedule(view.schedule || [], budget)
    snap.sc = packed.rows
    snap.st = packed.truncated ? 1 : 0

    const query = `s=${encodeURIComponent(JSON.stringify(snap))}`
    if (query.length > 980) {
      // 极端情况再砍计划
      snap.sc = packed.rows.slice(0, Math.max(1, Math.floor(packed.rows.length / 2)))
      snap.st = 1
      return `s=${encodeURIComponent(JSON.stringify(snap))}`
    }
    return query
  } catch (e) {
    return ''
  }
}

function unpackSchedule(sc) {
  if (!Array.isArray(sc)) return []
  return sc.map((row, index) => {
    const payment = round2(row && row[0])
    const principal = round2(row && row[1])
    const interest = round2(row && row[2])
    const remaining = round2(row && row[3])
    return {
      month: index + 1,
      payment,
      principal,
      interest,
      remaining
    }
  })
}

function parseResultShareQuery(query) {
  if (!query || !query.s) return null
  try {
    const snap = JSON.parse(decodeURIComponent(query.s))
    if (!snap || (snap.v !== 1 && snap.v !== 2)) return null
    const schedule = unpackSchedule(snap.sc)
    return {
      fromShare: true,
      loanTypeLabel: snap.lt || '计算结果',
      methodLabel: snap.ml || '',
      paymentLabel: snap.pl || '每月还款',
      summaryPayment: snap.sp || '0.00',
      months: Number(snap.mo) || schedule.length || 0,
      isRemaining: !!snap.ir,
      isEarlyRepayment: !!snap.ie,
      isFullPrepay: !!snap.if,
      isPartialPrepay: !!snap.ip,
      scheduleTruncated: !!snap.st,
      display: {
        totalPrincipal: snap.tp || '--',
        totalInterest: snap.ti || '--',
        totalPayment: snap.tt || '--',
        annualRate: snap.ar || '',
        remainingYears: snap.ry || '',
        monthlyDecrease: snap.md || ''
      },
      earlyInfo: {
        prepayAmount: snap.ea || '',
        interestSaved: snap.es || '',
        afterYears: snap.ey || '',
        typeLabel: snap.et || '',
        adjustLabel: snap.ej || '',
        afterMonths: snap.em || '',
        nextRepaymentDate: snap.ed || ''
      },
      schedule,
      piePrincipal: Number(snap.pc) || 0,
      pieInterest: Number(snap.pi) || 0
    }
  } catch (e) {
    return null
  }
}

function getResultShareAppMessage(view) {
  const query = encodeResultShareQuery(view)
  const path = query ? `/pages/result/result?${query}` : '/pages/index/index'
  return {
    title: buildResultShareTitle(view),
    path
  }
}

function getResultShareTimeline(view) {
  return {
    title: buildResultShareTitle(view),
    query: encodeResultShareQuery(view)
  }
}

function tipShareTimeline() {
  wx.showModal({
    title: '分享到朋友圈',
    content: '请点击右上角「···」，选择「分享到朋友圈」。完整还款计划会尽量带上；若期数较多，可用「分享完整长图」。',
    showCancel: false,
    confirmText: '知道了'
  })
}

module.exports = {
  enableShareMenu,
  getShareAppMessage,
  getShareTimeline,
  buildResultShareTitle,
  encodeResultShareQuery,
  parseResultShareQuery,
  getResultShareAppMessage,
  getResultShareTimeline,
  tipShareTimeline,
  round2
}
