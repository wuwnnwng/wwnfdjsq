/**
 * 将计算结果绘制为长图，便于分享完整「提前还款说明 + 还款计划」
 */

function round2(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round((x + Number.EPSILON) * 100) / 100
}

function formatMoney(n) {
  const x = round2(n)
  const fixed = x.toFixed(2)
  const [intPart, decimal] = fixed.split('.')
  return `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimal}`
}

function drawRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function createShareCanvas(width, height) {
  if (wx.createOffscreenCanvas) {
    const canvas = wx.createOffscreenCanvas({ type: '2d', width, height })
    const ctx = canvas.getContext('2d')
    return { canvas, ctx, offscreen: true }
  }
  return null
}

function paintShareImage(ctx, width, view, theme) {
  const brand = (theme && theme.navBar) || '#0B3D2E'
  const soft = (theme && theme.principal) || '#1f6b52'
  const ink = (theme && theme.ink) || '#14231c'
  const muted = '#5f7268'
  const line = 'rgba(20,35,28,0.1)'
  const bg = (theme && theme.pageBg) || '#F3F6F4'

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, 10000)

  let y = 48
  const pad = 36
  const contentW = width - pad * 2

  ctx.fillStyle = brand
  ctx.font = 'bold 36px sans-serif'
  ctx.fillText('房贷计算结果', pad, y)
  y += 44

  ctx.fillStyle = muted
  ctx.font = '24px sans-serif'
  const sub = [view.loanTypeLabel, view.methodLabel].filter(Boolean).join(' · ')
  ctx.fillText(sub || '计算结果分享', pad, y)
  y += 50

  // 摘要卡
  drawRoundRect(ctx, pad, y, contentW, 150, 18)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.fillStyle = muted
  ctx.font = '22px sans-serif'
  ctx.fillText(view.paymentLabel || '每月还款', pad + 28, y + 42)
  ctx.fillStyle = brand
  ctx.font = 'bold 48px sans-serif'
  ctx.fillText(`${view.summaryPayment || '0.00'} 元`, pad + 28, y + 100)
  y += 178

  const metrics = [
    ['贷款/剩余本金', (view.display && view.display.totalPrincipal) || '--'],
    ['利息', (view.display && view.display.totalInterest) || '--'],
    ['还款总额', (view.display && view.display.totalPayment) || '--']
  ]
  if (view.display && view.display.annualRate) {
    metrics.push(['执行利率', `${view.display.annualRate}%`])
  }

  const cardH = 36 + metrics.length * 48
  drawRoundRect(ctx, pad, y, contentW, cardH, 18)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  metrics.forEach((item, idx) => {
    const rowY = y + 40 + idx * 48
    ctx.fillStyle = ink
    ctx.font = '24px sans-serif'
    ctx.fillText(item[0], pad + 28, rowY)
    ctx.fillStyle = soft
    ctx.font = 'bold 24px sans-serif'
    const tw = ctx.measureText(String(item[1])).width
    ctx.fillText(String(item[1]), pad + contentW - 28 - tw, rowY)
  })
  y += cardH + 28

  // 提前还款说明
  if (view.isEarlyRepayment && view.earlyInfo) {
    const earlyRows = []
    if (view.earlyInfo.typeLabel) earlyRows.push(['提前还款类型', view.earlyInfo.typeLabel])
    if (view.earlyInfo.adjustLabel) earlyRows.push(['调整方式', view.earlyInfo.adjustLabel])
    if (view.earlyInfo.nextRepaymentDate) {
      earlyRows.push(['提前还款日期', view.earlyInfo.nextRepaymentDate])
    }
    if (view.earlyInfo.afterMonths) {
      earlyRows.push(['提前后剩余期数', `${view.earlyInfo.afterMonths} 期`])
    }
    if (view.earlyInfo.prepayAmount) earlyRows.push(['提前还款额', view.earlyInfo.prepayAmount])
    if (view.earlyInfo.interestSaved) earlyRows.push(['预计节省利息', view.earlyInfo.interestSaved])

    if (earlyRows.length) {
      ctx.fillStyle = brand
      ctx.font = 'bold 28px sans-serif'
      ctx.fillText('提前还款说明', pad, y)
      y += 24

      const earlyH = 36 + earlyRows.length * 48
      drawRoundRect(ctx, pad, y, contentW, earlyH, 18)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      earlyRows.forEach((item, idx) => {
        const rowY = y + 40 + idx * 48
        ctx.fillStyle = ink
        ctx.font = '24px sans-serif'
        ctx.fillText(item[0], pad + 28, rowY)
        ctx.fillStyle = soft
        ctx.font = 'bold 22px sans-serif'
        const label = String(item[1])
        const tw = ctx.measureText(label).width
        const maxW = contentW - 220
        if (tw > maxW) {
          ctx.font = 'bold 18px sans-serif'
        }
        const tw2 = ctx.measureText(label).width
        ctx.fillText(label, pad + contentW - 28 - tw2, rowY)
      })
      y += earlyH + 28
    }
  }

  // 还款计划
  const schedule = Array.isArray(view.schedule) ? view.schedule : []
  const maxRows = Math.min(schedule.length, 120)
  ctx.fillStyle = brand
  ctx.font = 'bold 28px sans-serif'
  ctx.fillText(`还款计划（共 ${view.months || schedule.length} 期）`, pad, y)
  y += 24

  const headH = 44
  const rowH = 40
  const tableH = headH + maxRows * rowH + 24
  drawRoundRect(ctx, pad, y, contentW, tableH, 18)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  const cols = [70, 150, 150, 140, 150]
  const headers = ['期数', '月供', '本金', '利息', '剩余']
  let x = pad + 16
  ctx.fillStyle = muted
  ctx.font = '20px sans-serif'
  headers.forEach((h, i) => {
    ctx.fillText(h, x, y + 30)
    x += cols[i]
  })
  ctx.strokeStyle = line
  ctx.beginPath()
  ctx.moveTo(pad + 16, y + headH)
  ctx.lineTo(pad + contentW - 16, y + headH)
  ctx.stroke()

  for (let i = 0; i < maxRows; i += 1) {
    const item = schedule[i]
    const rowY = y + headH + 28 + i * rowH
    const values = [
      String(item.month || i + 1),
      formatMoney(item.payment),
      formatMoney(item.principal),
      formatMoney(item.interest),
      formatMoney(item.remaining)
    ]
    x = pad + 16
    ctx.fillStyle = ink
    ctx.font = '18px sans-serif'
    values.forEach((val, idx) => {
      ctx.fillText(val, x, rowY)
      x += cols[idx]
    })
  }
  y += tableH + 20

  if (schedule.length > maxRows) {
    ctx.fillStyle = muted
    ctx.font = '20px sans-serif'
    ctx.fillText(`仅展示前 ${maxRows} 期，完整共 ${schedule.length} 期`, pad, y)
    y += 36
  }

  ctx.fillStyle = muted
  ctx.font = '20px sans-serif'
  ctx.fillText('来自「房贷计算器」小程序 · 结果仅供参考', pad, y)
  y += 48

  return y
}

