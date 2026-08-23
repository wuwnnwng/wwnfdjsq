const { encodeQr, normalizeWebsite } = require('../../../utils/qrcode')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getQrcodeToolShare } = require('../../../utils/share')

const CANVAS_CSS = 280

function contentFromInput(mode, text) {
  const raw = String(text || '').trim()
  if (!raw) return ''
  return mode === 'url' ? normalizeWebsite(raw) : raw
}

Page({
  data: {
    theme: getThemeId(),
    mode: 'text',
    inputValue: '',
    encodedText: '',
    qrImage: '',
    errorText: '',
    generating: false
  },

  onLoad() {
    enableShareMenu()
  },

  onReady() {
    this.prepareCanvas()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  prepareCanvas() {
    const query = wx.createSelectorQuery().in(this)
    query
      .select('#qrCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res && res[0] && res[0].node
        if (!canvas) return
        this._canvas = canvas
        if (this._pendingDraw) {
          this._pendingDraw = false
          this.drawCurrent()
        }
      })
  },

  onSwitchMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.mode) return
    this.setData({ mode }, () => this.scheduleGenerate())
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value }, () => this.scheduleGenerate())
  },

  onClear() {
    this.setData({
      inputValue: '',
      encodedText: '',
      qrImage: '',
      errorText: '',
      generating: false
    })
  },

  scheduleGenerate() {
    if (this._timer) clearTimeout(this._timer)
    this._timer = setTimeout(() => {
      this.generate()
    }, 280)
  },

  generate() {
    const encodedText = contentFromInput(this.data.mode, this.data.inputValue)
    if (!encodedText) {
      this.setData({
        encodedText: '',
        qrImage: '',
        errorText: '',
        generating: false
      })
      return
    }
    const encoded = encodeQr(encodedText)
    if (!encoded.ok) {
      this.setData({
        encodedText: '',
        qrImage: '',
        errorText: encoded.message,
        generating: false
      })
      return
    }
    this._encoded = encoded
    this.setData({
      encodedText,
      errorText: '',
      generating: true
    })
    this.drawCurrent()
  },

  drawCurrent() {
    const encoded = this._encoded
    if (!encoded || !encoded.ok) return
    if (!this._canvas) {
      this._pendingDraw = true
      this.prepareCanvas()
      return
    }
    const canvas = this._canvas
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const dpr = Number(info.pixelRatio) || 2
    const pixel = Math.round(CANVAS_CSS * dpr)
    canvas.width = pixel
    canvas.height = pixel
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      this.setData({ generating: false, errorText: '当前环境无法绘制二维码' })
      return
    }
    this.paintModules(ctx, encoded.modules, pixel)
    wx.canvasToTempFilePath(
      {
        canvas,
        x: 0,
        y: 0,
        width: pixel,
        height: pixel,
        destWidth: pixel,
        destHeight: pixel,
        fileType: 'png',
        success: (res) => {
          this.setData({
            qrImage: res.tempFilePath,
            generating: false,
            errorText: ''
          })
        },
        fail: () => {
          this.setData({ generating: false, errorText: '二维码生成失败，请重试' })
        }
      },
      this
    )
  },

  paintModules(ctx, modules, pixel) {
    const n = modules.length
    const quiet = 4
    const cells = n + quiet * 2
    const cell = pixel / cells
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pixel, pixel)
    ctx.fillStyle = '#111111'
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if (!modules[y][x]) continue
        ctx.fillRect((x + quiet) * cell, (y + quiet) * cell, cell + 0.4, cell + 0.4)
      }
    }
  },

  onSave() {
    if (!this.data.qrImage) {
      wx.showToast({ title: '请先生成二维码', icon: 'none' })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: this.data.qrImage,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      },
      fail: (err) => {
        if (err && err.errMsg && /auth deny|authorize/i.test(err.errMsg)) {
          wx.showModal({
            title: '需要相册权限',
            content: '保存二维码需要访问相册，请在设置中允许。',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting()
            }
          })
          return
        }
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    })
  },

  onCopy() {
    const text = this.data.encodedText
    if (!text) {
      wx.showToast({ title: '暂无可复制内容', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制内容', icon: 'success' })
    })
  },

  onShareAppMessage() {
    return getQrcodeToolShare().appMessage
  },

  onShareTimeline() {
    return getQrcodeToolShare().timeline
  },

  onUnload() {
    if (this._timer) clearTimeout(this._timer)
  }
})
