const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getExamTipsToolShare } = require('../../../utils/share')
const { CATALOG } = require('../../data/catalog')
const { loadType } = require('../../data/load')

const STORAGE_KEY = 'examTips:progress'

function readProgress() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (!raw || typeof raw !== 'object') return { tab: 'xingce', indexByType: {} }
    return {
      tab: raw.tab === 'shenlun' ? 'shenlun' : 'xingce',
      indexByType: raw.indexByType && typeof raw.indexByType === 'object' ? raw.indexByType : {}
    }
  } catch (e) {
    return { tab: 'xingce', indexByType: {} }
  }
}

function writeProgress(progress) {
  try {
    wx.setStorageSync(STORAGE_KEY, progress)
  } catch (e) {}
}

function sectionView(tab) {
  return CATALOG.find((item) => item.id === tab) || CATALOG[0]
}

Page({
  data: {
    theme: getThemeId(),
    tab: 'xingce',
    kicker: '',
    types: [],
    reading: false,
    typeName: '',
    typeHint: '',
    cards: [],
    cardIndex: 0,
    cardTotal: 0,
    currentCard: null
  },

  onLoad() {
    enableShareMenu()
    this._progress = readProgress()
    this.applyTab(this._progress.tab)
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  applyTab(tab) {
    const section = sectionView(tab)
    this.setData({
      tab: section.id,
      kicker: section.kicker,
      types: section.types
    })
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.tab) return
    this._progress.tab = tab
    writeProgress(this._progress)
    this.applyTab(tab)
  },

  onOpenType(e) {
    const typeId = e.currentTarget.dataset.id
    const pack = loadType(typeId)
    if (!pack || !pack.cards.length) {
      wx.showToast({ title: '这一题型还没整理好', icon: 'none' })
      return
    }
    const saved = Number(this._progress.indexByType[typeId]) || 0
    const cardIndex = Math.max(0, Math.min(pack.cards.length - 1, saved))
    this._typeId = typeId
    this.setData({
      reading: true,
      typeName: pack.name,
      typeHint: pack.hint,
      cards: pack.cards,
      cardTotal: pack.cards.length,
      cardIndex,
      currentCard: pack.cards[cardIndex]
    })
  },

  persistIndex(index) {
    if (!this._typeId) return
    this._progress.indexByType[this._typeId] = index
    writeProgress(this._progress)
  },

  showCard(index) {
    const cards = this.data.cards
    if (!cards.length) return
    const next = Math.max(0, Math.min(cards.length - 1, index))
    this.setData({
      cardIndex: next,
      currentCard: cards[next]
    })
    this.persistIndex(next)
  },

  onSwiperChange(e) {
    const index = Number(e.detail.current) || 0
    this.showCard(index)
  },

  onPrev() {
    this.showCard(this.data.cardIndex - 1)
  },

  onNext() {
    this.showCard(this.data.cardIndex + 1)
  },

  onCloseReader() {
    this.setData({ reading: false })
  },

  onShareAppMessage() {
    return getExamTipsToolShare().appMessage
  },

  onShareTimeline() {
    return getExamTipsToolShare().timeline
  }
})
