const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getIdPhotoToolShare } = require('../../../utils/share')
const { TABS, getSpec, specsOf, searchSpecs, presentSpec, columnsOf } = require('../../utils/idphotoSpecs')

function viewList(list) {
  const cols = columnsOf(list)
  return {
    left: cols.left,
    right: cols.right,
    empty: !cols.left.length && !cols.right.length
  }
}

Page({
  data: {
    theme: getThemeId(),
    tabs: TABS,
    tab: 'hot',
    keyword: '',
    picking: false,
    left: [],
    right: [],
    empty: false
  },

  onLoad(options) {
    enableShareMenu()
    const tab = options && options.tab
    const picking = !!(options && options.pick === '1')
    const known = TABS.some((item) => item.id === tab)
    this.setData({ picking })
    this.showTab(known ? tab : 'hot')
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  showTab(tab) {
    this.setData(Object.assign({ tab, keyword: '' }, viewList(specsOf(tab).map(presentSpec))))
  },

  onTab(e) {
    this.showTab(e.currentTarget.dataset.id)
  },

  onInput(e) {
    const keyword = e.detail.value || ''
    const list = keyword.trim()
      ? searchSpecs(keyword).map(presentSpec)
      : specsOf(this.data.tab).map(presentSpec)
    this.setData(Object.assign({ keyword }, viewList(list)))
  },

  onSpec(e) {
    const spec = getSpec(e.currentTarget.dataset.id)
    if (!spec) return
    if (this.data.picking) {
      try {
        const channel = this.getOpenerEventChannel()
        if (channel && channel.emit) channel.emit('pick', spec)
      } catch (err) {}
      wx.navigateBack()
      return
    }
    wx.navigateTo({ url: `/packageCheckin/pages/idphoto/make?mode=quick&spec=${spec.id}` })
  },

  onShareAppMessage() {
    return getIdPhotoToolShare().appMessage
  },

  onShareTimeline() {
    return getIdPhotoToolShare().timeline
  }
})
