const GEO = require('./chinaGeo')
const { CHIP_ORDER, PROVINCE_MAP, TINY_IDS, HIT_ORDER, DRAW_ORDER, hexToRgba } = require('./provinces')

const DEG = Math.PI / 180
const PHI1 = 25 * DEG
const PHI2 = 47 * DEG
const LAM0 = 105 * DEG
const PHI0 = 12 * DEG
const ALBERS_N = (Math.sin(PHI1) + Math.sin(PHI2)) / 2
const ALBERS_C = Math.cos(PHI1) * Math.cos(PHI1) + 2 * ALBERS_N * Math.sin(PHI1)
const ALBERS_RHO0 = Math.sqrt(ALBERS_C - 2 * ALBERS_N * Math.sin(PHI0)) / ALBERS_N

function albersRaw(lng, lat) {
  const lam = lng * DEG
  const phi = lat * DEG
  const theta = ALBERS_N * (lam - LAM0)
  const rho = Math.sqrt(Math.max(0, ALBERS_C - 2 * ALBERS_N * Math.sin(phi))) / ALBERS_N
  return [rho * Math.sin(theta), ALBERS_RHO0 - rho * Math.cos(theta)]
}

function getEntry(id) {
  return GEO[id] || null
}

function getRings(id) {
  const entry = getEntry(id)
  if (!entry) return []
  if (Array.isArray(entry.rings)) return entry.rings
  if (Array.isArray(entry) && entry.length && typeof entry[0][0] === 'number') return [entry]
  return []
}

