const { formatMoneyWithComma } = require('../../utils/mortgage')
const { renderPie } = require('../../utils/pie')
const {
  enableShareMenu,
  getShareAppMessage,
  getShareTimeline
} = require('../../utils/share')

const LOAN_TYPE_LABEL = {
  provident: '公积金贷',
  commercial: '商贷',
  combo: '组合贷款',
  remaining: '已有贷款 · 剩余计划'
}

const METHOD_LABEL = {
  equalInterest: '等额本息',
  equalPrincipal: '等额本金',
  interestFirst: '先息后本'
}

const PAYMENT_LABEL = {
  equalInterest: '每月还款',
  equalPrincipal: '首月还款',
  interestFirst: '每月利息'
}

const PREPAY_TYPE_LABEL = {
  full: '一次性提前还清',
  partial: '部分提前还款'
}

const ADJUST_MODE_LABEL = {
  shorten: '缩短年限，月供基本不变',
  reduce: '减少月供，年限不变'
}

function decorateSchedule(list) {
  return (list || []).map((item) => ({
    ...item,
    paymentText: formatMoneyWithComma(item.payment),
    principalText: formatMoneyWithComma(item.principal),
    interestText: formatMoneyWithComma(item.interest),
    remainingText: formatMoneyWithComma(item.remaining)
  }))
}

function roundYears(months) {
  const n = Number(months) || 0
  return (Math.round((n / 12) * 100) / 100).toFixed(2)
}

Page({
  data: {
    ready: false,
    mode: 'new',
    isRemaining: false,
    isEarlyRepayment: false,
    isFullPrepay: false,
    isPartialPrepay: false,
    isCombo: false,
    loanType: '',
    method: '',
    loanTypeLabel: '',
    methodLabel: '',
    paymentLabel: '每月还款',
    summaryPayment: '0.00',
    display: {},
    earlyInfo: {},
    months: 0,
    commercialFirst: '0.00',
    providentFirst: '0.00',
    showAllSchedule: false,
    visibleSchedule: [],
    fullSchedule: [],
    showSplitTip: false,
    splitDetail: {
      month: 0,
      providentPrincipal: '0.00',
      providentInterest: '0.00',
      commercialPrincipal: '0.00',
      commercialInterest: '0.00'
    }
  },

  onLoad() {
    enableShareMenu()

    const result = wx.getStorageSync('mortgageResult')
    if (!result || !result.totalPrincipal) {
      this.setData({ ready: false })
      return
    }

    const fullSchedule = decorateSchedule(result.schedule)
    const previewCount = 12
    const isRemaining = result.mode === 'remaining' || result.loanType === 'remaining'
    const isCombo = result.loanType === 'combo'
    const early = result.earlyRepayment || null
    const isEarlyRepayment = !!(early && early.enabled)
    const isFullPrepay = isEarlyRepayment && early.prepayType === 'full'
    const isPartialPrepay = isEarlyRepayment && early.prepayType === 'partial'

    let paymentLabel = PAYMENT_LABEL[result.method] || '每月还款'
    let summaryPayment = (result.display && result.display.firstMonthPayment) || '0.00'
    let loanTypeLabel = LOAN_TYPE_LABEL[result.loanType] || ''

    if (isFullPrepay) {
      loanTypeLabel = '已有贷款 · 提前还清'
      paymentLabel = '结清应还'
      summaryPayment = (result.display && result.display.firstMonthPayment) || '0.00'
    } else if (isPartialPrepay) {
      loanTypeLabel = '已有贷款 · 提前还款'
      paymentLabel = '调整后月供'
      summaryPayment =
        (result.display && result.display.afterMonthlyPayment) ||
        formatMoneyWithComma(early.afterFirstMonthPayment || 0)
    }

    this.pieData = {
      principal: result.totalPrincipal,
      interest: result.totalInterest
    }

    this.setData({
      ready: true,
      mode: result.mode || 'new',
      isRemaining,
      isEarlyRepayment,
      isFullPrepay,
      isPartialPrepay,
      isCombo,
      loanType: result.loanType,
      method: result.method,
      loanTypeLabel,
      methodLabel: METHOD_LABEL[result.method] || '',
      paymentLabel,
      summaryPayment,
      display: result.display,
      earlyInfo: isEarlyRepayment
        ? {
            typeLabel: PREPAY_TYPE_LABEL[early.prepayType] || '',
            adjustLabel: ADJUST_MODE_LABEL[early.adjustMode] || '',
            prepayAmount: formatMoneyWithComma(early.prepayAmountYuan || 0),
            interestSaved: formatMoneyWithComma(early.interestSaved || 0),
            afterMonths: String(early.afterMonths || 0),
            afterYears: roundYears(early.afterMonths || 0),
            nextRepaymentDate: early.nextRepaymentDate || ''
          }
        : {},
      months: result.months,
      commercialFirst: formatMoneyWithComma(
        (result.commercial && result.commercial.firstMonthPayment) || 0
      ),
      providentFirst: formatMoneyWithComma(
        (result.provident && result.provident.firstMonthPayment) || 0
      ),
      showAllSchedule: false,
      fullSchedule,
      visibleSchedule: fullSchedule.slice(0, previewCount)
    })
  },

  onShareAppMessage() {
    return getShareAppMessage()
  },

  onShareTimeline() {
    return getShareTimeline()
  },

  onReady() {
    if (!this.data.ready) return
    setTimeout(() => {
      renderPie(this, 'pieCanvas', this.pieData || {})
    }, 50)
  },

  onToggleSchedule() {
    const showAllSchedule = !this.data.showAllSchedule
    this.setData({
      showAllSchedule,
      visibleSchedule: showAllSchedule
        ? this.data.fullSchedule
        : this.data.fullSchedule.slice(0, 12)
    })
  },

  onInterestTap(e) {
    if (!this.data.isCombo) return

    const index = e.currentTarget.dataset.index
    const item = this.data.visibleSchedule[index]
    if (!item || !item.commercial || !item.provident) return

    this.setData({
      showSplitTip: true,
      splitDetail: {
        month: item.month,
        providentPrincipal: formatMoneyWithComma(item.provident.principal),
        providentInterest: formatMoneyWithComma(item.provident.interest),
        commercialPrincipal: formatMoneyWithComma(item.commercial.principal),
        commercialInterest: formatMoneyWithComma(item.commercial.interest)
      }
    })
  },

  onHideSplitTip() {
    this.setData({ showSplitTip: false })
  },

  preventMove() {},

  onRecalculate() {
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({ url: '/pages/index/index' })
      }
    })
  }
})
