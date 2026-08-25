const {
  calculateMortgage,
  calculateRemainingMortgage
} = require('./mortgage')
const { getToolById } = require('./toolsConfig')

const APP_BRAND = '置居计算器'
const TOOLS_HUB_PATH = '/pages/tools/index'
const TOOLS_HUB_TITLE = `${APP_BRAND}｜更多实用工具`

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

function buildToolShareTitle(name) {
  return `${APP_BRAND}｜${name}`
}

function buildToolShareAppMessage(path, name) {
  return {
    title: buildToolShareTitle(name),
    path
  }
}

function buildToolShareTimeline(path, name) {
  const queryIndex = path.indexOf('?')
  return {
    title: buildToolShareTitle(name),
    query: queryIndex >= 0 ? path.slice(queryIndex + 1) : ''
  }
}

function getToolsHubShareAppMessage() {
  return buildToolShareAppMessage(TOOLS_HUB_PATH, '更多实用工具')
}

function getToolsHubShareTimeline() {
  return buildToolShareTimeline(TOOLS_HUB_PATH, '更多实用工具')
}

function getConverterToolShare(type) {
  const toolType = type || 'length'
  const tool = getToolById(toolType)
  const name = (tool && tool.name) || '单位换算'
  const path = `/pages/tools/converter/converter?type=${encodeURIComponent(toolType)}`
  return {
    appMessage: buildToolShareAppMessage(path, name),
    timeline: buildToolShareTimeline(path, name)
  }
}

function getCalcToolShare() {
  const path = '/pages/tools/calc/calc'
  return {
    appMessage: buildToolShareAppMessage(path, '算术计算器'),
    timeline: buildToolShareTimeline(path, '算术计算器')
  }
}

function getBaseToolShare() {
  const path = '/pages/tools/base/base'
  return {
    appMessage: buildToolShareAppMessage(path, '进制换算'),
    timeline: buildToolShareTimeline(path, '进制换算')
  }
}

function getCalendarToolShare() {
  const path = '/pages/tools/calendar/calendar'
  return {
    appMessage: buildToolShareAppMessage(path, '我的日历'),
    timeline: buildToolShareTimeline(path, '我的日历')
  }
}

function getWeatherToolShare() {
  const path = '/pages/tools/weather/weather'
  return {
    appMessage: buildToolShareAppMessage(path, '天气'),
    timeline: buildToolShareTimeline(path, '天气')
  }
}

function getTaxToolShare() {
  const path = '/pages/tools/tax/tax'
  return {
    appMessage: buildToolShareAppMessage(path, '工资个税'),
    timeline: buildToolShareTimeline(path, '工资个税')
  }
}

function getHouseTaxToolShare() {
  const path = '/pages/tools/housetax/housetax'
  return {
    appMessage: buildToolShareAppMessage(path, '房产交易税'),
    timeline: buildToolShareTimeline(path, '房产交易税')
  }
}

function getFitoutToolShare() {
  const path = '/pages/tools/fitout/fitout'
  return {
    appMessage: buildToolShareAppMessage(path, '装修材料'),
    timeline: buildToolShareTimeline(path, '装修材料')
  }
}

function getDatetimeToolShare() {
  const path = '/pages/tools/datetime/datetime'
  return {
    appMessage: buildToolShareAppMessage(path, '日期时间'),
    timeline: buildToolShareTimeline(path, '日期时间')
  }
}

function getQrcodeToolShare() {
  const path = '/pages/tools/qrcode/qrcode'
  return {
    appMessage: buildToolShareAppMessage(path, '二维码'),
    timeline: buildToolShareTimeline(path, '二维码')
  }
}

function getRmbToolShare() {
  const path = '/pages/tools/rmb/rmb'
  return {
    appMessage: buildToolShareAppMessage(path, '人民币大写'),
    timeline: buildToolShareTimeline(path, '人民币大写')
  }
}

function getPercentToolShare() {
  const path = '/pages/tools/percent/percent'
  return {
    appMessage: buildToolShareAppMessage(path, '百分比'),
    timeline: buildToolShareTimeline(path, '百分比')
  }
}

function getAgeToolShare() {
  const path = '/pages/tools/age/age'
  return {
    appMessage: buildToolShareAppMessage(path, '年龄'),
    timeline: buildToolShareTimeline(path, '年龄')
  }
}

function getBmiToolShare() {
  const path = '/pages/tools/bmi/bmi'
  return {
    appMessage: buildToolShareAppMessage(path, 'BMI体重'),
    timeline: buildToolShareTimeline(path, 'BMI体重')
  }
}

function getShareAppMessage() {
  return {
    title: `${APP_BRAND}｜公积金、商贷、组合贷一键算清`,
    path: '/pages/index/index'
  }
}

