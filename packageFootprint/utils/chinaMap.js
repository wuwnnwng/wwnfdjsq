const GEO = require('./chinaGeo')
const { PROVINCES, PROVINCE_MAP, TINY_IDS, HIT_ORDER, DRAW_ORDER, hexToRgba } = require('./provinces')

const MAIN = { minLng: 73.2, maxLng: 135.2, minLat: 17.6, maxLat: 54.4 }
const SEA = { minLng: 107.8, maxLng: 121.6, minLat: 3.4, maxLat: 17.8 }

function ringCentroid(ring) {
  let x = 0
  let y = 0
  const n = ring.length - (samePoint(ring[0], ring[ring.length - 1]) ? 1 : 0)
  for (let i = 0; i < n; i += 1) {
    x += ring[i][0]
    y += ring[i][1]
  }
  return [x / n, y / n]
}

function samePoint(a, b) {
  return a && b && a[0] === b[0] && a[1] === b[1]
}

function project(lng, lat, box) {
  return [
    box.x + ((lng - box.minLng) / (box.maxLng - box.minLng)) * box.w,
    box.y + ((box.maxLat - lat) / (box.maxLat - box.minLat)) * box.h
  ]
}

function projectRing(ring, box) {
  return ring.map((pt) => project(pt[0], pt[1], box))
}

function expandRing(ring, scale) {
  const c = ringCentroid(ring)
  return ring.map((pt) => [c[0] + (pt[0] - c[0]) * scale, c[1] + (pt[1] - c[1]) * scale])
}

function pointInRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi) {
      inside = !inside
    }
  }
  return inside
}

function dist2(a, b) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

function layoutMap(width, height, pad) {
  const padding = pad || 10
  const insetW = Math.min(92, width * 0.26)
  const insetH = Math.min(108, height * 0.34)
  const main = {
    x: padding,
    y: padding,
    w: width - padding * 2,
    h: height - padding * 2,
    minLng: MAIN.minLng,
    maxLng: MAIN.maxLng,
    minLat: MAIN.minLat,
    maxLat: MAIN.maxLat
  }
  const inset = {
    x: width - padding - insetW,
    y: height - padding - insetH,
    w: insetW,
    h: insetH,
    minLng: SEA.minLng,
    maxLng: SEA.maxLng,
    minLat: SEA.minLat,
    maxLat: SEA.maxLat
  }
  return { main, inset }
}

function getRing(id) {
  const ring = GEO[id]
  if (!ring || ring.length < 3) return null
  if (TINY_IDS.indexOf(id) >= 0) {
    const scale = id === 'macao' ? 2.8 : id === 'hongkong' ? 1.8 : id === 'shanghai' ? 1.35 : 1.15
    return expandRing(ring, scale)
  }
  return ring
}

function themePalette(theme) {
  const dark = !theme || theme.id === 'nexus'
  return {
    dark,
    mapBg: dark ? '#0c1526' : '#f4f7f5',
    idleFill: dark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(100, 116, 139, 0.14)',
    idleStroke: dark ? 'rgba(226, 232, 240, 0.42)' : 'rgba(71, 85, 105, 0.42)',
    ink: dark ? '#e2e8f0' : '#1e293b',
    muted: dark ? '#94a3b8' : '#64748b',
    frame: dark ? 'rgba(94, 234, 212, 0.45)' : 'rgba(15, 61, 46, 0.35)',
    sea: dark ? 'rgba(14, 116, 144, 0.22)' : 'rgba(14, 116, 144, 0.12)'
  }
}

function fillColor(id, selected) {
  if (!selected) return null
  const item = PROVINCE_MAP[id]
  return item ? item.color : null
}

function drawRing(ctx, pts, fill, stroke, lineWidth) {
  if (!pts || pts.length < 3) return
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i += 1) {
    ctx.lineTo(pts[i][0], pts[i][1])
  }
  ctx.closePath()
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = lineWidth || 1
    ctx.lineJoin = 'round'
    ctx.stroke()
  }
}

function drawSouthSea(ctx, inset, palette) {
  const { x, y, w, h } = inset
  ctx.fillStyle = palette.sea
  ctx.strokeStyle = palette.frame
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = palette.frame
  if (typeof ctx.setLineDash === 'function') ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(x + w * 0.22, y + h * 0.18)
  ctx.lineTo(x + w * 0.78, y + h * 0.22)
  ctx.lineTo(x + w * 0.72, y + h * 0.58)
  ctx.lineTo(x + w * 0.38, y + h * 0.82)
  ctx.stroke()
  if (typeof ctx.setLineDash === 'function') ctx.setLineDash([])

  ctx.fillStyle = palette.muted
  ctx.font = '600 9px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('南海诸岛', x + w / 2, y + h - 12)
}

function drawChinaMap(ctx, x, y, width, height, options) {
  const visited = options.visited || {}
  const focusId = options.focusId || ''
  const palette = themePalette(options.theme)
  const layout = layoutMap(width, height)
  const shift = { x: x + layout.main.x, y: y + layout.main.y }
  const main = Object.assign({}, layout.main, { x: shift.x, y: shift.y })
  const inset = Object.assign({}, layout.inset, {
    x: x + layout.inset.x,
    y: y + layout.inset.y
  })

  ctx.save()
  ctx.fillStyle = palette.mapBg
  ctx.fillRect(x, y, width, height)

  DRAW_ORDER.forEach((id) => {
    const ring = getRing(id)
    if (!ring) return
    const selected = !!visited[id]
    const pts = projectRing(ring, main)
    const stroke = selected ? hexToRgba('#ffffff', 0.7) : palette.idleStroke
    drawRing(ctx, pts, fillColor(id, selected), stroke, selected ? 1.45 : 1.05)
  })

  if (focusId && GEO[focusId]) {
    const ring = getRing(focusId)
    const pts = projectRing(ring, main)
    drawRing(ctx, pts, null, '#fff7ed', 2.4)
    drawRing(ctx, pts, null, (PROVINCE_MAP[focusId] && PROVINCE_MAP[focusId].color) || '#f59e0b', 1.4)
  }

  drawSouthSea(ctx, inset, palette)
  ctx.restore()
}

function hitTest(px, py, width, height) {
  const layout = layoutMap(width, height)
  const main = layout.main
  for (let i = 0; i < HIT_ORDER.length; i += 1) {
    const id = HIT_ORDER[i]
    const ring = getRing(id)
    if (!ring) continue
    const pts = projectRing(ring, main)
    if (pointInRing(px, py, pts)) return id
    if (TINY_IDS.indexOf(id) >= 0) {
      const c = ringCentroid(pts)
      const radius = id === 'macao' || id === 'hongkong' ? 16 : 12
      if (dist2([px, py], c) <= radius * radius) return id
    }
  }
  return ''
}

function toVisitedMap(ids) {
  const map = {}
  ;(ids || []).forEach((id) => {
    if (PROVINCE_MAP[id]) map[id] = true
  })
  return map
}

function buildProvinceViews(visitedIds, focusId) {
  const visited = toVisitedMap(visitedIds)
  return PROVINCES.map((item) => {
    const selected = !!visited[item.id]
    return {
      id: item.id,
      name: item.name,
      color: item.color,
      selected,
      focused: item.id === focusId,
      chipStyle: selected
        ? `color:${item.color};background:${hexToRgba(item.color, 0.18)};border-color:${item.color};`
        : ''
    }
  })
}

module.exports = {
  drawChinaMap,
  hitTest,
  toVisitedMap,
  buildProvinceViews,
  themePalette
}