function estimateShareImageHeight(view) {
  let h = 48 + 44 + 50 + 178
  const metricCount = 3 + ((view.display && view.display.annualRate) ? 1 : 0)
  h += 36 + metricCount * 48 + 28
  if (view.isEarlyRepayment && view.earlyInfo) {
    let earlyCount = 0
    if (view.earlyInfo.typeLabel) earlyCount += 1
    if (view.earlyInfo.adjustLabel) earlyCount += 1
    if (view.earlyInfo.nextRepaymentDate) earlyCount += 1
    if (view.earlyInfo.afterMonths) earlyCount += 1
    if (view.earlyInfo.prepayAmount) earlyCount += 1
    if (view.earlyInfo.interestSaved) earlyCount += 1
    if (earlyCount) h += 24 + 36 + earlyCount * 48 + 28
  }
  const schedule = Array.isArray(view.schedule) ? view.schedule : []
  const maxRows = Math.min(schedule.length, 120)
  h += 24 + 44 + maxRows * 40 + 24 + 20 + 48
  if (schedule.length > maxRows) h += 36
  return Math.max(h, 800)
}

/**
 * 生成分享长图临时路径
 */
function generateResultShareImage(view, theme) {
  return new Promise((resolve, reject) => {
    const width = 750
    const height = estimateShareImageHeight(view)
    const created = createShareCanvas(width, height)

    if (!created) {
      reject(new Error('current base library cannot create offscreen canvas'))
      return
    }

    const { canvas, ctx } = created
    canvas.width = width
    canvas.height = height
    paintShareImage(ctx, width, view, theme)

    wx.canvasToTempFilePath({
      canvas,
      fileType: 'png',
      quality: 1,
      success(res) {
        resolve(res.tempFilePath)
      },
      fail: reject
    })
  })
}

function shareResultLongImage(view, theme) {
  wx.showLoading({ title: '生成长图中', mask: true })
  return generateResultShareImage(view, theme)
    .then((filePath) => {
      wx.hideLoading()
      if (wx.showShareImageMenu) {
        return new Promise((resolve, reject) => {
          wx.showShareImageMenu({
            path: filePath,
            success: resolve,
            fail: reject
          })
        })
      }
      return new Promise((resolve, reject) => {
        wx.previewImage({
          urls: [filePath],
          current: filePath,
          success: resolve,
          fail: reject
        })
      })
    })
    .catch((err) => {
      wx.hideLoading()
      wx.showToast({
        title: '长图生成失败，请升级微信后重试',
        icon: 'none'
      })
      return Promise.reject(err)
    })
}

module.exports = {
  generateResultShareImage,
  shareResultLongImage,
  estimateShareImageHeight
}
