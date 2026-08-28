/**
 * 装修材料工程量估算
 * 公式参考装饰装修工程量计算惯例（面积/周长法 + 施工损耗）。
 * 结果用于备料参考，实际以现场放线、排版和供应商包装规格为准。
 */

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return NaN
  const n = Number(String(value).trim())
  return Number.isFinite(n) ? n : NaN
}

function round(value, digits) {
  if (!Number.isFinite(value)) return NaN
  const f = Math.pow(10, digits)
  return Math.round(value * f) / f
}

function ceilTo(value, step) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return NaN
  return Math.ceil(value / step - 1e-9) * step
}

function formatNum(value, digits) {
  if (!Number.isFinite(value)) return '—'
  const n = round(value, digits)
  const text = n.toFixed(digits)
  return String(Number(text))
}

const MATERIALS = [
  { id: 'tile', name: '瓷砖', loss: 8 },
  { id: 'floor', name: '木地板', loss: 5 },
  { id: 'paint', name: '乳胶漆', loss: 10 },
  { id: 'wallpaper', name: '壁纸', loss: 15 },
  { id: 'skirting', name: '踢脚线', loss: 5 },
  { id: 'ceiling', name: '吊顶', loss: 8 },
  { id: 'grout', name: '美缝剂', loss: 10 },
  { id: 'mortar', name: '水泥砂浆', loss: 5 }
]

function getMaterial(id) {
  return MATERIALS.find((item) => item.id === id) || MATERIALS[0]
}

function parseLoss(text, fallback) {
  const n = toNumber(text)
  if (!Number.isFinite(n) || n < 0 || n > 40) return fallback
  return n
}

function money(qty, price) {
  const p = toNumber(price)
  if (!Number.isFinite(qty) || !Number.isFinite(p) || p < 0) return { cost: NaN, costText: '' }
  const cost = round(qty * p, 2)
  return { cost, costText: `${cost.toFixed(2)} 元` }
}

function calcTile(input) {
  const length = toNumber(input.length)
  const width = toNumber(input.width)
  const tileW = toNumber(input.tileW)
  const tileH = toNumber(input.tileH)
  const perBox = toNumber(input.perBox)
  const loss = parseLoss(input.loss, 8)
  if (!(length > 0) || !(width > 0)) return { valid: false, message: '请填写房间长度、宽度（米）' }
  if (!(tileW > 0) || !(tileH > 0)) return { valid: false, message: '请填写瓷砖规格（毫米）' }
  const area = length * width
  const pieceArea = (tileW / 1000) * (tileH / 1000)
  const theory = area / pieceArea
  const withLoss = theory * (1 + loss / 100)
  const pieces = Math.ceil(withLoss - 1e-9)
  const boxCount = perBox > 0 ? Math.ceil(pieces / perBox - 1e-9) : NaN
  const buyQty = perBox > 0 ? boxCount : pieces
  const price = money(buyQty, input.price)
  return {
    valid: true,
    summary: `${pieces} 片`,
    unit: perBox > 0 ? `${boxCount} 箱` : '建议按片采购',
    formula: '铺贴面积 ÷ 单片面积 ×（1+损耗），向上取整',
    rows: [
      { label: '铺贴面积', value: `${formatNum(area, 2)} ㎡` },
      { label: '单片面积', value: `${formatNum(pieceArea, 4)} ㎡` },
      { label: '理论用量', value: `${formatNum(theory, 1)} 片` },
      { label: `含损耗 ${loss}%`, value: `${formatNum(withLoss, 1)} 片` },
      { label: '建议采购', value: perBox > 0 ? `${pieces} 片 / ${boxCount} 箱` : `${pieces} 片` }
    ],
    cost: price.cost,
    costText: price.costText
  }
}

