/**
 * 年龄 / BMI 结果卡片：绘制并保存到相册
 */
const { LEVELS, trackFlex } = require('./bmiCalc')

const APP_BRAND = '置居试算计算器'
const SAVE_FILE = 'result-card.png'

const BMI_LEVEL_STYLE = {
  under: { accent: '#2563eb', soft: '#eff6ff', header: ['#60a5fa', '#2563eb'] },
  normal: { accent: '#059669', soft: '#ecfdf5', header: ['#34d399', '#059669'] },
  over: { accent: '#d97706', soft: '#fffbeb', header: ['#fbbf24', '#d97706'] },
  obese: { accent: '#dc2626', soft: '#fef2f2', header: ['#f87171', '#dc2626'] }
}

function getDpr() {
  try {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    return info.pixelRatio || 2
  } catch (e) {
    return 2
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function fillRoundRect(ctx, x, y, w, h, r, color) {
  roundRectPath(ctx, x, y, w, h, r)
  ctx.fillStyle = color
  ctx.fill()
}

function fitText(ctx, text, maxWidth) {
  const raw = String(text == null ? '' : text)
  if (!raw || ctx.measureText(raw).width <= maxWidth) return raw
  const ellipsis = '…'
  let next = raw
  while (next.length && ctx.measureText(next + ellipsis).width > maxWidth) {
    next = next.slice(0, -1)
  }
  return next + ellipsis
}

function wrapText(ctx, text, maxWidth) {
  const chars = String(text || '').split('')
  const lines = []
  let line = ''
  chars.forEach((ch) => {
    const next = line + ch
    if (ctx.measureText(next).width <= maxWidth) {
      line = next
      return
    }
    if (line) lines.push(line)
    line = ch
  })
  if (line) lines.push(line)
  return lines
}

function formatCardDate(date) {
  const d = date instanceof Date ? date : new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function errorMessage(err) {
  if (!err) return ''
  if (typeof err === 'string') return err
  return err.errMsg || err.message || ''
}

function isPrivacyError(err) {
  return /privacy|隐私|not declared|privacy permission/i.test(errorMessage(err))
}

function isAuthError(err) {
  if (isPrivacyError(err)) return false
  return /auth deny|authorize|permission|auth denied/i.test(errorMessage(err))
}

function requirePrivacy() {
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
}

function ensureAlbumAuth() {
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
            content: '保存卡片需要访问相册，请在设置中允许。',
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
        wx.authorize({
          scope: 'scope.writePhotosAlbum',
          success: resolve,
          fail: reject
        })
      },
      fail: reject
    })
  })
}

function queryCanvas(page, canvasId) {
  return new Promise((resolve, reject) => {
    page
      .createSelectorQuery()
      .select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res && res[0]
        if (!info || !info.node) {
          reject({ errMsg: 'canvas missing' })
          return
        }
        resolve(info)
      })
  })
}

function waitFrame(canvas) {
  return new Promise((resolve) => {
    if (canvas && typeof canvas.requestAnimationFrame === 'function') {
      canvas.requestAnimationFrame(() => resolve())
      return
    }
    setTimeout(resolve, 48)
  })
}

function exportCanvasFile(canvas) {
  return new Promise((resolve, reject) => {
    const dest = `${wx.env.USER_DATA_PATH}/${SAVE_FILE}`
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
      wx.canvasToTempFilePath(
        {
          canvas,
          fileType: 'png',
          success: (res) => resolve(res.tempFilePath),
          fail: reject
        }
      )
    }
    writeBase64()
  })
}

function saveToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: reject
    })
  })
}

function handleSaveError(err) {
  if (isPrivacyError(err)) {
    wx.showModal({
      title: '无法保存到相册',
      content: '正式版需在微信公众平台声明「将文件保存到相册」。',
      showCancel: false,
      confirmText: '知道了'
    })
    return
  }
  if (isAuthError(err)) {
    wx.showModal({
      title: '需要相册权限',
      content: '保存卡片需要访问相册，请在设置中允许。',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) wx.openSetting()
      }
    })
    return
  }
  wx.showToast({ title: '保存失败，请稍后重试', icon: 'none' })
}

