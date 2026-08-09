const { calculateMortgage } = require('../../utils/mortgage')

Page({
  data: {
    loanType: 'combo',
    method: 'equalInterest',
    showCommercial: true,
    showProvident: true,

    commercialAmount: '100',
    commercialYears: 30,
    commercialRate: '3.45',

    providentAmount: '50',
    providentYears: 30,
    providentRate: '2.85'
  },

  onLoanTypeChange(e) {
    const loanType = e.currentTarget.dataset.type
    this.setData({
      loanType,
      showCommercial: loanType === 'commercial' || loanType === 'combo',
      showProvident: loanType === 'provident' || loanType === 'combo'
    })
  },

  onMethodChange(e) {
    this.setData({
      method: e.currentTarget.dataset.method
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [field]: e.detail.value
    })
  },

  onSliderChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [field]: e.detail.value
    })
  },

  validate() {
    const {
      loanType,
      commercialAmount,
      commercialRate,
      providentAmount,
      providentRate
    } = this.data

    const needCommercial = loanType === 'commercial' || loanType === 'combo'
    const needProvident = loanType === 'provident' || loanType === 'combo'

    if (needCommercial) {
      if (!(Number(commercialAmount) > 0)) {
        wx.showToast({ title: '请填写商贷金额', icon: 'none' })
        return false
      }
      if (!(Number(commercialRate) >= 0)) {
        wx.showToast({ title: '请填写商贷利率', icon: 'none' })
        return false
      }
    }

    if (needProvident) {
      if (!(Number(providentAmount) > 0)) {
        wx.showToast({ title: '请填写公积金金额', icon: 'none' })
        return false
      }
      if (!(Number(providentRate) >= 0)) {
        wx.showToast({ title: '请填写公积金利率', icon: 'none' })
        return false
      }
    }

    return true
  },

  onCalculate() {
    if (!this.validate()) return

    const {
      loanType,
      method,
      commercialAmount,
      commercialYears,
      commercialRate,
      providentAmount,
      providentYears,
      providentRate
    } = this.data

    const result = calculateMortgage({
      loanType,
      method,
      commercialAmount,
      commercialYears,
      commercialRate,
      providentAmount,
      providentYears,
      providentRate
    })

    if (result.totalPrincipal <= 0) {
      wx.showToast({ title: '请输入有效贷款金额', icon: 'none' })
      return
    }

    // 还款计划可能很长，用本地缓存传递，避免 URL 过长
    wx.setStorageSync('mortgageResult', {
      ...result,
      // schedule 单独存，结果页按需读取
    })

    wx.navigateTo({
      url: '/pages/result/result'
    })
  }
})
