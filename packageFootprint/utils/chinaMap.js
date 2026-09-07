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

const REGIONS = (REGION_LIST || [])
  .map((item) => {
    const rings = (item.rings || []).filter((ring) => ring && ring.length > 2)
    let minLng = 180
    let maxLng = 73
    let minLat = 54
    let maxLat = 18
    let area = 0
    rings.forEach((ring) => {
      area += ringArea(ring)
      ring.forEach((pt) => {
        if (pt[0] < minLng) minLng = pt[0]
        if (pt[0] > maxLng) maxLng = pt[0]
        if (pt[1] < minLat) minLat = pt[1]
        if (pt[1] > maxLat) maxLat = pt[1]
      })
    })
    return { name: item.name, rings, area, minLng, maxLng, minLat, maxLat }
  })
  .filter((item) => item.name && item.rings.length)
  .sort((a, b) => b.area - a.area)

const HIT_ORDER = REGIONS.slice().sort((a, b) => a.area - b.area)

const BOUNDS = {
  minLng: 73.2,
  maxLng: 135.2,
  minLat: 17.8,
  maxLat: 53.7
}

function project(lng, lat, width, height, pad) {
  const x = pad + ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * (width - pad * 2)
  const y = pad + ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * (height - pad * 2)
  return [x, y]
}

function unproject(x, y, width, height, pad) {
  const lng = BOUNDS.minLng + ((x - pad) / (width - pad * 2)) * (BOUNDS.maxLng - BOUNDS.minLng)
  const lat = BOUNDS.maxLat - ((y - pad) / (height - pad * 2)) * (BOUNDS.maxLat - BOUNDS.minLat)
  return [lng, lat]
}

function drawChinaMap(ctx, width, height, litSet, colorMap, dark, opt) {
  const ox = (opt && opt.x) || 0
  const oy = (opt && opt.y) || 0
  const pad = opt && opt.pad != null ? opt.pad : 8
  const lineWidth = opt && opt.lineWidth != null ? opt.lineWidth : 0.7
  const unlit = dark ? '#243044' : '#dbe3ee'
  const border = dark ? '#64748b' : '#94a3b8'
  if (!(opt && opt.skipClear)) ctx.clearRect(ox, oy, width, height)
  REGIONS.forEach((region) => {
    const fill = litSet[region.name] ? colorMap[region.name] || '#38bdf8' : unlit
    region.rings.forEach((ring) => {
      ctx.beginPath()
      ring.forEach((pt, i) => {
        const xy = project(pt[0], pt[1], width, height, pad)
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
  })
}

function hitProvince(x, y, width, height) {
  const pad = 8
  const lnglat = unproject(x, y, width, height, pad)
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
