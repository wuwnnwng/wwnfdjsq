/**
 * QR Code 生成（UTF-8 字节模式，纠错等级 M，版本 1–15）
 *
 * 微信扫一扫不认 ECI。中文若带 ECI-26，会被当成物品码并提示「未找到物品信息」。
 * 非 ASCII 的纯文本改为 UTF-8 + BOM、不写 ECI，微信才能当文本识别。
 */

const ALIGN_POS = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70]
]

const REMAINDER_BITS = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0, 0, 3, 3]

// ECC M：每块纠错码字数 + 数据块分组 [块数, 每块数据码字]
const ECC_M = [
  null,
  { ec: 10, groups: [[1, 16]] },
  { ec: 16, groups: [[1, 28]] },
  { ec: 26, groups: [[1, 44]] },
  { ec: 18, groups: [[2, 32]] },
  { ec: 24, groups: [[2, 43]] },
  { ec: 16, groups: [[4, 27]] },
  { ec: 18, groups: [[4, 31]] },
  { ec: 22, groups: [[2, 38], [2, 39]] },
  { ec: 22, groups: [[3, 36], [2, 37]] },
  { ec: 26, groups: [[4, 43], [1, 44]] },
  { ec: 30, groups: [[1, 50], [4, 51]] },
  { ec: 22, groups: [[6, 36], [2, 37]] },
  { ec: 22, groups: [[8, 37], [1, 38]] },
  { ec: 24, groups: [[4, 40], [5, 41]] },
  { ec: 24, groups: [[5, 41], [5, 42]] }
]

const GF_EXP = new Array(512)
const GF_LOG = new Array(256)
;(function initGF() {
  let x = 1
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255]
  }
})()

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function polyMul(a, b) {
  const result = new Array(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      result[i + j] ^= gfMul(a[i], b[j])
    }
  }
  return result
}

function polyMod(dividend, divisor) {
  let rest = dividend.slice()
  while (rest.length >= divisor.length) {
    const coef = rest[0]
    if (coef !== 0) {
      for (let i = 0; i < divisor.length; i += 1) {
        rest[i] ^= gfMul(divisor[i], coef)
      }
    }
    rest.shift()
  }
  return rest
}

function rsGenerator(degree) {
  let poly = [1]
  for (let i = 0; i < degree; i += 1) {
    poly = polyMul(poly, [1, GF_EXP[i]])
  }
  return poly
}

function rsEncode(data, ecCount) {
  const gen = rsGenerator(ecCount)
  const padded = data.concat(new Array(ecCount).fill(0))
  return polyMod(padded, gen)
}

function toUtf8Bytes(text) {
  const bytes = []
  const str = String(text || '')
  for (let i = 0; i < str.length; i += 1) {
    let code = str.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const extra = str.charCodeAt(i + 1)
      if (extra >= 0xdc00 && extra <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (extra - 0xdc00)
        i += 1
      }
    }
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      )
    }
  }
  return bytes
}

function dataCodewords(version) {
  const spec = ECC_M[version]
  let total = 0
  spec.groups.forEach((group) => {
    total += group[0] * group[1]
  })
  return total
}

function hasNonAscii(text) {
  return /[^\x00-\x7F]/.test(String(text || ''))
}

function looksLikeUrl(text) {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(String(text || '').trim())
}

function maxBytesForVersion(version, withEci) {
  const countBits = version <= 9 ? 8 : 16
  const eciBits = withEci ? 12 : 0
  return Math.floor((dataCodewords(version) * 8 - 4 - countBits - eciBits) / 8)
}

function chooseVersion(byteLength, withEci) {
  for (let version = 1; version <= 15; version += 1) {
    if (byteLength <= maxBytesForVersion(version, withEci)) return version
  }
  return 0
}

function BitBuffer() {
  this.bytes = []
  this.bitLength = 0
}

