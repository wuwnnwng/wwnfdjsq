const { inspectImage } = require('../../utils/idphotoCheck')
const { checkImage, RISKY_TEXT } = require('../../../utils/imageSec')
const { deliver } = require('../../utils/idphotoBridge')

const GUIDE = [
  '优先使用后置摄像头拍摄',
  '站白墙（纯色）前，光线充足均匀',
  '头部居中，正对镜头',
  '露出眉毛和耳朵，面部无遮挡'
]

const TASKS = [
  '检测人像取景范围，头肩姿势是否标准',
  '检测相片光线、色彩、清晰度',
  '检测背景是否接近纯色',
  '确认头部留白是否合适'
]

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

Page({
  data: {
    phase: 'checking',
    file: '',
    from: 'album',
    issues: [],
    issueCount: 0,
    guide: GUIDE,
    tasks: TASKS
  },

  onLoad(options) {
    const file = options && options.file ? decodeURIComponent(options.file) : ''
    const from = options && options.from === 'camera' ? 'camera' : 'album'
    this.setData({ file, from })
    if (!file) {
      wx.showToast({ title: '没有读到照片', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 500)
      return
    }
    this.run(file)
  },

  run(file) {
    const started = Date.now()
    Promise.all([
      checkImage(file).catch(() => ({ risky: false })),
      inspectImage(file).catch(() => ({ ok: false, issues: [{ id: 'read', text: '没有读到照片' }] }))
    ]).then(([sec, portrait]) => {
      const rest = Math.max(0, 1200 - (Date.now() - started))
      return wait(rest).then(() => ({ sec, portrait }))
    }).then(({ sec, portrait }) => {
      if (this._left) return
      if (sec && sec.risky) {
        wx.showModal({
          title: '提示',
          content: RISKY_TEXT,
          showCancel: false,
          success: () => wx.navigateBack()
        })
        return
      }
      const issues = (portrait && portrait.issues) || []
      if (!portrait || !portrait.ok) {
        wx.setNavigationBarTitle({ title: '检测不合格' })
        this.setData({
          phase: 'fail',
          issues,
          issueCount: issues.length || 1
        })
        return
      }
      this._done = true
      deliver(file)
      wx.navigateBack({ delta: this.data.from === 'camera' ? 2 : 1 })
    })
  },

  onUnload() {
    this._left = true
  },

  onRetake() {
    if (this.data.from === 'camera') {
      wx.navigateBack()
      return
    }
    wx.navigateBack()
  },

  onShareAppMessage() {
    return {
      title: '证件照拍摄要求｜小小便民工具箱',
      path: '/packageCheckin/pages/idphoto/idphoto'
    }
  }
})