function calcFloor(input) {
  const length = toNumber(input.length)
  const width = toNumber(input.width)
  const loss = parseLoss(input.loss, 5)
  if (!(length > 0) || !(width > 0)) return { valid: false, message: '请填写房间长度、宽度（米）' }
  const area = length * width
  const withLoss = area * (1 + loss / 100)
  const buy = ceilTo(withLoss, 0.1)
  const price = money(buy, input.price)
  return {
    valid: true,
    summary: `${formatNum(buy, 1)} ㎡`,
    unit: '建议按平方采购',
    formula: '房间面积 ×（1+损耗），按 0.1㎡ 进位',
    rows: [
      { label: '房间面积', value: `${formatNum(area, 2)} ㎡` },
      { label: `含损耗 ${loss}%`, value: `${formatNum(withLoss, 2)} ㎡` },
      { label: '建议采购', value: `${formatNum(buy, 1)} ㎡` }
    ],
    cost: price.cost,
    costText: price.costText
  }
}

function calcPaint(input) {
  const length = toNumber(input.length)
  const width = toNumber(input.width)
  const height = toNumber(input.height)
  const openings = Math.max(0, toNumber(input.openings) || 0)
  const coats = toNumber(input.coats)
  const coverage = toNumber(input.coverage)
  const bucket = toNumber(input.bucket)
  const loss = parseLoss(input.loss, 10)
  const includeCeiling = !!input.includeCeiling
  if (!(length > 0) || !(width > 0) || !(height > 0)) {
    return { valid: false, message: '请填写房间长、宽、层高（米）' }
  }
  if (!(coats > 0)) return { valid: false, message: '请填写涂刷遍数' }
  if (!(coverage > 0)) return { valid: false, message: '请填写涂料涂布率（㎡/升）' }
  const wall = Math.max(0, 2 * (length + width) * height - openings)
  const ceiling = includeCeiling ? length * width : 0
  const paintArea = wall + ceiling
  const liters = (paintArea * coats) / coverage
  const withLoss = liters * (1 + loss / 100)
  const buckets = bucket > 0 ? Math.ceil(withLoss / bucket - 1e-9) : NaN
  const buyQty = bucket > 0 ? buckets : ceilTo(withLoss, 0.5)
  const price = money(buyQty, input.price)
  return {
    valid: true,
    summary: bucket > 0 ? `${buckets} 桶` : `${formatNum(ceilTo(withLoss, 0.5), 1)} 升`,
    unit: includeCeiling ? '含墙面与顶面' : '仅墙面',
    formula: '（周长×层高−门窗 + 可选顶面）× 遍数 ÷ 涂布率 ×（1+损耗）',
    rows: [
      { label: '墙面净面积', value: `${formatNum(wall, 2)} ㎡` },
      { label: '顶面面积', value: includeCeiling ? `${formatNum(ceiling, 2)} ㎡` : '未计入' },
      { label: '涂刷面积', value: `${formatNum(paintArea, 2)} ㎡ × ${coats} 遍` },
      { label: '理论用量', value: `${formatNum(liters, 2)} 升` },
      { label: `含损耗 ${loss}%`, value: `${formatNum(withLoss, 2)} 升` },
      {
        label: '建议采购',
        value: bucket > 0 ? `${formatNum(withLoss, 1)} 升 / ${buckets} 桶` : `${formatNum(ceilTo(withLoss, 0.5), 1)} 升`
      }
    ],
    cost: price.cost,
    costText: price.costText
  }
}