BitBuffer.prototype.put = function put(value, length) {
  for (let i = length - 1; i >= 0; i -= 1) {
    this.putBit((value >>> i) & 1)
  }
}

BitBuffer.prototype.putBit = function putBit(bit) {
  const index = this.bitLength >> 3
  if (this.bytes.length <= index) this.bytes.push(0)
  if (bit) this.bytes[index] |= 0x80 >> (this.bitLength & 7)
  this.bitLength += 1
}

function buildDataCodewords(bytes, version, withEci) {
  const capacity = dataCodewords(version)
  const countBits = version <= 9 ? 8 : 16
  const buf = new BitBuffer()
  if (withEci) {
    buf.put(0x7, 4)
    buf.put(26, 8)
  }
  buf.put(0x4, 4)
  buf.put(bytes.length, countBits)
  bytes.forEach((item) => buf.put(item, 8))

  const remaining = capacity * 8 - buf.bitLength
  buf.put(0, Math.min(4, Math.max(0, remaining)))
  while (buf.bitLength % 8 !== 0) buf.putBit(0)

  const pads = [0xec, 0x11]
  let padIndex = 0
  while (buf.bytes.length < capacity) {
    buf.put(pads[padIndex % 2], 8)
    padIndex += 1
  }
  return buf.bytes.slice(0, capacity)
}

function interleaveBlocks(data, version) {
  const spec = ECC_M[version]
  const blocks = []
  let offset = 0
  spec.groups.forEach((group) => {
    const count = group[0]
    const dataLen = group[1]
    for (let i = 0; i < count; i += 1) {
      const blockData = data.slice(offset, offset + dataLen)
      offset += dataLen
      blocks.push({
        data: blockData,
        ecc: rsEncode(blockData, spec.ec)
      })
    }
  })

  const maxData = Math.max.apply(
    null,
    blocks.map((item) => item.data.length)
  )
  const result = []
  for (let i = 0; i < maxData; i += 1) {
    blocks.forEach((block) => {
      if (i < block.data.length) result.push(block.data[i])
    })
  }
  for (let i = 0; i < spec.ec; i += 1) {
    blocks.forEach((block) => {
      result.push(block.ecc[i])
    })
  }
  return result
}

function matrixSize(version) {
  return version * 4 + 17
}

function makeMatrix(size, fill) {
  const rows = []
  for (let y = 0; y < size; y += 1) {
    const row = []
    for (let x = 0; x < size; x += 1) {
      row.push(fill)
    }
    rows.push(row)
  }
  return rows
}

function setModule(grid, reserved, x, y, dark, lock) {
  if (y < 0 || x < 0 || y >= grid.length || x >= grid.length) return
  grid[y][x] = dark ? 1 : 0
  if (lock) reserved[y][x] = 1
}

function placeFinder(grid, reserved, ox, oy) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const inPattern = x >= 0 && x <= 6 && y >= 0 && y <= 6
      const dark = inPattern && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4))
      setModule(grid, reserved, ox + x, oy + y, dark, true)
    }
  }
}

function placeAlignment(grid, reserved, cx, cy) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const dark = x === -2 || x === 2 || y === -2 || y === 2 || (x === 0 && y === 0)
      setModule(grid, reserved, cx + x, cy + y, dark, true)
    }
  }
}

