const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getIdPhotoToolShare } = require('../../../utils/share')
const { COLORS, MORE_COLORS, colorById, getSpec } = require('../../utils/idphotoSpecs')
const { processFrame } = require('../../utils/idphotoImage')

const TITLES = {
  quick: '制作证件照',
  bg: '证件照更换底色',
  crop: '裁剪尺寸',
  sharp: '图片变清晰',
  format: '图片格式转换'
}

const STRENGTHS = [
  { id: 'weak', name: '弱' },
  { id: 'mid', name: '中' },
  { id: 'strong', name: '强' }
]

function readFrame(src) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: (info) => {
        const maxSide = 1400
        const scale = Math.min(1, maxSide / Math.max(info.width, info.height))
        const sw = Math.max(1, Math.round(info.width * scale))
        const sh = Math.max(1, Math.round(info.height * scale))
        const canvas = wx.createOffscreenCanvas({ type: '2d', width: sw, height: sh })
        const img = canvas.createImage()
        const timer = setTimeout(() => reject(new Error('timeout')), 8000)
        img.onload = () => {
          clearTimeout(timer)
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, sw, sh)
          const frame = ctx.getImageData(0, 0, sw, sh)
          resolve({ data: frame.data, sw, sh })
        }
        img.onerror = () => {
          clearTimeout(timer)
          reject(new Error('read'))
        }
        img.src = src
      },
      fail: reject
    })
  })
}

function paintResult(frame) {
  const canvas = wx.createOffscreenCanvas({ type: '2d', width: frame.width, height: frame.height })
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData
    ? ctx.createImageData(frame.width, frame.height)
    : ctx.getImageData(0, 0, frame.width, frame.height)
  image.data.set(frame.data)
  ctx.putImageData(image, 0, 0)
  return canvas
}

function canvasToFile(canvas, fileType, quality) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 8000)
    wx.canvasToTempFilePath({
      canvas,
      fileType,
      quality,
      destWidth: canvas.width,
      destHeight: canvas.height,
      success: (res) => {
        clearTimeout(timer)
        if (!res || !res.tempFilePath) {
          reject(new Error('empty'))
          return
        }
        resolve(res.tempFilePath)
      },
      fail: (err) => {
        clearTimeout(timer)
        reject(err)
      }
    })
  })
}

function fileSize(path) {
  return new Promise((resolve) => {
    wx.getFileSystemManager().stat({
      path,
      success: (res) => resolve(res.stats.size || 0),
      fail: () => resolve(0)
    })
  })
}

