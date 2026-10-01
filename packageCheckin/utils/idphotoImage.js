const STRENGTH = {
  weak: { t0: 28 * 28, t1: 52 * 52 },
  mid: { t0: 46 * 46, t1: 84 * 84 },
  strong: { t0: 72 * 72, t1: 120 * 120 }
}

function hexToRgb(hex) {
  const text = String(hex || '').replace('#', '')
  return {
    r: parseInt(text.slice(0, 2), 16) || 0,
    g: parseInt(text.slice(2, 4), 16) || 0,
    b: parseInt(text.slice(4, 6), 16) || 0
  }
}

function sampleBackground(data, width, height) {
  const band = Math.max(1, Math.round(Math.min(width, height) * 0.04))
  const buckets = new Map()
  let count = 0
  for (let y = 0; y < height; y += 1) {
    const edgeY = y < band || y >= height - band
    for (let x = 0; x < width; x += 1) {
      if (!edgeY && x >= band && x < width - band) continue
      const i = (y * width + x) * 4
      const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
      const item = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 }
      item.n += 1
      item.r += data[i]
      item.g += data[i + 1]
      item.b += data[i + 2]
      buckets.set(key, item)
      count += 1
    }
  }
  let best = null
  buckets.forEach((item) => {
    if (!best || item.n > best.n) best = item
  })
  if (!best || !count) return { r: 255, g: 255, b: 255, solid: false }
  return {
    r: Math.round(best.r / best.n),
    g: Math.round(best.g / best.n),
    b: Math.round(best.b / best.n),
    solid: best.n / count >= 0.55
  }
}

function replaceBackground(data, width, height, color, strength) {
  const limit = STRENGTH[strength] || STRENGTH.mid
  const bg = sampleBackground(data, width, height)
  const span = Math.max(1, limit.t1 - limit.t0)
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - bg.r
    const dg = data[i + 1] - bg.g
    const db = data[i + 2] - bg.b
    const dist = dr * dr + dg * dg + db * db
    if (dist >= limit.t1) continue
    const alpha = dist <= limit.t0 ? 1 : (limit.t1 - dist) / span
    data[i] = color.r * alpha + data[i] * (1 - alpha)
    data[i + 1] = color.g * alpha + data[i + 1] * (1 - alpha)
    data[i + 2] = color.b * alpha + data[i + 2] * (1 - alpha)
  }
  return bg
}

function cropWindow(sw, sh, aspect, offset) {
  const ratio = aspect > 0 ? aspect : sw / sh
  const srcRatio = sw / sh
  let cw
  let ch
  if (srcRatio > ratio) {
    ch = sh
    cw = Math.max(1, Math.min(sw, Math.round(sh * ratio)))
  } else {
    cw = sw
    ch = Math.max(1, Math.min(sh, Math.round(sw / ratio)))
  }
  const maxX = Math.max(0, sw - cw)
  const maxY = Math.max(0, sh - ch)
  const shift = Math.max(-1, Math.min(1, offset || 0))
  let x = Math.round(maxX / 2)
  let y = Math.round(maxY / 2)
  if (maxY >= maxX) y = Math.round(maxY / 2 + shift * (maxY / 2))
  else x = Math.round(maxX / 2 + shift * (maxX / 2))
  return {
    x: Math.max(0, Math.min(maxX, x)),
    y: Math.max(0, Math.min(maxY, y)),
    cw,
    ch
  }
}

function sampleBilinear(data, sw, sh, sx, sy) {
  const x0 = Math.floor(sx)
  const y0 = Math.floor(sy)
  const x1 = Math.min(sw - 1, x0 + 1)
  const y1 = Math.min(sh - 1, y0 + 1)
  const fx = sx - x0
  const fy = sy - y0
  const xx0 = x0 < 0 ? 0 : x0
  const yy0 = y0 < 0 ? 0 : y0
  const i00 = (yy0 * sw + xx0) * 4
  const i10 = (yy0 * sw + x1) * 4
  const i01 = (y1 * sw + xx0) * 4
  const i11 = (y1 * sw + x1) * 4
  const out = [0, 0, 0, 255]
  for (let c = 0; c < 3; c += 1) {
    const top = data[i00 + c] * (1 - fx) + data[i10 + c] * fx
    const bottom = data[i01 + c] * (1 - fx) + data[i11 + c] * fx
    out[c] = top * (1 - fy) + bottom * fy
  }
  return out
}

function scaleCrop(src, sw, sh, win, dw, dh) {
  const out = new Uint8ClampedArray(dw * dh * 4)
  for (let y = 0; y < dh; y += 1) {
    const sy = win.y + ((y + 0.5) * win.ch) / dh - 0.5
    for (let x = 0; x < dw; x += 1) {
      const sx = win.x + ((x + 0.5) * win.cw) / dw - 0.5
      const pixel = sampleBilinear(src, sw, sh, sx, sy)
      const i = (y * dw + x) * 4
      out[i] = pixel[0]
      out[i + 1] = pixel[1]
      out[i + 2] = pixel[2]
      out[i + 3] = 255
    }
  }
  return out
}

function sharpenImage(data, width, height, amount) {
  const copy = new Uint8ClampedArray(data)
  const gain = amount == null ? 0.55 : amount
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = (y * width + x) * 4
      for (let c = 0; c < 3; c += 1) {
        const center = copy[i + c]
        const blur = (
          copy[i - 4 + c] +
          copy[i + 4 + c] +
          copy[i - width * 4 + c] +
          copy[i + width * 4 + c] +
          center
        ) / 5
        const value = center + gain * (center - blur)
        data[i + c] = value < 0 ? 0 : value > 255 ? 255 : value
      }
    }
  }
}

function processFrame(src, sw, sh, options) {
  const opt = options || {}
  const data = new Uint8ClampedArray(src)
  let bg = null
  if (opt.replaceBg) {
    bg = replaceBackground(data, sw, sh, hexToRgb(opt.color || '#438EDB'), opt.strength || 'mid')
  }
  const dw = opt.width || sw
  const dh = opt.height || sh
  const same = dw === sw && dh === sh && opt.crop === false
  let out = data
  if (!same) {
    const win = opt.crop === false
      ? { x: 0, y: 0, cw: sw, ch: sh }
      : cropWindow(sw, sh, dw / dh, opt.offset || 0)
    out = scaleCrop(data, sw, sh, win, dw, dh)
  }
  if (opt.sharpen) sharpenImage(out, dw, dh, opt.sharpenAmount)
  return { data: out, width: dw, height: dh, bg }
}

module.exports = {
  hexToRgb,
  sampleBackground,
  replaceBackground,
  cropWindow,
  processFrame
}