function placeFunctionPatterns(grid, reserved, version) {
  const size = grid.length
  placeFinder(grid, reserved, 0, 0)
  placeFinder(grid, reserved, size - 7, 0)
  placeFinder(grid, reserved, 0, size - 7)

  for (let i = 8; i < size - 8; i += 1) {
    const dark = i % 2 === 0
    setModule(grid, reserved, i, 6, dark, true)
    setModule(grid, reserved, 6, i, dark, true)
  }

  const aligns = ALIGN_POS[version] || []
  aligns.forEach((row) => {
    aligns.forEach((col) => {
      if ((row === 6 && col === 6) || (row === 6 && col === size - 7) || (row === size - 7 && col === 6)) {
        return
      }
      placeAlignment(grid, reserved, col, row)
    })
  })

  for (let i = 0; i < 9; i += 1) {
    setModule(grid, reserved, 8, i, false, true)
    setModule(grid, reserved, i, 8, false, true)
  }
  for (let i = 0; i < 8; i += 1) {
    setModule(grid, reserved, size - 1 - i, 8, false, true)
    setModule(grid, reserved, 8, size - 1 - i, false, true)
  }
  setModule(grid, reserved, 8, size - 8, true, true)

  if (version >= 7) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        setModule(grid, reserved, size - 11 + j, i, false, true)
        setModule(grid, reserved, i, size - 11 + j, false, true)
      }
    }
  }
}

function bitsToList(value, length) {
  const bits = []
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1)
  }
  return bits
}

function formatBits(mask) {
  const data = mask
  let bits = data << 10
  for (let i = 14; i >= 10; i -= 1) {
    if ((bits >>> i) & 1) bits ^= 0x537 << (i - 10)
  }
  return ((data << 10) | (bits & 0x3ff)) ^ 0x5412
}

function versionBits(version) {
  let bits = version << 12
  for (let i = 17; i >= 12; i -= 1) {
    if ((bits >>> i) & 1) bits ^= 0x1f25 << (i - 12)
  }
  return (version << 12) | (bits & 0xfff)
}

function placeFormat(grid, reserved, mask) {
  const bits = bitsToList(formatBits(mask), 15)
  const size = grid.length
  const mapA = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ]
  mapA.forEach((pos, index) => {
    setModule(grid, reserved, pos[0], pos[1], bits[index], true)
  })
  const mapB = [
    [size - 1, 8],
    [size - 2, 8],
    [size - 3, 8],
    [size - 4, 8],
    [size - 5, 8],
    [size - 6, 8],
    [size - 7, 8],
    [size - 8, 8],
    [8, size - 7],
    [8, size - 6],
    [8, size - 5],
    [8, size - 4],
    [8, size - 3],
    [8, size - 2],
    [8, size - 1]
  ]
  mapB.forEach((pos, index) => {
    setModule(grid, reserved, pos[0], pos[1], bits[index], true)
  })
}

function placeVersion(grid, reserved, version) {
  if (version < 7) return
  const bits = bitsToList(versionBits(version), 18)
  const size = grid.length
  let index = 0
  for (let i = 0; i < 6; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      const dark = bits[17 - index]
      setModule(grid, reserved, size - 11 + j, i, dark, true)
      setModule(grid, reserved, i, size - 11 + j, dark, true)
      index += 1
    }
  }
}

function maskBit(mask, row, col) {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0
    case 1:
      return row % 2 === 0
    case 2:
      return col % 3 === 0
    case 3:
      return (row + col) % 3 === 0
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0
  }
}

function placeData(grid, reserved, codewords, version, mask) {
  const size = grid.length
  const bits = []
  codewords.forEach((value) => {
    for (let i = 7; i >= 0; i -= 1) bits.push((value >>> i) & 1)
  })
  const extra = REMAINDER_BITS[version] || 0
  for (let i = 0; i < extra; i += 1) bits.push(0)

  let bitIndex = 0
  let upward = true
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1
    for (let i = 0; i < size; i += 1) {
      const row = upward ? size - 1 - i : i
      for (let dx = 0; dx < 2; dx += 1) {
        const x = col - dx
        if (reserved[row][x]) continue
        let dark = bitIndex < bits.length ? bits[bitIndex] : 0
        bitIndex += 1
        if (maskBit(mask, row, x)) dark ^= 1
        grid[row][x] = dark
      }
    }
    upward = !upward
  }
}

function cloneMatrix(grid) {
  return grid.map((row) => row.slice())
}

