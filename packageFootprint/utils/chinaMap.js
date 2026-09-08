const REGION_LIST = require('./chinaRegions')

function ringArea(ring) {
  let sum = 0
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    sum += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(sum) / 2
}

function pointInRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const hit = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi
    if (hit) inside = !inside
  }
  return inside
}

function ringCentroid(ring) {
  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    const cross = a[0] * b[1] - b[0] * a[1]
    area += cross
    cx += (a[0] + b[0]) * cross
    cy += (a[1] + b[1]) * cross
  }
  area *= 0.5
  if (Math.abs(area) < 1e-8) {
    let sx = 0
    let sy = 0
    ring.forEach((pt) => {
      sx += pt[0]
      sy += pt[1]
    })
    return [sx / ring.length, sy / ring.length]
  }
  return [cx / (6 * area), cy / (6 * area)]
}

const REGIONS = (REGION_LIST || [])
  .map((item) => {
    const rings = (item.rings || []).filter((ring) => ring && ring.length > 2)
    let minLng = 180
    let maxLng = 73
    let minLat = 54
    let maxLat = 18
    let area = 0
    let mainRing = rings[0]
    let mainArea = 0
    rings.forEach((ring) => {
      const nextArea = ringArea(ring)
      area += nextArea
      if (nextArea > mainArea) {
        mainArea = nextArea
        mainRing = ring
      }
      ring.forEach((pt) => {
        if (pt[0] < minLng) minLng = pt[0]
        if (pt[0] > maxLng) maxLng = pt[0]
        if (pt[1] < minLat) minLat = pt[1]
        if (pt[1] > maxLat) maxLat = pt[1]
      })
    })
    const centroid = mainRing ? ringCentroid(mainRing) : [0, 0]
    return { name: item.name, rings, area, minLng, maxLng, minLat, maxLat, centroid }
  })
  .filter((item) => item.name && item.rings.length)
  .sort((a, b) => b.area - a.area)

const HIT_ORDER = REGIONS.slice().sort((a, b) => a.area - b.area)
const REGION_BY_NAME = {}
REGIONS.forEach((item) => {
  REGION_BY_NAME[item.name] = item
})

const BOUNDS = {
  minLng: 73.2,
  maxLng: 135.2,
  minLat: 17.8,
  maxLat: 53.7
}

const INSET_BOUNDS = {
  minLng: 107.5,
  maxLng: 121.5,
  minLat: 3.05,
  maxLat: 21.15
}

// 十段线（日常所称九段线，含台湾以东一段）
const NINE_DASH = [
  [[109.52, 16.36], [109.72, 16.06], [109.88, 15.77], [109.97, 15.53], [109.99, 15.34]],
  [[110.48, 12.43], [110.48, 12.09], [110.45, 11.86], [110.26, 11.39]],
  [[108.34, 7.27], [108.31, 6.73], [108.36, 6.11]],
  [[111.94, 3.55], [112.4, 3.65], [112.92, 3.85]],
  [[115.69, 7.29], [116.41, 8.14]],
  [[118.64, 11.08], [118.86, 11.46], [119.1, 12.06], [119.12, 12.14]],
  [[119.61, 18.14], [119.91, 18.77], [120.12, 19.12]],
  [[121.41, 20.8], [122.12, 21.72]],
  [[122.8, 23.67], [123.0, 24.75]],
  [[119.17, 15.11], [119.17, 15.76], [119.18, 16.27]]
]

const NANHAI_ISLANDS = [
  [116.73, 20.7],
  [111.85, 16.5],
  [114.5, 16.0],
  [114.2, 9.8],
  [117.74, 15.15]
]

function getLayout(width, height, pad) {
  const insetW = Math.max(48, Math.min(width * 0.18, 78))
  const insetH = Math.max(68, Math.min(height * 0.32, 118))
  const rightReserve = insetW + 10
  return {
    pad,
    plotW: Math.max(48, width - pad * 2 - rightReserve),
    plotH: Math.max(48, height - pad * 2),
    insetX: width - pad - insetW,
    insetY: height - pad - insetH,
    insetW,
    insetH
  }
}

function project(lng, lat, layout) {
  const x = layout.pad + ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * layout.plotW
  const y = layout.pad + ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * layout.plotH
  return [x, y]
}

