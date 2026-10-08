const { TERMS, calculateDeposit } = require('../../utils/depositCalc')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getDepositToolShare } = require('../../../utils/share')
const { createLastInput } = require('../../../utils/toolLastInput')

const lastInput = createLastInput('deposit', ['kind', 'principal', 'rate', 'days', 'termKey'])

Page({
  data: {
    theme: getThemeId(),
    kind: 'fixed',
    principal: '100000',
    rate: '1.5',
    days: '30',
    termKey: 'y1',
    terms: TERMS,
    result: null
  },

  onLoad() {
    enableShareMenu()
    this.setData(lastInput.restore(), () => this.recalculate())
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onHide() {
    lastInput.flush(this)
  },

  onUnload() {
    lastInput.flush(this)
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    this.setData({ [field]: e.detail.value }, () => this.recalculate())
  },

  onSelectKind(e) {
    const kind = e.currentTarget.dataset.kind
    if (!kind || kind === this.data.kind) return
    const patch = { kind }
    if (kind === 'demand' && this.data.rate === '1.5') patch.rate = '0.2'
    if (kind === 'fixed' && this.data.rate === '0.2') patch.rate = '1.5'
    this.setData(patch, () => this.recalculate())
  },

  onSelectTerm(e) {
    const termKey = e.currentTarget.dataset.key
    if (!termKey || termKey === this.data.termKey) return
    this.setData({ termKey }, () => this.recalculate())
  },

  recalculate() {
    this.setData(
      {
        result: calculateDeposit({
          kind: this.data.kind,
          principalText: this.data.principal,
          rateText: this.data.rate,
          daysText: this.data.days,
          termKey: this.data.termKey
        })
      },
      () => lastInput.save(this)
    )
  },

  onShareAppMessage() {
    return getDepositToolShare().appMessage
  },

  onShareTimeline() {
    return getDepositToolShare().timeline
  }
})
