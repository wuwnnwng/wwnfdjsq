const { drawChinaMap } = require('./chinaMap')
const { PROVINCES } = require('./footprint')

const APP_BRAND = '小小便民工具箱'

function formatCardDate(date) {
  const d = date instanceof Date ? date : new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
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

function drawFootprintCard(ctx, width, height, view) {
  const litSet = view.litSet || {}
  const colorMap = view.colorMap || {}
  const litCount = Number(view.litCount) || 0
  const totalCount = Number(view.totalCount) || PROVINCES.length
  const startName = view.startName || ''
  const litNames = PROVINCES.map((item) => item.name).filter((name) => litSet[name])

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const headerH = 88
  const gradient = ctx.createLinearGradient(0, 0, width, headerH)
  gradient.addColorStop(0, '#38bdf8')
  gradient.addColorStop(1, '#0284c7')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, headerH)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)'
  ctx.font = '600 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(APP_BRAND, 24, 32)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 26px sans-serif'
  ctx.fillText('足迹地图', 24, 64)

  const frameX = 20
  const frameY = 102
  const frameW = width - 40
  const frameH = 208
  fillRoundRect(ctx, frameX, frameY, frameW, frameH, 16, '#eef4fa')

  const mapX = frameX + 6
  const mapY = frameY + 6
  const mapW = frameW - 12
  const mapH = frameH - 12
  ctx.save()
  roundRectPath(ctx, mapX, mapY, mapW, mapH, 12)
  ctx.clip()
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(mapX, mapY, mapW, mapH)
  drawChinaMap(ctx, mapW, mapH, litSet, colorMap, false, {
    x: mapX,
    y: mapY,
    skipClear: true,
    pad: 6,
    lineWidth: 0.85,
    startName
  })
  ctx.restore()

  let y = frameY + frameH + 30
  ctx.fillStyle = '#64748b'
  ctx.font = '600 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('已点亮', 24, y)
  if (startName) {
    ctx.fillStyle = '#d97706'
    ctx.font = '700 13px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`起点 ${startName}`, width - 24, y)
    ctx.textAlign = 'left'
  }

  const countText = `${litCount} / ${totalCount}`
  ctx.fillStyle = '#0284c7'
  ctx.font = '800 36px sans-serif'
  ctx.fillText(countText, 24, y + 42)
  const countW = ctx.measureText(countText).width
  ctx.fillStyle = '#14231c'
  ctx.font = '700 14px sans-serif'
  ctx.fillText('省', 24 + countW + 8, y + 40)

  y += 64
  ctx.font = '500 13px sans-serif'
  const names = litNames.length ? litNames.join('  ') : '还没有点亮省份'
  const lines = wrapText(ctx, names, width - 48)
  ctx.fillStyle = litNames.length ? '#334155' : '#94a3b8'
  const maxLines = 5
  const shown = lines.slice(0, maxLines)
  shown.forEach((line, index) => {
    ctx.fillText(line, 24, y + index * 20)
  })
  if (lines.length > maxLines) {
    ctx.fillStyle = '#94a3b8'
    ctx.fillText('…', 24, y + maxLines * 20)
  }

  ctx.fillStyle = '#94a3b8'
  ctx.font = '400 11px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('我的旅行足迹', 24, height - 28)
  ctx.textAlign = 'right'
  ctx.fillText(formatCardDate(), width - 24, height - 28)
}

module.exports = {
  drawFootprintCard
}
