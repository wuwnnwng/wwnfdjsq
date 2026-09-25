const { encodeQr } = require('../../../utils/qrcode')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getCheckinToolShare } = require('../../../utils/share')

const QR_PIXEL = 420

function parseCheckinCode(text) {
  const raw = String(text || '').trim().toUpperCase()
  const matched = raw.match(/CKIN:([A-Z0-9]+)/)
  if (matched) return matched[1]
  if (/^[A-Z0-9]{6,12}$/.test(raw)) return raw
  return ''
}

function callCheckin(action, data) {
  if (!wx.cloud) {
    return Promise.reject(new Error('当前微信版本不支持云开发'))
  }
  return wx.cloud.callFunction({
    name: 'checkin',
    data: Object.assign({ action }, data || {})
  }).then((res) => {
    const result = (res && res.result) || {}
    if (!result.ok) {
      const error = new Error(result.message || '操作失败')
      error.result = result
      throw error
    }
    return result
  })
}

function cloudMessage(err) {
  const result = err && err.result
  if (result && result.message) return result.message
  const msg = (err && (err.errMsg || err.message)) || ''
  if (/FUNCTION_NOT_FOUND|FunctionName parameter could not be found|未找到对应的云函数/i.test(msg)) {
    return '云函数 checkin 还没部署。请在开发者工具左侧右键 checkin，选择上传并部署。'
  }
  if (/timeout|超时|FUNCTIONS_TIME_LIMIT|timed out/i.test(msg)) return '云函数超时，请再试一次'
  const cleaned = msg.replace(/^cloud\.callFunction:fail\s*/i, '').replace(/^Error:\s*/i, '').trim()
  return cleaned.slice(0, 120) || '操作失败'
}

function showCloudError(err) {
  wx.showModal({
    title: '签到失败',
    content: cloudMessage(err),
    showCancel: false,
    confirmText: '知道了'
  })
}

Page({
  data: {
    theme: getThemeId(),
    mode: 'home',
    name: '',
    title: '',
    note: '',
    events: [],
    event: null,
    isOwner: false,
    records: [],
    creating: false,
    exporting: false
  },

  onLoad() {
    enableShareMenu()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    if (this.data.mode === 'home') this.loadMine()
    else if (this.data.event) this.loadBoard(this.data.event.id)
  },

  onName(e) {
    this.setData({ name: (e.detail && e.detail.value) || '' })
  },

  onTitle(e) {
    this.setData({ title: (e.detail && e.detail.value) || '' })
  },

  onNote(e) {
    this.setData({ note: (e.detail && e.detail.value) || '' })
  },

  loadMine() {
    callCheckin('listMine')
      .then((result) => {
        this.setData({ events: result.events || [] })
      })
      .catch(() => {})
  },

  onScan() {
    const name = String(this.data.name || '').trim()
    if (!name) {
      wx.showToast({ title: '请先填写姓名', icon: 'none' })
      return
    }
    wx.scanCode({
      scanType: ['qrCode'],
      success: (res) => {
        const eventId = parseCheckinCode(res && res.result)
        if (!eventId) {
          wx.showToast({ title: '这不是签到二维码', icon: 'none' })
          return
        }
        wx.showLoading({ title: '正在签到', mask: true })
        callCheckin('checkIn', { eventId, name })
          .then((result) => {
            wx.hideLoading()
            wx.showModal({
              title: '签到成功',
              content: `${name} 已签到「${result.event.title}」`,
              showCancel: false,
              confirmText: '知道了'
            })
          })
          .catch((err) => {
            wx.hideLoading()
            const result = err && err.result
            showCloudError(err)
            if (result && result.duplicate) return
          })
      }
    })
  },

  onCreate() {
    if (this.data.creating) return
    const title = String(this.data.title || '').trim()
    if (!title) {
      wx.showToast({ title: '请填写签到名称', icon: 'none' })
      return
    }
    this.setData({ creating: true })
    callCheckin('createEvent', { title, note: this.data.note })
      .then((result) => {
        this.setData({
          creating: false,
          title: '',
          note: '',
          mode: 'board',
          event: result.event,
          isOwner: true,
          records: []
        })
        this.drawQr(result.event.id)
      })
      .catch((err) => {
        this.setData({ creating: false })
        showCloudError(err)
      })
  },

  onOpenEvent(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    this.loadBoard(id)
  },

  loadBoard(eventId) {
    callCheckin('listRecords', { eventId })
      .then((result) => {
        this.setData({
          mode: 'board',
          event: result.event,
          isOwner: true,
          records: result.records || []
        })
        this.drawQr(result.event.id)
      })
      .catch((err) => {
        showCloudError(err)
      })
  },

  onBackHome() {
    this.setData({ mode: 'home', event: null, records: [], isOwner: false })
    this.loadMine()
  },

  onToggleStatus() {
    const event = this.data.event
    if (!event) return
    const closing = event.status !== 'closed'
    wx.showModal({
      title: closing ? '结束这次签到？' : '重新开启签到？',
      content: closing ? '结束后不能再扫码签到。' : '开启后可以继续扫码签到。',
      confirmText: closing ? '结束' : '开启',
      success: (res) => {
        if (!res.confirm) return
        callCheckin(closing ? 'closeEvent' : 'openEvent', { eventId: event.id })
          .then((result) => {
            this.setData({ event: result.event })
          })
          .catch((err) => {
            showCloudError(err)
          })
      }
    })
  },

  onExport() {
    const event = this.data.event
    if (!event || this.data.exporting) return
    this.setData({ exporting: true })
    wx.showLoading({ title: '正在导出', mask: true })
    callCheckin('exportExcel', { eventId: event.id })
      .then((result) => wx.cloud.downloadFile({ fileID: result.fileID }))
      .then((file) => {
        wx.hideLoading()
        this.setData({ exporting: false })
        wx.openDocument({
          filePath: file.tempFilePath,
          fileType: 'xls',
          showMenu: true,
          fail: () => {
            wx.showToast({ title: '文件已生成，但暂时打不开', icon: 'none' })
          }
        })
      })
      .catch((err) => {
        wx.hideLoading()
        this.setData({ exporting: false })
        showCloudError(err)
      })
  },

  drawQr(eventId) {
    const encoded = encodeQr(`CKIN:${eventId}`)
    if (!encoded.ok) return
    wx.nextTick(() => {
      wx.createSelectorQuery()
        .in(this)
        .select('#checkinQr')
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res && res[0] && res[0].node
          if (!canvas) return
          const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio
          const pixel = Math.round(QR_PIXEL * (dpr || 2) / 2)
          canvas.width = pixel
          canvas.height = pixel
          const ctx = canvas.getContext('2d')
          const modules = encoded.modules
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
        })
    })
  },

  onShareAppMessage() {
    return getCheckinToolShare().appMessage
  },

  onShareTimeline() {
    return getCheckinToolShare().timeline
  }
})
