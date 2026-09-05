const { PROVINCES, hexToRgba } = require('./provinces')
const { drawChinaMap, toVisitedMap } = require('./chinaMap')

const APP_BRAND = '置居试算计算器'

function formatCardDate(date) {
  const d = date instanceof Date ? date : new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
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

function drawFootprintCard(ctx, width, height, view) {
  const title = view.title || '我的足迹'
  const visitedIds = view.visitedIds || []
  const focusId = view.focusId || ''
  const theme = view.theme
  const from = (theme && (theme.brandSoft || theme.principal)) || '#22D3EE'
  const to = (theme && (theme.brand || theme.navBar)) || '#0B1220'
  const selected = PROVINCES.filter((item) => visitedIds.indexOf(item.id) >= 0)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const headerH = 88
  const gradient = ctx.createLinearGradient(0, 0, width, headerH)
  gradient.addColorStop(0, from)
  gradient.addColorStop(1, to)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, headerH)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)'
  ctx.font = '600 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(APP_BRAND, 24, 32)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 26px sans-serif'
  ctx.fillText(fitText(ctx, title, width - 48), 24, 64)

  const mapX = 16
  const mapY = 102
  const mapW = width - 32
  const mapH = 200
  fillRoundRect(ctx, mapX, mapY, mapW, mapH, 16, '#f1f5f9')
  ctx.save()
  roundRectPath(ctx, mapX + 6, mapY + 6, mapW - 12, mapH - 12, 12)
  ctx.clip()
  drawChinaMap(ctx, mapX + 6, mapY + 6, mapW - 12, mapH - 12, {
    visited: toVisitedMap(visitedIds),
    focusId,
    theme: { id: 'forest' }
  })
  ctx.restore()

  const count = selected.length
  const ink = '#14231c'
  const muted = '#64748b'
  let y = mapY + mapH + 28

  ctx.fillStyle = from
  ctx.font = '800 36px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const countW = ctx.measureText(String(count)).width
  ctx.fillText(String(count), 24, y)

  ctx.fillStyle = ink
  ctx.font = '700 15px sans-serif'
  ctx.fillText('个省级行政区', 24 + countW + 10, y)

  ctx.fillStyle = muted
  ctx.font = '400 12px sans-serif'
  ctx.fillText(count ? '点亮过的地方，都记在这张地图上' : '还没有点亮省份，先在地图上点一点', 24, y + 22)

  y += 40
  const names = selected.map((item) => item.name)
  const chipMax = width - 48
  const limitY = height - 46
  let cx = 24
  let cy = y
  let hidden = 0
  ctx.font = '600 11px sans-serif'
  names.forEach((name, index) => {
    const item = selected[index]
    const tw = ctx.measureText(name).width
    const cw = Math.ceil(tw) + 14
    const ch = 20
    if (cx + cw > 24 + chipMax) {
      cx = 24
      cy += 24
    }
    if (cy + ch > limitY) {
      hidden += 1
      return
    }
    fillRoundRect(ctx, cx, cy, cw, ch, 10, hexToRgba(item.color, 0.16))
    ctx.fillStyle = item.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, cx + cw / 2, cy + ch / 2)
    cx += cw + 6
  })
  if (hidden) {
    const more = `+${hidden}`
    ctx.font = '600 11px sans-serif'
    const mw = ctx.measureText(more).width + 14
    if (cx + mw > 24 + chipMax) {
      cx = 24
      cy += 24
    }
    if (cy + 20 <= limitY) {
      fillRoundRect(ctx, cx, cy, mw, 20, 10, '#e2e8f0')
      ctx.fillStyle = muted
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(more, cx + mw / 2, cy + 10)
    }
  }

  ctx.fillStyle = '#94a3b8'
  ctx.font = '400 11px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('足迹仅供纪念', 24, height - 28)
  ctx.textAlign = 'right'
  ctx.fillText(formatCardDate(), width - 24, height - 28)
}

module.exports = {
  drawFootprintCard
}
