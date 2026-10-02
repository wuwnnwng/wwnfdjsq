const { sampleBackground } = require('./idphotoImage')

function luma(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function isSkin(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const y = luma(r, g, b)
  if (y < 42 || y > 240) return false
  return r > 70 && g > 28 && b > 14 && r > g && (r - g) > 8 && (max - min) > 10 && r + 15 >= b
}

function sharpness(data, width, height) {
  let n = 0
  let mean = 0
  let m2 = 0
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const i = (y * width + x) * 4
      const c = data[i]
      const left = data[i - 4]
      const right = data[i + 4]
      const up = data[i - width * 4]
      const down = data[i + width * 4]
      const lap = Math.abs(c * 4 - left - right - up - down)
      n += 1
      const delta = lap - mean
      mean += delta / n
      m2 += delta * (lap - mean)
    }
  }
  return n ? m2 / n : 0
}

function borderRatio(data, width, height) {
  const bg = sampleBackground(data, width, height)
  const band = Math.max(1, Math.round(Math.min(width, height) * 0.04))
  let total = 0
  let close = 0
  for (let y = 0; y < height; y += 1) {
    const edgeY = y < band || y >= height - band
    for (let x = 0; x < width; x += 1) {
      if (!edgeY && x >= band && x < width - band) continue
      const i = (y * width + x) * 4
      const dr = data[i] - bg.r
      const dg = data[i + 1] - bg.g
      const db = data[i + 2] - bg.b
      total += 1
      if (dr * dr + dg * dg + db * db < 45 * 45) close += 1
    }
  }
  return { bg, ratio: total ? close / total : 0 }
}

function analyzePortrait(data, width, height) {
  const issues = []
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let count = 0
  let lumaSum = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      if (!isSkin(data[i], data[i + 1], data[i + 2])) continue
      count += 1
      lumaSum += luma(data[i], data[i + 1], data[i + 2])
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  const area = width * height
  if (count < area * 0.015 || maxX < 0) {
    return {
      ok: false,
      issues: [{ id: 'face', text: '未检测到人像' }],
      metrics: { count, area }
    }
  }

  const edge = borderRatio(data, width, height)
  const bg = edge.bg
  const pad = Math.round((maxX - minX) * 0.2)
  const x0 = Math.max(0, minX - pad)
  const x1 = Math.min(width - 1, maxX + pad)
  const span = Math.max(1, x1 - x0 + 1)
  let headTop = minY
  let run = 0
  const need = Math.max(3, Math.round(height * 0.025))
  for (let y = 0; y < minY; y += 1) {
    let fg = 0
    for (let x = x0; x <= x1; x += 1) {
      const i = (y * width + x) * 4
      const dr = data[i] - bg.r
      const dg = data[i + 1] - bg.g
      const db = data[i + 2] - bg.b
      if (dr * dr + dg * dg + db * db > 40 * 40) fg += 1
    }
    run = fg > span * 0.28 ? run + 1 : 0
    if (run >= need) {
      headTop = y - need + 1
      break
    }
  }
  if (minY - headTop > height * 0.2) headTop = minY

  const topRatio = headTop / height
  if (topRatio < 0.012) issues.push({ id: 'head-tight', text: '头部空间少' })
  else if (topRatio > 0.34) issues.push({ id: 'head-loose', text: '头部空间过多' })

  const center = (minX + maxX) / 2
  if (Math.abs(center - width / 2) / width > 0.13) {
    issues.push({ id: 'center', text: '人像未居中' })
  }

  const faceH = (maxY - minY + 1) / height
  const faceW = (maxX - minX + 1) / width
  if (faceH < 0.18 && faceW < 0.22) issues.push({ id: 'small', text: '人像过小' })
  const lowerTop = Math.floor(height * 0.7)
  let lowerRows = 0
  for (let y = lowerTop; y < height; y += 2) {
    let rowFg = 0
    const samples = Math.ceil(width / 2)
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4
      const dr = data[i] - bg.r
      const dg = data[i + 1] - bg.g
      const db = data[i + 2] - bg.b
      if (dr * dr + dg * dg + db * db > 40 * 40) rowFg += 1
    }
    if (rowFg > samples * 0.18) lowerRows += 1
  }
  if (maxY < height * 0.58 && lowerRows < 3) {
    issues.push({ id: 'shoulder', text: '肩部未入镜' })
  }

  const faceLuma = lumaSum / count
  if (faceLuma < 58) issues.push({ id: 'dark', text: '光线不足' })
  else if (faceLuma > 225) issues.push({ id: 'bright', text: '光线过亮' })

  const sharp = sharpness(data, width, height)
  if (sharp < 18) issues.push({ id: 'blur', text: '照片不够清晰' })
  if (edge.ratio < 0.42) issues.push({ id: 'bg', text: '背景不是纯色' })

  return {
    ok: issues.length === 0,
    issues,
    metrics: {
      count,
      topRatio: Math.round(topRatio * 1000) / 1000,
      faceH: Math.round(faceH * 1000) / 1000,
      faceLuma: Math.round(faceLuma),
      sharp: Math.round(sharp),
      border: Math.round(edge.ratio * 1000) / 1000
    }
  }
}

function inspectImage(src) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: (info) => {
        const maxSide = 240
        const scale = Math.min(1, maxSide / Math.max(info.width, info.height))
        const sw = Math.max(1, Math.round(info.width * scale))
        const sh = Math.max(1, Math.round(info.height * scale))
        const canvas = wx.createOffscreenCanvas({ type: '2d', width: sw, height: sh })
        const img = canvas.createImage()
        const timer = setTimeout(() => reject(new Error('timeout')), 8000)
        img.onload = () => {
          clearTimeout(timer)
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, sw, sh)
          const frame = ctx.getImageData(0, 0, sw, sh)
          resolve(analyzePortrait(frame.data, sw, sh))
        }
        img.onerror = () => {
          clearTimeout(timer)
          reject(new Error('read'))
        }
        img.src = src
      },
      fail: reject
    })
  })
}

module.exports = {
  analyzePortrait,
  inspectImage
}