function calcWallpaper(input) {
  const length = toNumber(input.length)
  const width = toNumber(input.width)
  const height = toNumber(input.height)
  const openings = Math.max(0, toNumber(input.openings) || 0)
  const rollW = toNumber(input.rollW)
  const rollL = toNumber(input.rollL)
  const loss = parseLoss(input.loss, 15)
  if (!(length > 0) || !(width > 0) || !(height > 0)) {
    return { valid: false, message: '请填写房间长、宽、层高（米）' }
  }
  if (!(rollW > 0) || !(rollL > 0)) return { valid: false, message: '请填写壁纸幅宽、卷长（米）' }
  const wall = Math.max(0, 2 * (length + width) * height - openings)
  const rollArea = rollW * rollL
  const theory = wall / rollArea
  const withLoss = theory * (1 + loss / 100)
  const rolls = Math.ceil(withLoss - 1e-9)
  const price = money(rolls, input.price)
  return {
    valid: true,
    summary: `${rolls} 卷`,
    unit: '按整卷采购',
    formula: '墙面净面积 ÷（幅宽×卷长）×（1+损耗），向上取整',
    rows: [
      { label: '墙面净面积', value: `${formatNum(wall, 2)} ㎡` },
      { label: '单卷面积', value: `${formatNum(rollArea, 2)} ㎡` },
      { label: '理论用量', value: `${formatNum(theory, 2)} 卷` },
      { label: `含损耗 ${loss}%`, value: `${formatNum(withLoss, 2)} 卷` },
      { label: '建议采购', value: `${rolls} 卷` }
    ],
    cost: price.cost,
    costText: price.costText
  }
}

function calcSkirting(input) {
  const length = toNumber(input.length)
  const width = toNumber(input.width)
  const doorW = Math.max(0, toNumber(input.doorW) || 0)
  const pieceLen = toNumber(input.pieceLen)
  const loss = parseLoss(input.loss, 5)
  if (!(length > 0) || !(width > 0)) return { valid: false, message: '请填写房间长度、宽度（米）' }
  const perimeter = 2 * (length + width)
  const net = Math.max(0, perimeter - doorW)
  const withLoss = net * (1 + loss / 100)
  const pieces = pieceLen > 0 ? Math.ceil(withLoss / pieceLen - 1e-9) : NaN
  const buyQty = pieceLen > 0 ? pieces : ceilTo(withLoss, 0.1)
  const price = money(buyQty, input.price)
  return {
    valid: true,
    summary: pieceLen > 0 ? `${pieces} 根` : `${formatNum(ceilTo(withLoss, 0.1), 1)} 米`,
    unit: '周长扣除门口',
    formula: '（房间周长 − 门口宽度）×（1+损耗）',
    rows: [
      { label: '房间周长', value: `${formatNum(perimeter, 2)} 米` },
      { label: '扣除门口', value: `${formatNum(doorW, 2)} 米` },
      { label: '净长度', value: `${formatNum(net, 2)} 米` },
      { label: `含损耗 ${loss}%`, value: `${formatNum(withLoss, 2)} 米` },
      {
        label: '建议采购',
        value: pieceLen > 0 ? `${formatNum(withLoss, 2)} 米 / ${pieces} 根` : `${formatNum(ceilTo(withLoss, 0.1), 1)} 米`
      }
    ],
    cost: price.cost,
    costText: price.costText
  }
}

function calcCeiling(input) {
  const length = toNumber(input.length)
  const width = toNumber(input.width)
  const loss = parseLoss(input.loss, 8)
  if (!(length > 0) || !(width > 0)) return { valid: false, message: '请填写房间长度、宽度（米）' }
  const area = length * width
  const withLoss = area * (1 + loss / 100)
  const buy = ceilTo(withLoss, 0.1)
  const price = money(buy, input.price)
  return {
    valid: true,
    summary: `${formatNum(buy, 1)} ㎡`,
    unit: '石膏板/铝扣板按面积备料',
    formula: '房间面积 ×（1+损耗），含裁切损耗',
    rows: [
      { label: '房间面积', value: `${formatNum(area, 2)} ㎡` },
      { label: `含损耗 ${loss}%`, value: `${formatNum(withLoss, 2)} ㎡` },
      { label: '建议采购', value: `${formatNum(buy, 1)} ㎡` }
    ],
    cost: price.cost,
    costText: price.costText
  }
}