Page({
  data: {
    theme: getThemeId(),
    mode: 'quick',
    spec: null,
    specText: '选择规格',
    colors: COLORS,
    moreColors: MORE_COLORS,
    moreOpen: false,
    colorId: 'blue',
    colorHex: '#438EDB',
    strengths: STRENGTHS,
    strength: 'mid',
    offset: 50,
    fileType: 'jpg',
    fileName: 'JPG',
    src: '',
    result: '',
    resultMeta: '',
    making: false,
    warn: '',
    showBg: true,
    showSpec: true,
    showFormat: false,
    showOffset: true,
    showStrength: true,
    privacyOpen: false,
    privacyName: '《小程序隐私保护指引》'
  },

  onLoad(options) {
    enableShareMenu()
    this.bindPrivacy()
    const mode = TITLES[options && options.mode] ? options.mode : 'quick'
    const spec = getSpec(options && options.spec)
    wx.setNavigationBarTitle({ title: `${TITLES[mode]}｜小小便民工具箱` })
    this.setData(this.viewOf(mode, spec))
  },

  onUnload() {
    this.unbindPrivacy()
  },

  bindPrivacy() {
    if (this._privacyBound || typeof wx.onNeedPrivacyAuthorization !== 'function') return
    this._privacyBound = true
    this._onNeedPrivacy = (resolve) => {
      if (this._privacyChosen === 'agree') {
        resolve({ buttonId: 'privacy-agree', event: 'agree' })
        return
      }
      if (this._privacyChosen === 'reject') {
        resolve({ event: 'disagree' })
        return
      }
      this.privacyResolve = resolve
      const open = (name) => {
        this.setData({
          privacyOpen: true,
          privacyName: name || '《小程序隐私保护指引》'
        })
      }
      if (typeof wx.getPrivacySetting !== 'function') {
        open('')
        return
      }
      wx.getPrivacySetting({
        success: (res) => open(res && res.privacyContractName),
        fail: () => open('')
      })
    }
    wx.onNeedPrivacyAuthorization(this._onNeedPrivacy)
  },

  unbindPrivacy() {
    if (this.privacyResolve) {
      this.privacyResolve({ event: 'disagree' })
      this.privacyResolve = null
    }
    if (this._onNeedPrivacy && typeof wx.offNeedPrivacyAuthorization === 'function') {
      wx.offNeedPrivacyAuthorization(this._onNeedPrivacy)
    }
    this._privacyBound = false
  },

  onAgreePrivacy() {
    if (this._agreeLock || !this.data.privacyOpen) return
    this._agreeLock = true
    this._privacyChosen = 'agree'
    const resolve = this.privacyResolve
    this.privacyResolve = null
    if (resolve) resolve({ buttonId: 'privacy-agree', event: 'agree' })
    this.setData({ privacyOpen: false })
    wx.showToast({ title: '已同意', icon: 'none' })
    this._pickToken = (this._pickToken || 0) + 1
    this.pickImage(this._pickToken)
    setTimeout(() => {
      this._agreeLock = false
    }, 400)
  },

  onRejectPrivacy() {
    if (this._agreeLock || !this.data.privacyOpen) return
    this._agreeLock = true
    this._privacyChosen = 'reject'
    const resolve = this.privacyResolve
    this.privacyResolve = null
    this._pickToken = (this._pickToken || 0) + 1
    this.setData({ privacyOpen: false })
    if (resolve) resolve({ event: 'disagree' })
    wx.showToast({ title: '已拒绝', icon: 'none' })
    setTimeout(() => {
      this._agreeLock = false
    }, 400)
  },

  onHoldPrivacy() {},

  onOpenPrivacy() {
    if (typeof wx.openPrivacyContract === 'function') wx.openPrivacyContract()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  viewOf(mode, spec, extra) {
    const color = colorById(spec && spec.bg)
    const fileType = mode === 'format' ? 'jpg' : ((spec && spec.fileType) || 'jpg')
    const patch = Object.assign({
      mode,
      spec: spec || null,
      specText: spec ? `${spec.name} · ${spec.width}×${spec.height}` : '选择规格',
      colorId: color.id,
      colorHex: color.hex,
      fileType,
      fileName: fileType === 'png' ? 'PNG' : 'JPG',
      showBg: mode === 'quick' || mode === 'bg',
      showSpec: mode === 'quick' || mode === 'crop' || mode === 'sharp',
      showFormat: mode === 'format',
      showOffset: mode === 'quick' || mode === 'crop',
      showStrength: mode === 'quick' || mode === 'bg',
      result: '',
      resultMeta: '',
      warn: ''
    }, extra)
    return patch
  },

  onChoose() {
    this._agreeLock = false
    this._privacyChosen = ''
    this._pickToken = (this._pickToken || 0) + 1
    this.pickImage(this._pickToken)
  },

  pickImage(token) {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        if (token !== this._pickToken) return
        const path = res.tempFilePaths && res.tempFilePaths[0]
        if (!path) return
        this.setData({ src: path, result: '', resultMeta: '', warn: '' })
      },
      fail: (err) => {
        if (token !== this._pickToken) return
        this.onPickFail(err)
      }
    })
  },

  onPickFail(err) {
    const msg = (err && err.errMsg) || ''
    if (!msg || /cancel|disagree/i.test(msg)) return
    if (this.privacyResolve || this.data.privacyOpen || this._privacyChosen) return
    if (/privacy|隐私|not declared|未声明/i.test(msg)) {
      this._agreeLock = false
      this.setData({ privacyOpen: true })
      return
    }
    wx.showToast({ title: '没有打开相册', icon: 'none' })
  },

  stopMake() {
    this._job = (this._job || 0) + 1
    if (this.data.making) this.setData({ making: false })
  },

  onColor(e) {
    const color = colorById(e.currentTarget.dataset.id)
    this.stopMake()
    this.setData({ colorId: color.id, colorHex: color.hex, result: '', resultMeta: '', making: false })
  },

  onMore() {
    this.setData({ moreOpen: !this.data.moreOpen })
  },

  onStrength(e) {
    this.stopMake()
    this.setData({ strength: e.currentTarget.dataset.id, result: '', resultMeta: '', making: false })
  },

  onOffset(e) {
    this.setData({ offset: Number(e.detail.value) || 0, result: '', resultMeta: '' })
  },

  onPickFormat() {
    wx.showActionSheet({
      itemList: ['JPG', 'PNG'],
      success: (res) => {
        const fileType = res.tapIndex === 1 ? 'png' : 'jpg'
        this.setData({
          fileType,
          fileName: fileType === 'png' ? 'PNG' : 'JPG',
          result: '',
          resultMeta: ''
        })
      }
    })
  },

  onPickSpec() {
    wx.navigateTo({
      url: '/packageCheckin/pages/idphoto/specs?pick=1',
      events: {
        pick: (spec) => {
          const color = colorById(spec.bg || this.data.colorId)
          this.setData({
            spec,
            specText: `${spec.name} · ${spec.width}×${spec.height}`,
            colorId: color.id,
            colorHex: color.hex,
            result: '',
            resultMeta: ''
          })
        }
      }
    })
  },

  onMake() {
    if (!this.data.src) {
      wx.showToast({ title: '先上传照片', icon: 'none' })
      return
    }
    if ((this.data.mode === 'quick' || this.data.mode === 'crop') && !this.data.spec) {
      wx.showToast({ title: '先选一个规格', icon: 'none' })
      return
    }
    const job = (this._job || 0) + 1
    this._job = job
    this.setData({ making: true, warn: '' })
    this.renderPhoto().then((payload) => {
      if (job !== this._job) return
      this.setData(Object.assign({ making: false }, payload))
    }).catch(() => {
      if (job !== this._job) return
      this.setData({ making: false })
      wx.showToast({ title: '制作失败，换一张照片试试', icon: 'none' })
    })
  },

  renderPhoto() {
    const mode = this.data.mode
    const spec = this.data.spec
    const useSpec = spec && mode !== 'bg' && mode !== 'format'
    const color = colorById(this.data.colorId)
    return readFrame(this.data.src).then((frame) => {
      const made = processFrame(frame.data, frame.sw, frame.sh, {
        replaceBg: mode === 'quick' || mode === 'bg',
        color: color.hex,
        strength: this.data.strength,
        crop: !!useSpec,
        width: useSpec ? spec.width : frame.sw,
        height: useSpec ? spec.height : frame.sh,
        offset: (Number(this.data.offset) - 50) / 50,
        sharpen: mode === 'sharp',
        sharpenAmount: 0.7
      })
      return this.paintOnPage(made).then((canvas) => {
        return this.exportFile(canvas, this.data.fileType, spec && spec.maxKb)
      }).then((file) => {
        const kb = Math.max(1, Math.round(file.size / 1024))
        let warn = ''
        if ((mode === 'quick' || mode === 'bg') && made.bg && !made.bg.solid) {
          warn = '原图边缘不像纯色背景，换出来的边缘可能不干净。'
        }
        if (spec && spec.maxKb && this.data.fileType === 'jpg' && kb > spec.maxKb) {
          const limitText = `导出约 ${kb}KB，这个规格常见限制是 ${spec.maxKb}KB 以内。`
          warn = warn ? `${warn}${limitText}` : limitText
        }
        return {
          result: file.path,
          resultMeta: `${made.width}×${made.height} · ${this.data.fileName} · ${kb}KB`,
          warn
        }
      })
    })
  },

  paintOnPage(frame) {
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = (canvas) => {
        if (settled) return
        settled = true
        resolve(canvas)
      }
      const fail = (err) => {
        if (settled) return
        settled = true
        reject(err)
      }
      const timer = setTimeout(() => {
        try {
          finish(paintResult(frame))
        } catch (err) {
          fail(err)
        }
      }, 1500)
      const query = this.createSelectorQuery()
      query.select('#outCanvas').fields({ node: true, size: true }).exec((res) => {
        clearTimeout(timer)
        const node = res && res[0] && res[0].node
        if (!node) {
          try {
            finish(paintResult(frame))
          } catch (err) {
            fail(err)
          }
          return
        }
        try {
          node.width = frame.width
          node.height = frame.height
          const ctx = node.getContext('2d')
          const image = ctx.createImageData
            ? ctx.createImageData(frame.width, frame.height)
            : ctx.getImageData(0, 0, frame.width, frame.height)
          image.data.set(frame.data)
          ctx.putImageData(image, 0, 0)
          finish(node)
        } catch (err) {
          fail(err)
        }
      })
    })
  },

  exportFile(canvas, fileType, maxKb) {
    const qualities = fileType === 'png' ? [1] : [0.92, 0.8, 0.68, 0.55, 0.42, 0.32]
    const limit = fileType === 'jpg' && maxKb ? maxKb * 1024 : 0
    let index = 0
    const next = (last) => {
      if (index >= qualities.length) return Promise.resolve(last)
      const quality = qualities[index]
      index += 1
      return canvasToFile(canvas, fileType, quality).then((path) => {
        return fileSize(path).then((size) => {
          const file = { path, size }
          if (!limit || size <= limit) return file
          return next(file)
        })
      })
    }
    return next(null)
  },

  onSave() {
    if (!this.data.result) return
    wx.saveImageToPhotosAlbum({
      filePath: this.data.result,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: (err) => {
        const msg = err && err.errMsg ? err.errMsg : ''
        if (msg.indexOf('auth') >= 0 || msg.indexOf('deny') >= 0 || msg.indexOf('authorize') >= 0) {
          wx.showModal({
            title: '需要相册权限',
            content: '保存证件照需要允许写入相册。',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting()
            }
          })
          return
        }
        wx.showToast({ title: '没有保存成功', icon: 'none' })
      }
    })
  },

  onShareAppMessage() {
    return getIdPhotoToolShare().appMessage
  },

  onShareTimeline() {
    return getIdPhotoToolShare().timeline
  }
})
