const { encodeQr } = require('../../../utils/qrcode')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getCheckinToolShare } = require('../../../utils/share')
const { exportTableToExcel, openExcelFile } = require('../../../utils/excel')

function parseCheckinCode(text) {
  const raw = String(text || '')
    .trim()
    .toUpperCase()
    .replace(/：/g, ':')
    .replace(/\s+/g, '')
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
  if (result && result.message) {
    if (result.message === '未知操作') {
      return '云端还是旧版本。请右键 cloudfunctions/checkin，选择「上传并部署：所有文件」后再删除。'
    }
    return result.message
  }
  const msg = (err && (err.errMsg || err.message)) || ''
  if (/FUNCTION_NOT_FOUND|FunctionName parameter could not be found|未找到对应的云函数/i.test(msg)) {
    return '云函数 checkin 还没部署。请在开发者工具左侧右键 checkin，选择上传并部署。'
  }
  if (/timeout|超时|FUNCTIONS_TIME_LIMIT|timed out/i.test(msg)) return '云函数超时，请再试一次'
  const cleaned = msg.replace(/^cloud\.callFunction:fail\s*/i, '').replace(/^Error:\s*/i, '').trim()
  return cleaned.slice(0, 120) || '操作失败'
}

function miniEnv() {
  try {
    const env = wx.getAccountInfoSync().miniProgram.envVersion
    if (env === 'trial' || env === 'release') return env
  } catch (e) {}
  return 'trial'
}

