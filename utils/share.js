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

/**
 * 压缩计算结果摘要，供分享打开后回显
 */
function encodeResultShareQuery(view) {
  const snap = {
    v: 1,
    lt: view.loanTypeLabel || '',
    ml: view.methodLabel || '',
    pl: view.paymentLabel || '',
    sp: view.summaryPayment || '',
    mo: Number(view.months) || 0,
    ir: view.isRemaining ? 1 : 0,
    ie: view.isEarlyRepayment ? 1 : 0,
    if: view.isFullPrepay ? 1 : 0,
    ip: view.isPartialPrepay ? 1 : 0,
    tp: (view.display && view.display.totalPrincipal) || '',
    ti: (view.display && view.display.totalInterest) || '',
    tt: (view.display && view.display.totalPayment) || '',
    ar: (view.display && view.display.annualRate) || '',
    ry: (view.display && view.display.remainingYears) || '',
    md: (view.display && view.display.monthlyDecrease) || '',
    ea: (view.earlyInfo && view.earlyInfo.prepayAmount) || '',
    es: (view.earlyInfo && view.earlyInfo.interestSaved) || '',
    ey: (view.earlyInfo && view.earlyInfo.afterYears) || '',
    pc: Number(view.piePrincipal) || 0,
    pi: Number(view.pieInterest) || 0
  }

  try {
    return `s=${encodeURIComponent(JSON.stringify(snap))}`
  } catch (e) {
    return ''
  }
}

function parseResultShareQuery(query) {
  if (!query || !query.s) return null
  try {
    const snap = JSON.parse(decodeURIComponent(query.s))
    if (!snap || snap.v !== 1) return null
    return {
      fromShare: true,
      loanTypeLabel: snap.lt || '计算结果',
      methodLabel: snap.ml || '',
      paymentLabel: snap.pl || '每月还款',
      summaryPayment: snap.sp || '0.00',
      months: Number(snap.mo) || 0,
      isRemaining: !!snap.ir,
      isEarlyRepayment: !!snap.ie,
      isFullPrepay: !!snap.if,
      isPartialPrepay: !!snap.ip,
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
        typeLabel: '',
        adjustLabel: '',
        afterMonths: '',
        nextRepaymentDate: ''
      },
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
    content: '请点击右上角「···」，选择「分享到朋友圈」',
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
  tipShareTimeline
}
