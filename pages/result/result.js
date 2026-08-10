const { formatMoneyWithComma } = require('../../utils/mortgage')
const { renderPie } = require('../../utils/pie')

const LOAN_TYPE_LABEL = {
  provident: '公积金贷',
  commercial: '商贷',
  combo: '组合贷款',
  remaining: '已有贷款 · 剩余计划'
}

const METHOD_LABEL = {
  equalInterest: '等额本息',
  equalPrincipal: '等额本金'
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

Page({
  data: {
    ready: false,
    mode: 'new',
    isRemaining: false,
    loanType: '',
    method: '',
    loanTypeLabel: '',
    methodLabel: '',
    display: {},
    months: 0,
    commercialFirst: '0.00',
    providentFirst: '0.00',
    showAllSchedule: false,
    visibleSchedule: [],
    fullSchedule: []
  },

  onLoad() {
    const result = wx.getStorageSync('mortgageResult')
    if (!result || !result.totalPrincipal) {
      this.setData({ ready: false })
      return
    }

    const fullSchedule = decorateSchedule(result.schedule)
    const previewCount = 12
    const isRemaining = result.mode === 'remaining' || result.loanType === 'remaining'

    this.pieData = {
      principal: result.totalPrincipal,
      interest: result.totalInterest
    }

    this.setData({
      ready: true,
      mode: result.mode || 'new',
      isRemaining,
      loanType: result.loanType,
      method: result.method,
      loanTypeLabel: LOAN_TYPE_LABEL[result.loanType] || '',
      methodLabel: METHOD_LABEL[result.method] || '',
      display: result.display,
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

  onRecalculate() {
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({ url: '/pages/index/index' })
      }
    })
  }
})