function decorateEvent(event) {
  if (!event || event.expireAt) return event
  const matched = String(event.createdAt || '').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
  if (!matched) return event
  const date = new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]), Number(matched[4]), Number(matched[5]))
  date.setDate(date.getDate() + 7)
  const pad = (num) => (num < 10 ? `0${num}` : String(num))
  return Object.assign({}, event, {
    expireAt: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`,
    expired: date.getTime() <= Date.now()
  })
}

function packField(label, kind, options) {
  const picked = kind === 'select' ? (options || []).slice(0, 10) : []
  return {
    label,
    kind: kind === 'select' ? 'select' : 'text',
    options: picked,
    kindText: kind === 'select' ? '枚举' : '普通',
    optionText: picked.join('、')
  }
}

function fieldSummary(list) {
  return (list || []).map((item) => (item.kind === 'select' ? `${item.label}（${(item.options || []).join('、')}）` : item.label)).join('、')
}

function signFieldModel(fields) {
  const src = fields || {}
  let customs = Array.isArray(src.customs) ? src.customs : []
  if (!customs.length && src.customLabel) {
    customs = [{
      label: src.customLabel,
      kind: src.customKind === 'select' ? 'select' : 'text',
      options: src.customOptions || []
    }]
  }
  return {
    name: src.name !== false,
    place: false,
    customs: customs.map((item) => ({
      label: item.label,
      kind: item.kind === 'select' ? 'select' : 'text',
      options: item.options || [],
      value: '',
      index: 0
    }))
  }
}

function openSignSheet(page, eventId) {
  if (!eventId) return
  const show = (fields) => {
    page.setData({
      signSheet: true,
      pendingEventId: eventId,
      signFields: signFieldModel(fields),
      name: '',
      place: '',
      customValue: '',
      customIndex: 0,
      signKeyboardHeight: 0
    })
  }
  callCheckin('readEvent', { eventId })
    .then((result) => {
      show((result.event && result.event.fields) || null)
    })
    .catch(() => {
      show(null)
    })
}

function showCloudError(err) {
  wx.showModal({
    title: '签到失败',
    content: cloudMessage(err),
    showCancel: false,
    confirmText: '知道了'
  })
}

function saveQrToAlbum(filePath) {
  const write = () => new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: reject
    })
  })
  const privacy = new Promise((resolve, reject) => {
    if (typeof wx.requirePrivacyAuthorize !== 'function') {
      resolve()
      return
    }
    wx.requirePrivacyAuthorize({ success: resolve, fail: reject })
  })
  return privacy.then(write)
}

Page({
  data: {
    theme: getThemeId(),
    mode: 'home',
    name: '',
    title: '',
    note: '',
    fieldName: true,
    useCustom: false,
    customFields: [],
    customSummary: '',
    customSheet: false,
    draftFields: [],
    draftLabel: '',
    draftKind: 'text',
    draftOptions: [],
    optionDraft: '',
    customKeyboardHeight: 0,
    events: [],
    eventPage: 1,
    eventPages: 1,
    eventTotal: 0,
    event: null,
    isOwner: false,
    records: [],
    creating: false,
    exporting: false,
    signSheet: false,
    pendingEventId: '',
    signFields: { name: true, place: false, customs: [] },
    signKeyboardHeight: 0,
    deleteAsk: null,
    closeAsk: false,
    qrFileID: ''
  },

  onLoad(query) {
    enableShareMenu()
    const raw = query && (query.scene || query.code || '')
    let eventId = ''
    try {
      eventId = parseCheckinCode(decodeURIComponent(raw))
    } catch (e) {
      eventId = parseCheckinCode(raw)
    }
    if (eventId) this._pendingScan = eventId
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    if (this._pendingScan) {
      const eventId = this._pendingScan
      this._pendingScan = ''
      openSignSheet(this, eventId)
    }
    if (this.data.mode === 'home') this.loadMine()
    else if (this.data.event) this.loadBoard(this.data.event.id)
  },

  onName(e) {
    this.setData({ name: (e.detail && e.detail.value) || '' })
  },

  onSignKeyboard(e) {
    const height = Number(e.detail && e.detail.height) || 0
    if (height === this.data.signKeyboardHeight) return
    this.setData({ signKeyboardHeight: height })
  },

  onTitle(e) {
    this.setData({ title: (e.detail && e.detail.value) || '' })
  },

  onNote(e) {
    this.setData({ note: (e.detail && e.detail.value) || '' })
  },

  onCustomValue(e) {
    const index = Number(e.currentTarget.dataset.index)
    const customs = ((this.data.signFields && this.data.signFields.customs) || []).slice()
    if (!customs[index]) return
    customs[index] = Object.assign({}, customs[index], { value: (e.detail && e.detail.value) || '' })
    this.setData({ 'signFields.customs': customs })
  },

  onSignCustomPick(e) {
    const index = Number(e.currentTarget.dataset.index)
    const customs = ((this.data.signFields && this.data.signFields.customs) || []).slice()
    const field = customs[index]
    if (!field) return
    const picked = Number(e.detail && e.detail.value)
    customs[index] = Object.assign({}, field, {
      index: picked,
      value: (field.options || [])[picked] || ''
    })
    this.setData({ 'signFields.customs': customs })
  },

  onCustomLabel(e) {
    this.setData({ draftLabel: (e.detail && e.detail.value) || '' })
  },

  onCustomKind(e) {
    const kind = e.currentTarget.dataset.kind === 'select' ? 'select' : 'text'
    this.setData({ draftKind: kind })
  },

  onOptionDraft(e) {
    this.setData({ optionDraft: (e.detail && e.detail.value) || '' })
  },

  onAddOption() {
    const text = String(this.data.optionDraft || '').trim().slice(0, 12)
    const options = this.data.draftOptions || []
    if (!text) {
      wx.showToast({ title: '请输入选项', icon: 'none' })
      return
    }
    if (options.indexOf(text) >= 0) {
      wx.showToast({ title: '选项已存在', icon: 'none' })
      return
    }
    if (options.length >= 10) {
      wx.showToast({ title: '最多十个选项', icon: 'none' })
      return
    }
    this.setData({ draftOptions: options.concat(text), optionDraft: '' })
  },

  onRemoveOption(e) {
    const index = Number(e.currentTarget.dataset.index)
    const options = (this.data.draftOptions || []).slice()
    if (index < 0 || index >= options.length) return
    options.splice(index, 1)
    this.setData({ draftOptions: options })
  },

  onCustomKeyboard(e) {
    const height = e.detail && e.detail.height ? e.detail.height : 0
    if (height === this.data.customKeyboardHeight) return
    this.setData({ customKeyboardHeight: height })
  },

  onOpenCustom() {
    this.setData({
      customSheet: true,
      draftFields: (this.data.customFields || []).map((item) => packField(item.label, item.kind, item.options)),
      draftLabel: '',
      draftKind: 'text',
      draftOptions: [],
      optionDraft: '',
      customKeyboardHeight: 0
    })
  },

  onCancelCustom() {
    this.setData({ customSheet: false, customKeyboardHeight: 0, optionDraft: '' })
  },

  readDraftField() {
    const label = String(this.data.draftLabel || '').trim().slice(0, 12)
    const kind = this.data.draftKind === 'select' ? 'select' : 'text'
    const options = kind === 'select' ? (this.data.draftOptions || []).slice(0, 10) : []
    if (!label) return { empty: true }
    if (kind === 'select' && options.length < 2) {
      wx.showToast({ title: '至少两个选项', icon: 'none' })
      return { error: true }
    }
    const fields = this.data.draftFields || []
    if (fields.some((item) => item.label === label)) {
      wx.showToast({ title: '字段名称重复', icon: 'none' })
      return { error: true }
    }
    if (fields.length >= 8) {
      wx.showToast({ title: '最多八个字段', icon: 'none' })
      return { error: true }
    }
    return { field: packField(label, kind, options) }
  },

  onAddDraftField() {
    const result = this.readDraftField()
    if (result.error) return
    if (result.empty) {
      wx.showToast({ title: '请填写字段名称', icon: 'none' })
      return
    }
    this.setData({
      draftFields: (this.data.draftFields || []).concat(result.field),
      draftLabel: '',
      draftOptions: [],
      optionDraft: ''
    })
  },

  onRemoveDraftField(e) {
    const index = Number(e.currentTarget.dataset.index)
    const fields = (this.data.draftFields || []).slice()
    if (index < 0 || index >= fields.length) return
    fields.splice(index, 1)
    this.setData({ draftFields: fields })
  },

  onConfirmCustom() {
    const pending = this.readDraftField()
    if (pending.error) return
    const customFields = (this.data.draftFields || []).slice()
    if (pending.field) customFields.push(pending.field)
    this.setData({
      customSheet: false,
      customKeyboardHeight: 0,
      useCustom: customFields.length > 0,
      customFields,
      customSummary: fieldSummary(customFields),
      draftLabel: '',
      draftOptions: [],
      optionDraft: ''
    })
  },

  onToggleField(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'name') this.setData({ fieldName: !this.data.fieldName })
  },

  loadMine(page) {
    const requested = Math.max(1, page || this.data.eventPage || 1)
    callCheckin('listMine', { page: requested })
      .then((result) => {
        const list = result.events || []
        const serverPaged = typeof result.total === 'number' && typeof result.pages === 'number'
        if (serverPaged) {
          this.setData({
            events: list,
            eventPage: result.page || 1,
            eventPages: result.pages || 1,
            eventTotal: result.total
          })
          return
        }
        const size = 5
        const total = list.length
        const pages = Math.max(1, Math.ceil(total / size) || 1)
        const current = Math.min(requested, pages)
        this.setData({
          events: list.slice((current - 1) * size, current * size),
          eventPage: current,
          eventPages: pages,
          eventTotal: total
        })
      })
      .catch(() => {})
  },

  onPrevEvents() {
    if (this.data.eventPage <= 1) return
    this.loadMine(this.data.eventPage - 1)
  },

  onNextEvents() {
    if (this.data.eventPage >= this.data.eventPages) return
    this.loadMine(this.data.eventPage + 1)
  },

  onScan() {
    wx.scanCode({
      scanType: ['qrCode', 'wxCode'],
      success: (res) => {
        const path = res && res.path ? String(res.path) : ''
        const sceneMatch = path.match(/[?&]scene=([^&]+)/)
        let eventId = ''
        if (sceneMatch) {
          try {
            eventId = parseCheckinCode(decodeURIComponent(sceneMatch[1]))
          } catch (e) {
            eventId = parseCheckinCode(sceneMatch[1])
          }
        }
        if (!eventId) eventId = parseCheckinCode(res && res.result)
        if (!eventId) {
          wx.showToast({ title: '这不是签到二维码', icon: 'none' })
          return
        }
        openSignSheet(this, eventId)
      }
    })
  },

  onCloseSign() {
    this.setData({ signSheet: false, pendingEventId: '', signKeyboardHeight: 0 })
  },

  onDeleteEvent(e) {
    const data = (e && e.currentTarget && e.currentTarget.dataset) || {}
    const event = data.id ? { id: data.id, title: data.title || '这次签到' } : this.data.event
    if (!event || !event.id) return
    this.setData({ deleteAsk: { id: event.id, title: event.title || '这次签到' } })
  },

  onCancelDelete() {
    this.setData({ deleteAsk: null })
  },

  onConfirmDelete() {
    const event = this.data.deleteAsk
    if (!event || !event.id) return
    this.setData({ deleteAsk: null })
    wx.showLoading({ title: '正在删除', mask: true })
    callCheckin('removeEvent', { eventId: event.id })
      .then(() => {
        wx.hideLoading()
        this.setData({ mode: 'home', event: null, records: [], isOwner: false, qrFileID: '' })
        const page = this.data.events.length <= 1 && this.data.eventPage > 1
          ? this.data.eventPage - 1
          : this.data.eventPage
        this.loadMine(page)
        wx.showToast({ title: '已删除', icon: 'none' })
      })
      .catch((err) => {
        wx.hideLoading()
        showCloudError(err)
      })
  },

  noop() {},

  onSubmitCheckIn() {
    const eventId = this.data.pendingEventId
    const fields = this.data.signFields || { name: true, customs: [] }
    const name = String(this.data.name || '').trim()
    const customs = (fields.customs || []).map((item) => ({
      label: item.label,
      value: String(item.value || '').trim()
    }))
    if (!eventId) return
    if (fields.name && !name) {
      wx.showToast({ title: '请填写姓名', icon: 'none' })
      return
    }
    const missing = (fields.customs || []).find((item, index) => {
      const value = customs[index] ? customs[index].value : ''
      if (item.kind === 'select') return (item.options || []).indexOf(value) < 0
      return !value
    })
    if (missing) {
      wx.showToast({ title: missing.kind === 'select' ? '请先选择' : '请填写字段', icon: 'none' })
      return
    }
    wx.showLoading({ title: '正在签到', mask: true })
    callCheckin('checkIn', { eventId, name, customs })
      .then((result) => {
        wx.hideLoading()
        this.setData({ signSheet: false, pendingEventId: '', signKeyboardHeight: 0 })
        const who = [name].concat(customs.map((item) => item.value)).filter(Boolean).join(' · ')
        wx.showModal({
          title: '签到成功',
          content: `${who} 已签到「${result.event.title}」`,
          showCancel: false,
          confirmText: '知道了'
        })
      })
      .catch((err) => {
        wx.hideLoading()
        showCloudError(err)
      })
  },

  onCreate() {
    if (this.data.creating) return
    const title = String(this.data.title || '').trim()
    if (!title) {
      wx.showToast({ title: '请填写签到名称', icon: 'none' })
      return
    }
    const customFields = this.data.customFields || []
    if (!this.data.fieldName && !customFields.length) {
      wx.showToast({ title: '请至少保留一个填写字段', icon: 'none' })
      return
    }
    const first = customFields[0] || {}
    this.setData({ creating: true })
    callCheckin('createEvent', {
      title,
      note: this.data.note,
      fieldName: this.data.fieldName,
      fieldPlace: false,
      useCustom: customFields.length > 0,
      customLabel: first.label || '',
      customKind: first.kind || 'text',
      customOptions: first.options || [],
      customFields
    })
      .then((result) => {
        this.setData({
          creating: false,
          title: '',
          note: '',
          mode: 'board',
          event: decorateEvent(result.event),
          isOwner: true,
          records: []
        })
        this.loadCodeImage(result.event.id)
      })
      .catch((err) => {
        this.setData({ creating: false })
        showCloudError(err)
      })
  },

  onOpenEvent(e) {
    const data = e.currentTarget.dataset || {}
    if (!data.id) return
    this.loadBoard(data.id, {
      id: data.id,
      title: data.title || '签到',
      note: data.note || '',
      status: data.status || 'open',
      createdAt: data.created || ''
    })
  },

  openBoardAnyway(eventId, fallback) {
    const event = fallback || this.data.event
    if (!event || !event.id) {
      showCloudError(new Error('签到记录还没建立，请稍后再查看名单'))
      return
    }
    this.setData({
      mode: 'board',
      event: decorateEvent(Object.assign({}, event, { id: event.id || eventId })),
      isOwner: true,
      records: []
    })
    this.loadCodeImage(event.id || eventId)
  },

  loadBoard(eventId, fallback) {
    callCheckin('listRecords', { eventId })
      .then((result) => {
        this.setData({
          mode: 'board',
          event: decorateEvent(result.event),
          isOwner: true,
          records: result.records || []
        })
        this.loadCodeImage(result.event.id)
      })
      .catch((err) => {
        const msg = cloudMessage(err)
        if (/502005|collection not exist|not exists/i.test(msg)) {
          this.openBoardAnyway(eventId, fallback)
          return
        }
        showCloudError(err)
      })
  },

  onBackHome() {
    this.setData({ mode: 'home', event: null, records: [], isOwner: false, qrFileID: '' })
    this.loadMine()
  },

  onToggleStatus() {
    const event = this.data.event
    if (!event) return
    if (event.status !== 'closed') {
      this.setData({ closeAsk: true })
      return
    }
    wx.showModal({
      title: '重新开启签到？',
      content: '开启后可以继续扫码签到。',
      confirmText: '开启',
      success: (res) => {
        if (!res.confirm) return
        this.setEventStatus('open')
      }
    })
  },

  onCancelClose() {
    this.setData({ closeAsk: false })
  },

  onConfirmClose() {
    this.setData({ closeAsk: false })
    this.setEventStatus('closed')
  },

  setEventStatus(status) {
    const event = this.data.event
    if (!event) return
    callCheckin(status === 'closed' ? 'closeEvent' : 'openEvent', { eventId: event.id })
      .then((result) => {
        this.setData({ event: decorateEvent(result.event) })
      })
      .catch((err) => {
        showCloudError(err)
      })
  },

  onSaveQr() {
    this.qrImagePath()
      .then((filePath) => this.composeQrPoster(filePath))
      .then((filePath) => saveQrToAlbum(filePath))
      .then(() => {
        wx.showToast({ title: '已保存到相册', icon: 'none' })
      })
      .catch((err) => {
        const msg = (err && (err.errMsg || err.message)) || ''
        if (/cancel/i.test(msg)) return
        if (/privacy/i.test(msg)) {
          wx.showModal({
            title: '无法保存到相册',
            content: '请先在微信公众平台声明「将文件保存到相册」。',
            showCancel: false,
            confirmText: '知道了'
          })
          return
        }
        if (/auth deny|authorize|permission|auth denied/i.test(msg)) {
          wx.showModal({
            title: '需要相册权限',
            content: '保存二维码需要允许访问相册。',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting()
            }
          })
          return
        }
        wx.showToast({ title: '图片保存失败', icon: 'none' })
      })
  },

  composeQrPoster(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src,
        success: (info) => {
          wx.createSelectorQuery()
            .in(this)
            .select('#qrPoster')
            .fields({ node: true, size: true })
            .exec((res) => {
              const canvas = res && res[0] && res[0].node
              if (!canvas) {
                reject(new Error('二维码还没准备好'))
                return
              }
              const qr = Math.max(info.width, info.height)
              const pad = Math.round(qr * 0.08)
              const fontSize = Math.max(28, Math.round(qr * 0.07))
              const textH = Math.round(fontSize * 2.4)
              const width = qr + pad * 2
              const height = pad + qr + textH
              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext('2d')
              const image = canvas.createImage()
              image.onload = () => {
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, width, height)
                ctx.drawImage(image, pad, pad, qr, qr)
                ctx.fillStyle = '#14231c'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.font = `700 ${fontSize}px sans-serif`
                ctx.fillText('小小便民工具箱', width / 2, pad + qr + textH / 2)
                wx.canvasToTempFilePath({
                  canvas,
                  fileType: 'png',
                  destWidth: width,
                  destHeight: height,
                  success: (file) => resolve(file.tempFilePath),
                  fail: reject
                }, this)
              }
              image.onerror = () => reject(new Error('二维码还没准备好'))
              image.src = src
            })
        },
        fail: reject
      })
    })
  },

  qrImagePath() {
    if (this.data.qrFileID) return Promise.resolve(this.data.qrFileID)
    return new Promise((resolve, reject) => {
      wx.createSelectorQuery()
        .in(this)
        .select('#checkinQr')
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res && res[0] && res[0].node
          if (!canvas) {
            reject(new Error('二维码还没准备好'))
            return
          }
          wx.canvasToTempFilePath({
            canvas,
            fileType: 'png',
            success: (file) => resolve(file.tempFilePath),
            fail: reject
          }, this)
        })
    })
  },

  onExport() {
    const event = this.data.event
    if (!event || this.data.exporting) return
    const fields = event.fields || { name: true, place: true, customs: [] }
    const customs = (fields.customs && fields.customs.length)
      ? fields.customs
      : (fields.customLabel ? [{ label: fields.customLabel }] : [])
    const header = ['序号']
    if (fields.name !== false) header.push('姓名')
    customs.forEach((item) => header.push(item.label))
    header.push('签到时间', '签到名称')
    const widthOf = { 序号: 10, 姓名: 16, 签到时间: 28, 签到名称: 24 }
    const widths = header.map((name) => widthOf[name] || 18)
    const rows = [header]
    ;(this.data.records || []).forEach((row) => {
      const line = [row.index]
      if (fields.name !== false) line.push(row.name || '')
      const values = Array.isArray(row.customs) ? row.customs : []
      customs.forEach((item) => {
        const found = values.find((entry) => entry && entry.label === item.label)
        line.push((found && found.value) || (customs.length === 1 ? (row.customValue || '') : ''))
      })
      line.push(row.time || '', event.title || '')
      rows.push(line)
    })
    if (rows.length === 1) rows.push(['', '暂无签到'])
    this.setData({ exporting: true })
    wx.showLoading({ title: '正在导出', mask: true })
    exportTableToExcel({
      sheetName: '签到',
      fileName: '签到名单',
      rows,
      widths
    })
      .then((filePath) => openExcelFile(filePath))
      .then(() => {
        wx.hideLoading()
        this.setData({ exporting: false })
      })
      .catch((err) => {
        wx.hideLoading()
        this.setData({ exporting: false })
        const message = (err && (err.errMsg || err.message)) || ''
        wx.showModal({
          title: '导出失败',
          content: message ? String(message).slice(0, 80) : '表格没有生成，请再试一次',
          showCancel: false,
          confirmText: '知道了'
        })
      })
  },

  loadCodeImage(eventId) {
    if (!eventId) return
    callCheckin('getCodeImage', { eventId, envVersion: miniEnv() })
      .then((result) => {
        if (!this.data.event || this.data.event.id !== eventId || !result.image) {
          this.drawQr(`CKIN:${eventId}`)
          return
        }
        const filePath = `${wx.env.USER_DATA_PATH}/checkin-${eventId}.png`
        wx.getFileSystemManager().writeFile({
          filePath,
          data: result.image,
          encoding: 'base64',
          success: () => {
            if (!this.data.event || this.data.event.id !== eventId) return
            this.setData({ qrFileID: filePath })
          },
          fail: () => this.drawQr(`CKIN:${eventId}`)
        })
      })
      .catch(() => {
        if (!this.data.event || this.data.event.id !== eventId) return
        this.setData({ qrFileID: '' })
        this.drawQr(`CKIN:${eventId}`)
      })
  },

  drawQr(text, attempt) {
    const encoded = encodeQr(text)
    if (!encoded.ok) return
    const left = attempt == null ? 8 : attempt
    wx.nextTick(() => {
      wx.createSelectorQuery()
        .in(this)
        .select('#checkinQr')
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res && res[0] && res[0].node
          if (!canvas) {
            if (left > 0) setTimeout(() => this.drawQr(text, left - 1), 60)
            return
          }
          const modules = encoded.modules
          const n = modules.length
          const quiet = 4
          const cells = n + quiet * 2
          const scale = 8
          const pixel = scale * cells
          canvas.width = pixel
          canvas.height = pixel
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, pixel, pixel)
          ctx.fillStyle = '#111111'
          for (let y = 0; y < n; y += 1) {
            for (let x = 0; x < n; x += 1) {
              if (!modules[y][x]) continue
              ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale)
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