function drawHeader(ctx, width, headerH, title, colors) {
  const gradient = ctx.createLinearGradient(0, 0, width, headerH)
  gradient.addColorStop(0, colors[0])
  gradient.addColorStop(1, colors[1])
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, headerH)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)'
  ctx.font = '600 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(APP_BRAND, 24, 32)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 26px sans-serif'
  ctx.fillText(title, 24, 64)
}

function drawFooter(ctx, width, height, note) {
  ctx.fillStyle = '#94a3b8'
  ctx.font = '400 11px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(note || '结果仅供参考', 24, height - 28)
  ctx.textAlign = 'right'
  ctx.fillText(formatCardDate(), width - 24, height - 28)
}

function drawMetaRow(ctx, x, y, width, label, value, ink, muted) {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = muted
  ctx.font = '400 13px sans-serif'
  ctx.fillText(label, x, y)
  const labelW = ctx.measureText(label).width
  ctx.textAlign = 'right'
  ctx.fillStyle = ink
  ctx.font = '600 13px sans-serif'
  ctx.fillText(fitText(ctx, value, width - labelW - 12), x + width, y)
}

function drawBmiTrack(ctx, x, y, width, height, markerPercent) {
  const segs = LEVELS.map((item) => ({
    flex: trackFlex(item),
    color: item.color
  }))
  const total = segs.reduce((sum, item) => sum + item.flex, 0)
  roundRectPath(ctx, x, y, width, height, height / 2)
  ctx.save()
  ctx.clip()
  let left = x
  segs.forEach((seg) => {
    const segW = (seg.flex / total) * width
    ctx.fillStyle = seg.color
    ctx.fillRect(left, y, segW + 0.5, height)
    left += segW
  })
  ctx.restore()

  const mx = x + (Math.max(0, Math.min(100, markerPercent)) / 100) * width
  ctx.fillStyle = '#14231c'
  roundRectPath(ctx, mx - 1.5, y - 4, 3, height + 8, 1.5)
  ctx.fill()
}

function drawBmiCard(ctx, width, height, result) {
  const style = BMI_LEVEL_STYLE[result.levelId] || BMI_LEVEL_STYLE.normal
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  drawHeader(ctx, width, 88, 'BMI 体重', style.header)

  const ink = '#14231c'
  const muted = '#64748b'
  let y = 118

  ctx.fillStyle = muted
  ctx.font = '600 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('身体质量指数 BMI', 24, y)

  ctx.fillStyle = style.accent
  ctx.font = '800 54px sans-serif'
  ctx.fillText(result.bmiText, 24, y + 58)

  const pillText = result.levelName
  ctx.font = '700 13px sans-serif'
  const pillW = Math.max(72, ctx.measureText(pillText).width + 24)
  fillRoundRect(ctx, width - 24 - pillW, y + 28, pillW, 28, 14, style.soft)
  ctx.fillStyle = style.accent
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(pillText, width - 24 - pillW / 2, y + 42)

  y += 92
  ctx.strokeStyle = 'rgba(20, 35, 28, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(24, y)
  ctx.lineTo(width - 24, y)
  ctx.stroke()

  y += 28
  const rowW = width - 48
  drawMetaRow(ctx, 24, y, rowW, '身高', `${result.heightText} 厘米`, ink, muted)
  drawMetaRow(ctx, 24, y + 32, rowW, '体重', `${result.weightText} 公斤`, ink, muted)
  drawMetaRow(ctx, 24, y + 64, rowW, '健康体重', result.rangeText.replace(' 公斤', '') + ' 公斤', ink, muted)

  y += 100
  drawBmiTrack(ctx, 24, y, rowW, 10, result.markerPercent)
  y += 22
  const labels = [
    { text: '过低', flex: 4.5 },
    { text: '正常', flex: 5.5 },
    { text: '超重', flex: 4 },
    { text: '肥胖', flex: 8 }
  ]
  ctx.font = '400 10px sans-serif'
  ctx.fillStyle = muted
  ctx.textBaseline = 'top'
  let lx = 24
  const trackTotal = 4.5 + 5.5 + 4 + 8
  labels.forEach((item) => {
    const lw = (item.flex / trackTotal) * rowW
    ctx.textAlign = 'center'
    ctx.fillText(item.text, lx + lw / 2, y)
    lx += lw
  })

  y += 36
  ctx.font = '400 13px sans-serif'
  const hintLines = wrapText(ctx, result.hint || '', rowW)
  ctx.fillStyle = ink
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  hintLines.slice(0, 3).forEach((line, index) => {
    ctx.fillText(line, 24, y + index * 20)
  })

  drawFooter(ctx, width, height, '依据 WS/T 428 · 仅供参考')
}

