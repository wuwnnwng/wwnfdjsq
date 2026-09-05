const { CHIP_ORDER, PROVINCE_MAP } = require('./provinces')
const { drawChinaMap, toVisitedMap } = require('./chinaMap')

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
  const visitedIds = view.visitedIds || []
  const focusId = view.focusId || ''
  const visited = toVisitedMap(visitedIds)

  ctx.fillStyle = '#111111'
  ctx.fillRect(0, 0, width, height)

  const pad = 8
  const mapH = Math.round(height * 0.62)
  drawChinaMap(ctx, pad, pad, width - pad * 2, mapH, {
    visited,
    focusId
  })

  const list = CHIP_ORDER.map((id) => PROVINCE_MAP[id]).filter(Boolean)
  const cols = 7
  const gap = 4
  const gridX = 10
  const gridW = width - 20
  const cellW = (gridW - gap * (cols - 1)) / cols
  const cellH = 22
  let y = pad + mapH + 8
  ctx.font = '700 9px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  list.forEach((item, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = gridX + col * (cellW + gap)
    const top = y + row * (cellH + gap)
    const on = !!visited[item.id]
    fillRoundRect(ctx, x, top, cellW, cellH, 4, on ? item.color : '#2a2a2a')
    ctx.fillStyle = on ? '#ffffff' : '#8a8a8a'
    ctx.fillText(item.name, x + cellW / 2, top + cellH / 2)
  })
}

module.exports = {
  drawFootprintCard
}