function penaltyScore(grid) {
  const size = grid.length
  let score = 0

  for (let y = 0; y < size; y += 1) {
    let run = 1
    for (let x = 1; x <= size; x += 1) {
      if (x < size && grid[y][x] === grid[y][x - 1]) {
        run += 1
      } else {
        if (run >= 5) score += 3 + (run - 5)
        run = 1
      }
    }
  }
  for (let x = 0; x < size; x += 1) {
    let run = 1
    for (let y = 1; y <= size; y += 1) {
      if (y < size && grid[y][x] === grid[y - 1][x]) {
        run += 1
      } else {
        if (run >= 5) score += 3 + (run - 5)
        run = 1
      }
    }
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const v = grid[y][x]
      if (v === grid[y][x + 1] && v === grid[y + 1][x] && v === grid[y + 1][x + 1]) {
        score += 3
      }
    }
  }

  const finder = [1, 0, 1, 1, 1, 0, 1]
  function hasFinder(line, start) {
    for (let i = 0; i < 7; i += 1) {
      if (line[start + i] !== finder[i]) return false
    }
    return true
  }
  function countFinder(line) {
    let n = 0
    for (let i = 0; i <= line.length - 7; i += 1) {
      if (!hasFinder(line, i)) continue
      const left = i >= 4 && line[i - 1] === 0 && line[i - 2] === 0 && line[i - 3] === 0 && line[i - 4] === 0
      const right =
        i + 11 <= line.length &&
        line[i + 7] === 0 &&
        line[i + 8] === 0 &&
        line[i + 9] === 0 &&
        line[i + 10] === 0
      if (left || right) n += 1
    }
    return n
  }
  for (let y = 0; y < size; y += 1) score += countFinder(grid[y]) * 40
  for (let x = 0; x < size; x += 1) {
    const col = []
    for (let y = 0; y < size; y += 1) col.push(grid[y][x])
    score += countFinder(col) * 40
  }

  let dark = 0
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (grid[y][x]) dark += 1
    }
  }
  const percent = (dark * 100) / (size * size)
  score += Math.floor(Math.abs(percent - 50) / 5) * 10
  return score
}

function encodeQr(text) {
  const content = String(text || '')
  if (!content.trim()) {
    return { ok: false, message: '请输入文字或网址' }
  }
  // 网址开头必须是协议，不能加 BOM；中文文本加 BOM 便于微信按 UTF-8 解码
  const payload = hasNonAscii(content) && !looksLikeUrl(content) ? `\uFEFF${content}` : content
  const bytes = toUtf8Bytes(payload)
  const version = chooseVersion(bytes.length, false)
  if (!version) {
    return { ok: false, message: '内容过长，请缩短后再生成（约 200 个英文或 130 个汉字以内）' }
  }

  const data = buildDataCodewords(bytes, version, false)
  const codewords = interleaveBlocks(data, version)
  const size = matrixSize(version)

  let best = null
  for (let mask = 0; mask < 8; mask += 1) {
    const grid = makeMatrix(size, 0)
    const reserved = makeMatrix(size, 0)
    placeFunctionPatterns(grid, reserved, version)
    placeFormat(grid, reserved, mask)
    placeVersion(grid, reserved, version)
    placeData(grid, reserved, codewords, version, mask)
    const score = penaltyScore(grid)
    if (!best || score < best.score) {
      best = { grid, score, mask }
    }
  }

  return {
    ok: true,
    version,
    mask: best.mask,
    size,
    modules: best.grid
  }
}

function normalizeWebsite(text, scheme) {
  const value = String(text || '').trim()
  if (!value) return ''
  const protocol = scheme === 'http' ? 'http' : 'https'
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/^https?:\/\//i, `${protocol}://`)
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return value
  if (/^\/\//.test(value)) return `${protocol}:${value}`
  return `${protocol}://${value}`
}

module.exports = {
  encodeQr,
  normalizeWebsite,
  toUtf8Bytes
}
