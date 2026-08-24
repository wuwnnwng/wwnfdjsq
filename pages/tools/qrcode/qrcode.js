const { encodeQr, buildScanPayload } = require('../../../utils/qrcode')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getQrcodeToolShare } = require('../../../utils/share')

const CANVAS_CSS = 280
const SAVE_FILE = 'qrcode-save.png'

Page({
  data: {
    theme: getThemeId(),
    mode: 'text',
    urlScheme: 'https',
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

  onSwitchScheme(e) {
    const urlScheme = e.currentTarget.dataset.scheme
    if (!urlScheme || urlScheme === this.data.urlScheme) return
    this.setData({ urlScheme }, () => this.scheduleGenerate())
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
    const built = buildScanPayload(this.data.mode, this.data.inputValue, this.data.urlScheme)
    if (!built.payload) {
      this.setData({
        encodedText: '',
        qrImage: '',
        errorText: '',
        generating: false
      })
      return
    }
    const encoded = encodeQr(built.payload)
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
      encodedText: built.display,
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

  errorMessage(err) {
    return (err && (err.errMsg || err.message)) || ''
  },

  isPrivacyError(err) {
    return /privacy|隐私|not declared|privacy permission/i.test(this.errorMessage(err))
  },

  isAuthError(err) {
    const msg = this.errorMessage(err)
    if (this.isPrivacyError(err)) return false
    return /auth deny|authorize|permission|auth denied/i.test(msg)
  },

  requirePrivacy() {
    return new Promise((resolve, reject) => {
      if (typeof wx.requirePrivacyAuthorize !== 'function') {
        resolve()
        return
      }
      wx.requirePrivacyAuthorize({
        success: resolve,
        fail: reject
      })
    })
  },

  ensureAlbumAuth() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (setting) => {
          const auth = setting.authSetting['scope.writePhotosAlbum']
          if (auth) {
            resolve()
            return
          }
          if (auth === false) {
            wx.showModal({
              title: '需要相册权限',
              content: '保存二维码需要访问相册，请在设置中允许。',
              confirmText: '去设置',
              success: (res) => {
                if (!res.confirm) {
                  reject({ errMsg: 'auth denied' })
                  return
                }
                wx.openSetting({
                  success: (openRes) => {
                    if (openRes.authSetting['scope.writePhotosAlbum']) resolve()
                    else reject({ errMsg: 'auth denied' })
                  },
                  fail: reject
                })
              }
            })
            return
          }
          resolve()
        },
        fail: reject
      })
    })
  },

  persistSaveFile(tempFilePath) {
    return new Promise((resolve, reject) => {
      const dest = `${wx.env.USER_DATA_PATH}/${SAVE_FILE}`
      const fs = wx.getFileSystemManager()
      const done = (path) => resolve(path || dest)
      if (typeof fs.saveFile === 'function') {
        fs.saveFile({
          tempFilePath,
          filePath: dest,
          success: () => done(dest),
          fail: () => {
            fs.copyFile({
              srcPath: tempFilePath,
              destPath: dest,
              success: () => done(dest),
              fail: () => done(tempFilePath)
            })
          }
        })
        return
      }
      done(tempFilePath)
    })
  },

  exportCanvasFile() {
    return new Promise((resolve, reject) => {
      const dest = `${wx.env.USER_DATA_PATH}/${SAVE_FILE}`
      const canvas = this._canvas
      const writeBase64 = () => {
        try {
          if (canvas && typeof canvas.toDataURL === 'function') {
            const dataUrl = canvas.toDataURL('image/png')
            const base64 = String(dataUrl || '').replace(/^data:image\/\w+;base64,/, '')
            if (base64.length > 80) {
              wx.getFileSystemManager().writeFile({
                filePath: dest,
                data: base64,
                encoding: 'base64',
                success: () => resolve(dest),
                fail: exportTemp
              })
              return
            }
          }
        } catch (e) {
          // fallback below
        }
        exportTemp()
      }
      const exportTemp = () => {
        if (!canvas) {
          resolveImage()
          return
        }
        wx.canvasToTempFilePath(
          {
            canvas,
            fileType: 'png',
            success: (res) => {
              this.persistSaveFile(res.tempFilePath).then(resolve).catch(resolveImage)
            },
            fail: resolveImage
          },
          this
        )
      }
      const resolveImage = () => {
        const src = this.data.qrImage
        if (!src) {
          reject({ errMsg: 'no image' })
          return
        }
        wx.getImageInfo({
          src,
          success: (info) => {
            if (!info || !info.path) {
              reject({ errMsg: 'no image' })
              return
            }
            this.persistSaveFile(info.path).then(resolve).catch(() => resolve(info.path))
          },
          fail: reject
        })
      }
      writeBase64()
    })
  },

  saveFileToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: reject
      })
    })
  },

  handleSaveFail(err) {
    if (this.isPrivacyError(err)) {
      wx.showModal({
        title: '无法保存到相册',
        content: '正式版需在微信公众平台「设置 → 服务内容声明 → 用户隐私保护指引」中声明「将文件保存到相册」。也可先长按二维码保存。',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }
    if (this.isAuthError(err)) {
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
    wx.showToast({ title: '保存失败，请长按图片保存', icon: 'none' })
  },

  onSave() {
    if (!this.data.qrImage && !this._encoded) {
      wx.showToast({ title: '请先生成二维码', icon: 'none' })
      return
    }
    if (this._saving) return
    this._saving = true
    wx.showLoading({ title: '正在保存', mask: true })
    this.requirePrivacy()
      .then(() => this.ensureAlbumAuth())
      .then(() => this.exportCanvasFile())
      .then((filePath) => this.saveFileToAlbum(filePath))
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      })
      .catch((err) => {
        wx.hideLoading()
        this.handleSaveFail(err)
      })
      .then(() => {
        this._saving = false
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