function calcGrout(input) {
  const length = toNumber(input.length)
  const width = toNumber(input.width)
  const tileW = toNumber(input.tileW)
  const tileH = toNumber(input.tileH)
  const jointW = toNumber(input.jointW)
  const jointD = toNumber(input.jointD)
  const loss = parseLoss(input.loss, 10)
  if (!(length > 0) || !(width > 0)) return { valid: false, message: '请填写铺贴长度、宽度（米）' }
  if (!(tileW > 0) || !(tileH > 0)) return { valid: false, message: '请填写瓷砖规格（毫米）' }
  if (!(jointW > 0) || !(jointD > 0)) return { valid: false, message: '请填写缝宽、缝深（毫米）' }
  const area = length * width
  const tileWm = tileW / 1000
  const tileHm = tileH / 1000
  const jointLength = area * (1 / tileWm + 1 / tileHm)
  const volumeM3 = jointLength * (jointW / 1000) * (jointD / 1000)
  const kg = volumeM3 * 1600
  const withLoss = kg * (1 + loss / 100)
  const buy = ceilTo(withLoss, 0.1)
  const price = money(buy, input.price)
  return {
    valid: true,
    summary: `${formatNum(buy, 1)} kg`,
    unit: '密度按 1.6 g/cm³ 估算',
    formula: '缝长×缝宽×缝深×密度，缝长≈面积×（1/砖长+1/砖宽）',
    rows: [
      { label: '铺贴面积', value: `${formatNum(area, 2)} ㎡` },
      { label: '缝长估算', value: `${formatNum(jointLength, 1)} 米` },
      { label: '理论用量', value: `${formatNum(kg, 2)} kg` },
      { label: `含损耗 ${loss}%`, value: `${formatNum(withLoss, 2)} kg` },
      { label: '建议采购', value: `${formatNum(buy, 1)} kg` }
    ],
    cost: price.cost,
    costText: price.costText
  }
}

function calcMortar(input) {
  const length = toNumber(input.length)
  const width = toNumber(input.width)
  const thickness = toNumber(input.thickness)
  const loss = parseLoss(input.loss, 5)
  if (!(length > 0) || !(width > 0)) return { valid: false, message: '请填写房间长度、宽度（米）' }
  if (!(thickness > 0)) return { valid: false, message: '请填写找平/结合层厚度（毫米）' }
  const area = length * width
  const volume = area * (thickness / 1000)
  const withLoss = volume * (1 + loss / 100)
  const cement = withLoss * 400
  const sand = withLoss * 1200
  const buy = ceilTo(withLoss, 0.01)
  const price = money(buy, input.price)
  return {
    valid: true,
    summary: `${formatNum(buy, 2)} m³`,
    unit: '按 1:3 水泥砂浆估算',
    formula: '面积 × 厚度 ×（1+损耗）；水泥约 400kg/m³，砂约 1200kg/m³',
    rows: [
      { label: '铺贴面积', value: `${formatNum(area, 2)} ㎡` },
      { label: '砂浆体积', value: `${formatNum(volume, 3)} m³` },
      { label: `含损耗 ${loss}%`, value: `${formatNum(withLoss, 3)} m³` },
      { label: '水泥用量', value: `${formatNum(cement, 0)} kg` },
      { label: '中砂用量', value: `${formatNum(sand, 0)} kg` }
    ],
    cost: price.cost,
    costText: price.costText
  }
}

function calculateFitout(type, input) {
  if (type === 'tile') return calcTile(input)
  if (type === 'floor') return calcFloor(input)
  if (type === 'paint') return calcPaint(input)
  if (type === 'wallpaper') return calcWallpaper(input)
  if (type === 'skirting') return calcSkirting(input)
  if (type === 'ceiling') return calcCeiling(input)
  if (type === 'grout') return calcGrout(input)
  if (type === 'mortar') return calcMortar(input)
  return { valid: false, message: '请选择材料类型' }
}

module.exports = {
  MATERIALS,
  getMaterial,
  calculateFitout
}