function getShareTimeline() {
  return {
    title: `${APP_BRAND}｜公积金、商贷、组合贷一键算清`,
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
  return '置居计算器｜查看我的计算结果'
}

/**
 * 压缩计算入参，分享打开后本地重算完整还款计划
 * 新贷款: {v:2,m:'n',...}
 * 已有贷款: {v:2,m:'r',...}
 */
function encodeShareInput(shareInput) {
  if (!shareInput || typeof shareInput !== 'object') return null
  try {
    let snap
    if (shareInput.mode === 'remaining') {
      snap = {
        v: 2,
        m: 'r',
        mt: shareInput.method || '',
        oy: shareInput.originalYears || '',
        fd: shareInput.firstRepaymentDate || '',
        ar: shareInput.manualAnnualRate || '',
        mp: shareInput.monthPrincipal || '',
        mi: shareInput.monthInterest || '',
        rp: shareInput.remainingPrincipal || '',
        er: shareInput.earlyRepayment ? 1 : 0,
        pt: shareInput.prepayType || 'full',
        paw: shareInput.prepayAmountWan || '',
        am: shareInput.adjustMode || 'shorten'
      }
    } else {
      snap = {
        v: 2,
        m: 'n',
        lt: shareInput.loanType || '',
        mt: shareInput.method || '',
        ca: shareInput.commercialAmount || '',
        cy: shareInput.commercialYears || '',
        cr: shareInput.commercialRate || '',
        pa: shareInput.providentAmount || '',
        py: shareInput.providentYears || '',
        pr: shareInput.providentRate || ''
      }
    }
    return `p=${encodeURIComponent(JSON.stringify(snap))}`
  } catch (e) {
    return null
  }
}

function parseShareInputQuery(query) {
  if (!query || !query.p) return null
  try {
    const snap = JSON.parse(decodeURIComponent(query.p))
    if (!snap || snap.v !== 2) return null
    if (snap.m === 'r') {
      return {
        mode: 'remaining',
        method: snap.mt || '',
        originalYears: snap.oy || '',
        firstRepaymentDate: snap.fd || '',
        manualAnnualRate: snap.ar || '',
        monthPrincipal: snap.mp || '',
        monthInterest: snap.mi || '',
        remainingPrincipal: snap.rp || '',
        earlyRepayment: !!snap.er,
        prepayType: snap.pt || 'full',
        prepayAmountWan: snap.paw || '',
        adjustMode: snap.am || 'shorten'
      }
    }
    return {
      mode: 'new',
      loanType: snap.lt || '',
      method: snap.mt || '',
      commercialAmount: snap.ca || '',
      commercialYears: snap.cy || '',
      commercialRate: snap.cr || '',
      providentAmount: snap.pa || '',
      providentYears: snap.py || '',
      providentRate: snap.pr || ''
    }
  } catch (e) {
    return null
  }
}

function rebuildResultFromShareInput(input) {
  if (!input || typeof input !== 'object') return null
  try {
    if (input.mode === 'remaining') {
      const { ok, result } = calculateRemainingMortgage({
        method: input.method,
        originalYears: input.originalYears,
        firstRepaymentDate: input.firstRepaymentDate,
        manualAnnualRate: input.manualAnnualRate,
        monthPrincipal: input.monthPrincipal,
        monthInterest: input.monthInterest,
        remainingPrincipal: input.remainingPrincipal,
        earlyRepayment: !!input.earlyRepayment,
        prepayType: input.prepayType || 'full',
        prepayAmountWan: input.prepayAmountWan || '',
        adjustMode: input.adjustMode || 'shorten'
      })
      if (!ok || !result) return null
      result.shareInput = input
      return result
    }
    const result = calculateMortgage({
      loanType: input.loanType,
      method: input.method,
      commercialAmount: input.commercialAmount,
      commercialYears: input.commercialYears,
      commercialRate: input.commercialRate,
      providentAmount: input.providentAmount,
      providentYears: input.providentYears,
      providentRate: input.providentRate
    })
    if (!result || !result.totalPrincipal) return null
    result.shareInput = input
    return result
  } catch (e) {
    return null
  }
}

/**
 * 旧版摘要分享（兼容已发出的链接）
 */
function encodeResultShareQuery(view) {
  const paramQuery = encodeShareInput(view && view.shareInput)
  if (paramQuery) return paramQuery

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
  getToolsHubShareAppMessage,
  getToolsHubShareTimeline,
  getConverterToolShare,
  getCalcToolShare,
  getBaseToolShare,
  getCalendarToolShare,
  getWeatherToolShare,
  getTaxToolShare,
  getHouseTaxToolShare,
  getFitoutToolShare,
  getDatetimeToolShare,
  getQrcodeToolShare,
  getRmbToolShare,
  getPercentToolShare,
  getAgeToolShare,
  getBmiToolShare,
  buildResultShareTitle,
  encodeShareInput,
  parseShareInputQuery,
  rebuildResultFromShareInput,
  encodeResultShareQuery,
  parseResultShareQuery,
  getResultShareAppMessage,
  getResultShareTimeline,
  tipShareTimeline
}
