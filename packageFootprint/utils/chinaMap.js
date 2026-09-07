const chinaRaw = require('../data/china.json')

function decodeRing(coordinate, encodeOffsets, encodeScale) {
  const result = []
  let prevX = encodeOffsets[0]
  let prevY = encodeOffsets[1]
  for (let i = 0; i < coordinate.length; i += 2) {
    let x = coordinate.charCodeAt(i) - 64
    let y = coordinate.charCodeAt(i + 1) - 64
    x = (x >> 1) ^ -(x & 1)
    y = (y >> 1) ^ -(y & 1)
    x += prevX
    y += prevY
    prevX = x
    prevY = y
    result.push([x / encodeScale, y / encodeScale])
  }
  return result
}

function decodeGeo(json) {
  if (!json || !json.UTF8Encoding) return json
  const scale = json.UTF8Scale || 1024
  const features = json.features || []
  features.forEach((feature) => {
    const geometry = feature.geometry
    if (!geometry) return
    const coordinates = geometry.coordinates
    const encodeOffsets = geometry.encodeOffsets || []
    if (geometry.type === 'Polygon') {
      coordinates.forEach((ring, i) => {
        if (typeof ring === 'string') {
          coordinates[i] = decodeRing(ring, encodeOffsets[i], scale)
        }
      })
    } else if (geometry.type === 'MultiPolygon') {
      coordinates.forEach((polygon, i) => {
        polygon.forEach((ring, j) => {
          if (typeof ring === 'string') {
            polygon[j] = decodeRing(ring, encodeOffsets[i][j], scale)
          }
        })
      })
    }
  })
  json.UTF8Encoding = false
  return json
}

function ringsOf(feature) {
  const geometry = feature.geometry || {}
  const coordinates = geometry.coordinates || []
  if (geometry.type === 'Polygon') return coordinates
  if (geometry.type === 'MultiPolygon') {
    const rings = []
    coordinates.forEach((polygon) => {
      polygon.forEach((ring) => rings.push(ring))
    })
    return rings
  }
  return []
}

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

const decoded = decodeGeo(chinaRaw)
const REGIONS = (decoded.features || [])
  .map((feature) => {
    const name = feature.properties && feature.properties.name
    const rings = ringsOf(feature).filter((ring) => ring && ring.length > 2)
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
    return { name, rings, area, minLng, maxLng, minLat, maxLat }
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

function drawChinaMap(ctx, width, height, litSet, colorMap, dark) {
  const pad = 8
  const unlit = dark ? '#243044' : '#dbe3ee'
  const border = dark ? '#64748b' : '#94a3b8'
  ctx.clearRect(0, 0, width, height)
  REGIONS.forEach((region) => {
    const fill = litSet[region.name] ? colorMap[region.name] || '#38bdf8' : unlit
    region.rings.forEach((ring) => {
      ctx.beginPath()
      ring.forEach((pt, i) => {
        const xy = project(pt[0], pt[1], width, height, pad)
        if (i === 0) ctx.moveTo(xy[0], xy[1])
        else ctx.lineTo(xy[0], xy[1])
      })
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
      ctx.strokeStyle = border
      ctx.lineWidth = 0.7
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
