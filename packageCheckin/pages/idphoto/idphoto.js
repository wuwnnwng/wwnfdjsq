const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getIdPhotoToolShare } = require('../../../utils/share')
const { specsOf, presentSpec, columnsOf } = require('../../utils/idphotoSpecs')

const hotCols = columnsOf(specsOf('hot').map(presentSpec))

const CATS = [
  { id: 'common', name: '常用寸照', desc: '一寸 / 二寸 / 小二寸', mark: '📷' },
  { id: 'career', name: '职业资格', desc: '教师资格证 / 简历', mark: '📄' },
  { id: 'edu', name: '学历/语言', desc: '四六级 / 考研 / 高考', mark: '🎓' },
  { id: 'receipt', name: '回执专区', desc: '身份证 / 驾驶证 / 保安证', mark: '🧾' }
]

const ACTS = [
  { mode: 'bg', name: '更换背景色', mark: '🎨' },
  { mode: 'crop', name: '裁剪尺寸', mark: '✂️' },
  { mode: 'sharp', name: '图片变清晰', mark: '✨' },
  { mode: 'format', name: '格式更改', mark: '🖼️' }
]

Page({
  data: {
    theme: getThemeId(),
    cats: CATS,
    acts: ACTS,
    hotLeft: hotCols.left,
    hotRight: hotCols.right
  },

  onLoad() {
    enableShareMenu()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onQuick() {
    wx.navigateTo({ url: '/packageCheckin/pages/idphoto/make?mode=quick&spec=inch1' })
  },

  onCat(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/packageCheckin/pages/idphoto/specs?tab=${id}` })
  },

  onAct(e) {
    const mode = e.currentTarget.dataset.mode
    const spec = mode === 'crop' ? '&spec=inch1' : ''
    wx.navigateTo({ url: `/packageCheckin/pages/idphoto/make?mode=${mode}${spec}` })
  },

  onMore() {
    wx.navigateTo({ url: '/packageCheckin/pages/idphoto/specs?tab=hot' })
  },

  onSpec(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/packageCheckin/pages/idphoto/make?mode=quick&spec=${id}` })
  },

  onShareAppMessage() {
    return getIdPhotoToolShare().appMessage
  },

  onShareTimeline() {
    return getIdPhotoToolShare().timeline
  }
})
