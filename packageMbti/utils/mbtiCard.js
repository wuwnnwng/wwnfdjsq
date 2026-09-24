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
  if (w <= 0 || h <= 0) return
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

function hexToRgba(hex, alpha) {
  const raw = String(hex || '').replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw
  const n = parseInt(full, 16)
  if (!isFinite(n) || full.length < 6) return `rgba(255,255,255,${alpha})`
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function formatCardDate(date) {
  const d = date instanceof Date ? date : new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function fillBar(ctx, x, y, width, height, dim, color) {
  fillRoundRect(ctx, x, y, width, height, height / 2, 'rgba(20, 35, 28, 0.08)')
  const percent = dim.tie ? 100 : dim.percent
  const barW = Math.max(height, (Math.max(8, Math.min(100, percent)) / 100) * width)
  const bx = !dim.tie && dim.fillFrom === 'right' ? x + width - barW : x
  ctx.save()
  if (dim.tie) ctx.globalAlpha = 0.35
  fillRoundRect(ctx, bx, y, barW, height, height / 2, color)
  ctx.restore()
}

function drawMbtiCard(ctx, width, height, result) {
  const group = (result && result.group) || {}
  const card = group.card || [group.color || '#6D4DB5', group.color2 || '#9B7BE0']
  const on = group.cardInk || '#ffffff'
  const ink = '#14231c'
  const muted = '#64748b'
  const pad = 22

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = '400 13px sans-serif'
  const motto = wrapText(ctx, (result && result.motto) || '', width - pad * 2).slice(0, 2)
  const keywords = ((result && result.keywords) || []).join('  ·  ')
  const headerH = 168 + motto.length * 20 + (keywords ? 24 : 0)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const gradient = ctx.createLinearGradient(0, 0, width, headerH)
  gradient.addColorStop(0, card[0])
  gradient.addColorStop(1, card[1])
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, headerH)

  ctx.save()
  ctx.globalAlpha = 0.16
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(width - 6, 4, 84, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = hexToRgba(on, 0.78)
  ctx.font = '600 12px sans-serif'
  ctx.fillText('小小便民工具箱', pad, 30)
  ctx.font = '600 13px sans-serif'
  const mark = group.mark ? ` · ${group.mark}` : ''
  ctx.fillText(`${group.name || '16型人格'}${mark}`, pad, 52)

  ctx.fillStyle = on
  ctx.font = '800 56px sans-serif'
  ctx.fillText((result && result.code) || '', pad, 116)
  ctx.font = '700 22px sans-serif'
  ctx.fillText((result && result.name) || '', pad, 148)

  ctx.font = '400 13px sans-serif'
  ctx.fillStyle = hexToRgba(on, 0.92)
  motto.forEach((line, index) => {
    ctx.fillText(line, pad, 174 + index * 20)
  })
  if (keywords) {
    ctx.font = '600 12px sans-serif'
    ctx.fillStyle = hexToRgba(on, 0.88)
    ctx.fillText(fitText(ctx, keywords, width - pad * 2), pad, 174 + motto.length * 20 + 6)
  }

  let y = headerH + 28
  const dims = (result && result.dims) || []
  if (dims.length) {
    dims.forEach((dim) => {
      ctx.font = '600 12px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillStyle = dim.leftWin ? card[0] : muted
      ctx.fillText(`${dim.leftName} ${dim.leftPercent}%`, pad, y)
      ctx.textAlign = 'center'
      ctx.fillStyle = muted
      ctx.font = '600 11px sans-serif'
      ctx.fillText(dim.clarity || '', width / 2, y)
      ctx.textAlign = 'right'
      ctx.font = '600 12px sans-serif'
      ctx.fillStyle = dim.rightWin ? card[0] : muted
      ctx.fillText(`${dim.rightName} ${dim.rightPercent}%`, width - pad, y)
      fillBar(ctx, pad, y + 10, width - pad * 2, 8, dim, card[0])
      y += 40
    })
    if (result.focus) {
      y += 8
      ctx.textAlign = 'left'
      ctx.fillStyle = ink
      ctx.font = '600 13px sans-serif'
      ctx.fillText(fitText(ctx, result.focus, width - pad * 2), pad, y)
    }
  } else {
    ctx.textAlign = 'left'
    ctx.fillStyle = ink
    ctx.font = '400 14px sans-serif'
    wrapText(ctx, (result && result.summary) || '', width - pad * 2)
      .slice(0, 6)
      .forEach((line) => {
        ctx.fillText(line, pad, y)
        y += 24
      })
  }

  ctx.fillStyle = '#94a3b8'
  ctx.font = '400 11px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('趣味自测 · 仅供参考', pad, height - 22)
  ctx.textAlign = 'right'
  ctx.fillText(formatCardDate(), width - pad, height - 22)
}

module.exports = {
  drawMbtiCard
}