function projectInset(lng, lat, layout) {
  const labelH = Math.min(14, layout.insetH * 0.16)
  const drawH = layout.insetH - labelH
  const x =
    layout.insetX +
    ((lng - INSET_BOUNDS.minLng) / (INSET_BOUNDS.maxLng - INSET_BOUNDS.minLng)) * layout.insetW
  const y =
    layout.insetY +
    ((INSET_BOUNDS.maxLat - lat) / (INSET_BOUNDS.maxLat - INSET_BOUNDS.minLat)) * drawH
  return [x, y]
}

function unproject(x, y, layout) {
  const lng = BOUNDS.minLng + ((x - layout.pad) / layout.plotW) * (BOUNDS.maxLng - BOUNDS.minLng)
  const lat = BOUNDS.maxLat - ((y - layout.pad) / layout.plotH) * (BOUNDS.maxLat - BOUNDS.minLat)
  return [lng, lat]
}

function inMainBounds(pt) {
  return pt[1] >= BOUNDS.minLat - 0.15 && pt[1] <= BOUNDS.maxLat + 0.15
}

function drawPolyline(ctx, pts, projectPt, ox, oy) {
  if (!pts || pts.length < 2) return
  ctx.beginPath()
  pts.forEach((pt, i) => {
    const xy = projectPt(pt[0], pt[1])
    const px = ox + xy[0]
    const py = oy + xy[1]
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.stroke()
}

function drawRegionRings(ctx, region, fill, border, lineWidth, projectPt, ox, oy) {
  region.rings.forEach((ring) => {
    ctx.beginPath()
    ring.forEach((pt, i) => {
      const xy = projectPt(pt[0], pt[1])
      const px = ox + xy[0]
      const py = oy + xy[1]
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = border
    ctx.lineWidth = lineWidth
    ctx.stroke()
  })
}

function drawDashes(ctx, projectPt, ox, oy, color, lineWidth, shouldDraw) {
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  NINE_DASH.forEach((seg) => {
    if (shouldDraw && !shouldDraw(seg)) return
    drawPolyline(ctx, seg, projectPt, ox, oy)
  })
}

function drawFlightArc(ctx, x1, y1, x2, y2, color, under) {
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  let px = -dy / dist
  let py = dx / dist
  if (py > 0) {
    px = -px
    py = -py
  }
  const bulge = Math.min(dist * 0.26, 44)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo(mx + px * bulge, my + py * bulge, x2, y2)
  ctx.lineCap = 'round'
  ctx.strokeStyle = under
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.35
  ctx.stroke()
}

function drawStartMarker(ctx, x, y) {
  ctx.beginPath()
  ctx.arc(x, y, 5.4, 0, Math.PI * 2)
  ctx.fillStyle = '#f59e0b'
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.7
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, 2.1, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
}

function drawEndMarker(ctx, x, y, color) {
  ctx.beginPath()
  ctx.arc(x, y, 2.4, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawArcs(ctx, layout, ox, oy, litSet, colorMap, startName, dark) {
  const start = REGION_BY_NAME[startName]
  if (!start) return
  const from = project(start.centroid[0], start.centroid[1], layout)
  const x1 = ox + from[0]
  const y1 = oy + from[1]
  const under = dark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.72)'
  REGIONS.forEach((region) => {
    if (region.name === startName || !litSet[region.name]) return
    const to = project(region.centroid[0], region.centroid[1], layout)
    const x2 = ox + to[0]
    const y2 = oy + to[1]
    drawFlightArc(ctx, x1, y1, x2, y2, colorMap[region.name] || '#38bdf8', under)
    drawEndMarker(ctx, x2, y2, colorMap[region.name] || '#38bdf8')
  })
  drawStartMarker(ctx, x1, y1)
}

function drawNanhaiInset(ctx, layout, ox, oy, litSet, colorMap, dark, lineWidth) {
  const x = ox + layout.insetX
  const y = oy + layout.insetY
  const w = layout.insetW
  const h = layout.insetH
  const unlit = dark ? '#243044' : '#dbe3ee'
  const border = dark ? '#64748b' : '#94a3b8'
  const sea = dark ? '#152033' : '#e8eef6'
  const dash = dark ? '#cbd5e1' : '#334155'
  const island = dark ? '#94a3b8' : '#475569'

  ctx.fillStyle = sea
  ctx.fillRect(x, y, w, h)

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()

  const hainan = REGION_BY_NAME['海南']
  if (hainan) {
    const fill = litSet['海南'] ? colorMap['海南'] || '#67e8f9' : unlit
    drawRegionRings(
      ctx,
      hainan,
      fill,
      border,
      Math.max(0.5, lineWidth * 0.85),
      (lng, lat) => projectInset(lng, lat, layout),
      ox,
      oy
    )
  }

  drawDashes(
    ctx,
    (lng, lat) => projectInset(lng, lat, layout),
    ox,
    oy,
    dash,
    Math.max(1.05, lineWidth * 1.35),
    (seg) => seg[0][0] < 122.4
  )

  NANHAI_ISLANDS.forEach((pt) => {
    const xy = projectInset(pt[0], pt[1], layout)
    ctx.beginPath()
    ctx.arc(ox + xy[0], oy + xy[1], 1.35, 0, Math.PI * 2)
    ctx.fillStyle = island
    ctx.fill()
  })
  ctx.restore()

  ctx.fillStyle = sea
  ctx.fillRect(x + 1, y + h - 13, w - 2, 12)
  ctx.strokeStyle = dark ? '#94a3b8' : '#64748b'
  ctx.lineWidth = Math.max(0.9, lineWidth)
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)

  ctx.fillStyle = dark ? '#cbd5e1' : '#475569'
  ctx.font = `600 ${Math.max(8, Math.min(10, w * 0.16))}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('南海诸岛', x + w / 2, y + h - 7)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

function drawChinaMap(ctx, width, height, litSet, colorMap, dark, opt) {
  const ox = (opt && opt.x) || 0
  const oy = (opt && opt.y) || 0
  const pad = opt && opt.pad != null ? opt.pad : 8
  const lineWidth = opt && opt.lineWidth != null ? opt.lineWidth : 0.7
  const startName = (opt && opt.startName) || ''
  const unlit = dark ? '#243044' : '#dbe3ee'
  const border = dark ? '#64748b' : '#94a3b8'
  const dash = dark ? '#cbd5e1' : '#334155'
  const layout = getLayout(width, height, pad)

  if (!(opt && opt.skipClear)) ctx.clearRect(ox, oy, width, height)

  ctx.save()
  ctx.beginPath()
  ctx.rect(ox + layout.pad, oy + layout.pad, layout.plotW, layout.plotH)
  ctx.clip()

  REGIONS.forEach((region) => {
    const fill = litSet[region.name] ? colorMap[region.name] || '#38bdf8' : unlit
    drawRegionRings(ctx, region, fill, border, lineWidth, (lng, lat) => project(lng, lat, layout), ox, oy)
  })
  if (startName && REGION_BY_NAME[startName]) {
    const start = REGION_BY_NAME[startName]
    const fill = litSet[startName] ? colorMap[startName] || '#38bdf8' : unlit
    drawRegionRings(ctx, start, fill, '#f59e0b', Math.max(1.4, lineWidth * 1.8), (lng, lat) => project(lng, lat, layout), ox, oy)
  }

  drawDashes(
    ctx,
    (lng, lat) => project(lng, lat, layout),
    ox,
    oy,
    dash,
    Math.max(1.15, lineWidth * 1.5),
    (seg) => seg.some(inMainBounds)
  )

  if (startName) drawArcs(ctx, layout, ox, oy, litSet || {}, colorMap || {}, startName, dark)
  ctx.restore()

  drawNanhaiInset(ctx, layout, ox, oy, litSet || {}, colorMap || {}, dark, lineWidth)
}

function hitProvince(x, y, width, height) {
  const pad = 8
  const layout = getLayout(width, height, pad)
  if (x >= layout.insetX - 1 && y >= layout.insetY - 1) return ''
  if (x < layout.pad || y < layout.pad || x > layout.pad + layout.plotW || y > layout.pad + layout.plotH) {
    return ''
  }
  const lnglat = unproject(x, y, layout)
  for (let i = 0; i < HIT_ORDER.length; i += 1) {
    const region = HIT_ORDER[i]
    if (
      lnglat[0] < region.minLng - 0.4 ||
      lnglat[0] > region.maxLng + 0.4 ||
      lnglat[1] < region.minLat - 0.4 ||
      lnglat[1] > region.maxLat + 0.4
    ) {
      continue
    }
    for (let r = 0; r < region.rings.length; r += 1) {
      if (pointInRing(lnglat[0], lnglat[1], region.rings[r])) return region.name
    }
  }
  return ''
}

module.exports = {
  drawChinaMap,
  hitProvince
}