function ringCentroid(ring) {
  let x = 0
  let y = 0
  const closed = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
  const n = closed ? ring.length - 1 : ring.length
  if (n <= 0) return [0, 0]
  for (let i = 0; i < n; i += 1) {
    x += ring[i][0]
    y += ring[i][1]
  }
  return [x / n, y / n]
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

function computeBBox() {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  Object.keys(GEO).forEach((id) => {
    getRings(id).forEach((ring) => {
      ring.forEach((pt) => {
        if (pt[1] < 17.7) return
        const xy = albersRaw(pt[0], pt[1])
        if (xy[0] < minX) minX = xy[0]
        if (xy[0] > maxX) maxX = xy[0]
        if (xy[1] < minY) minY = xy[1]
        if (xy[1] > maxY) maxY = xy[1]
      })
    })
  })
  return { minX, maxX, minY, maxY }
}

const BBOX = computeBBox()

function createView(x, y, width, height) {
  const pad = 8
  const insetW = Math.min(42, Math.max(34, width * 0.12))
  const insetH = Math.min(50, Math.max(40, height * 0.13))
  const insetGap = 6
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  const bw = BBOX.maxX - BBOX.minX
  const bh = BBOX.maxY - BBOX.minY
  const scale = Math.min(innerW / bw, innerH / bh)
  const ox = x + pad + (innerW - bw * scale) / 2
  const oy = y + pad + (innerH - bh * scale) / 2
  return {
    ox,
    oy,
    scale,
    minX: BBOX.minX,
    maxY: BBOX.maxY,
    inset: {
      x: x + width - insetGap - insetW,
      y: y + height - insetGap - insetH,
      w: insetW,
      h: insetH
    }
  }
}

function project(lng, lat, view) {
  const xy = albersRaw(lng, lat)
  return [view.ox + (xy[0] - view.minX) * view.scale, view.oy + (view.maxY - xy[1]) * view.scale]
}

function projectRing(ring, view) {
  return ring.map((pt) => project(pt[0], pt[1], view))
}

function themePalette() {
  return {
    dark: true,
    mapBg: '#111111',
    idleFill: '#4b4b4b',
    idleStroke: '#2a2a2a',
    ink: '#1a1a1a',
    muted: '#8a8a8a',
    frame: '#6b6b6b',
    sea: '#2c2c2c'
  }
}

function fillColor(id, selected, palette) {
  if (selected) {
    const item = PROVINCE_MAP[id]
    return item ? item.color : palette.idleFill
  }
  return palette.idleFill
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

function getLabelPoint(id, view) {
  const entry = getEntry(id)
  if (entry && entry.label) return project(entry.label[0], entry.label[1], view)
  const rings = getRings(id)
  if (!rings.length) return null
  const c = ringCentroid(rings[0])
  return project(c[0], c[1], view)
}

function drawProvinceLabels(ctx, view, visited, focusId, palette, mapWidth) {
  const size = Math.max(7, Math.min(10, Math.round(mapWidth / 40)))
  ctx.font = `600 ${size}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  DRAW_ORDER.forEach((id) => {
    const item = PROVINCE_MAP[id]
    if (!item) return
    const pt = getLabelPoint(id, view)
    if (!pt) return
    const selected = !!visited[id] || id === focusId
    if (selected) {
      ctx.lineJoin = 'round'
      ctx.lineWidth = 2.2
      ctx.strokeStyle = 'rgba(15, 23, 32, 0.45)'
      ctx.strokeText(item.name, pt[0], pt[1])
      ctx.fillStyle = '#ffffff'
    } else {
      ctx.fillStyle = palette.ink
    }
    ctx.fillText(item.name, pt[0], pt[1])
  })
}

function drawSouthSea(ctx, inset, palette) {
  const { x, y, w, h } = inset
  ctx.fillStyle = palette.sea
  ctx.strokeStyle = palette.frame
  ctx.lineWidth = 1
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
}

function drawChinaMap(ctx, x, y, width, height, options) {
  const visited = options.visited || {}
  const focusId = options.focusId || ''
  const palette = themePalette()
  const view = createView(x, y, width, height)

  ctx.save()
  ctx.fillStyle = palette.mapBg
  ctx.fillRect(x, y, width, height)

  DRAW_ORDER.forEach((id) => {
    const rings = getRings(id)
    if (!rings.length) return
    const selected = !!visited[id]
    const fill = fillColor(id, selected, palette)
    const stroke = selected ? hexToRgba('#111111', 0.28) : palette.idleStroke
    rings.forEach((ring) => {
      drawRing(ctx, projectRing(ring, view), fill, stroke, selected ? 1.15 : 0.95)
    })
  })

  if (focusId && getRings(focusId).length) {
    getRings(focusId).forEach((ring) => {
      const pts = projectRing(ring, view)
      drawRing(ctx, pts, null, '#fff7ed', 2.2)
      drawRing(ctx, pts, null, (PROVINCE_MAP[focusId] && PROVINCE_MAP[focusId].color) || '#f59e0b', 1.2)
    })
  }

  drawSouthSea(ctx, view.inset, palette)
  drawProvinceLabels(ctx, view, visited, focusId, palette, width)
  ctx.restore()
}

function hitTest(px, py, width, height) {
  const view = createView(0, 0, width, height)
  for (let i = 0; i < HIT_ORDER.length; i += 1) {
    const id = HIT_ORDER[i]
    const rings = getRings(id)
    let hit = false
    rings.forEach((ring) => {
      if (hit) return
      const pts = projectRing(ring, view)
      if (pointInRing(px, py, pts)) hit = true
    })
    if (hit) return id
    if (TINY_IDS.indexOf(id) >= 0 && rings[0]) {
      const c = ringCentroid(projectRing(rings[0], view))
      const radius = id === 'macao' || id === 'hongkong' ? 14 : 11
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
  return CHIP_ORDER.map((id) => {
    const item = PROVINCE_MAP[id]
    if (!item) return null
    const selected = !!visited[item.id]
    return {
      id: item.id,
      name: item.name,
      color: item.color,
      selected,
      focused: item.id === focusId,
      chipStyle: selected ? `color:#fff;background:${item.color};border-color:${item.color};` : ''
    }
  }).filter(Boolean)
}

module.exports = {
  drawChinaMap,
  hitTest,
  toVisitedMap,
  buildProvinceViews,
  themePalette
}