function drawAgeCard(ctx, width, height, result) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  drawHeader(ctx, width, 88, '年龄', ['#f9a8d4', '#db2777'])

  const ink = '#14231c'
  const muted = '#64748b'
  let y = 118

  ctx.fillStyle = muted
  ctx.font = '600 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('周岁', 24, y)

  ctx.fillStyle = '#db2777'
  ctx.font = '800 48px sans-serif'
  ctx.fillText(result.yearText, 24, y + 54)

  ctx.fillStyle = ink
  ctx.font = '600 14px sans-serif'
  ctx.fillText(`已活 ${result.livedDaysText} 天`, 24, y + 84)

  y += 108
  ctx.strokeStyle = 'rgba(20, 35, 28, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(24, y)
  ctx.lineTo(width - 24, y)
  ctx.stroke()

  y += 26
  const rowW = width - 48
  const rows = [
    ['公历生日', `${result.birthdayText} · ${result.birthdayWeek}`],
    ['农历生日', result.birthdayLunar],
    ['生肖 / 星座', `${result.zodiac} · ${result.constellation}`],
    ['虚岁', result.nominalText],
    ['下次生日', result.nextBirthdayText]
  ]
  rows.forEach((row, index) => {
    drawMetaRow(ctx, 24, y + index * 30, rowW, row[0], row[1], ink, muted)
  })

  y += rows.length * 30 + 18
  ctx.fillStyle = '#db2777'
  ctx.font = '700 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('生命进度', 24, y)
  ctx.textAlign = 'right'
  ctx.fillText(result.lifeProgressText, width - 24, y)

  y += 18
  fillRoundRect(ctx, 24, y, rowW, 10, 5, 'rgba(244, 114, 182, 0.18)')
  const barW = Math.max(6, (Math.max(0, Math.min(100, Number(result.lifeProgressBar) || 0)) / 100) * rowW)
  const barGrad = ctx.createLinearGradient(24, y, 24 + barW, y)
  barGrad.addColorStop(0, '#f9a8d4')
  barGrad.addColorStop(1, '#db2777')
  fillRoundRect(ctx, 24, y, barW, 10, 5, barGrad)

  drawFooter(ctx, width, height, '趣味计算，好好生活')
}

function saveResultCard(page, canvasId, painter) {
  return requirePrivacy()
    .then(() => ensureAlbumAuth())
    .then(() => queryCanvas(page, canvasId))
    .then((info) => {
      const canvas = info.node
      const ctx = canvas.getContext('2d')
      const dpr = getDpr()
      const width = info.width || 300
      const height = info.height || 500
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)
      painter(ctx, width, height)
      return waitFrame(canvas).then(() => exportCanvasFile(canvas))
    })
    .then((filePath) => saveToAlbum(filePath))
}

module.exports = {
  saveResultCard,
  handleSaveError,
  drawBmiCard,
  drawAgeCard
}
