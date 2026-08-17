/**
 * 导出真正的 .xlsx（OOXML + ZIP）。
 * 微信预览器只认标准 xlsx/xls 文件头，XML 冒充 .xls 会提示格式不可识别并闪退。
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function pad2(n) {
  return String(n).padStart(2, '0')
}

function stamp() {
  const d = new Date()
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`
}

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function moneyOf(item, key) {
  if (!item || item[key] == null || item[key] === '') return 0
  const n = Number(item[key])
  return Number.isFinite(n) ? n : 0
}

function num(value) {
  const n = Number(value)
  return { n: Number.isFinite(n) ? n : 0 }
}

function colName(index) {
  let n = index
  let name = ''
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name
    n = Math.floor(n / 26) - 1
  }
  return name
}

function utf8Bytes(str) {
  const text = String(str || '')
  if (typeof TextEncoder === 'function') {
    return new TextEncoder().encode(text)
  }
  const raw = unescape(encodeURIComponent(text))
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i)
  }
  return bytes
}

function u16(n) {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff])
}

function u32(n) {
  return new Uint8Array([
    n & 0xff,
    (n >>> 8) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 24) & 0xff
  ])
}

function concatBytes(parts) {
  let total = 0
  parts.forEach((part) => {
    total += part.length
  })
  const out = new Uint8Array(total)
  let offset = 0
  parts.forEach((part) => {
    out.set(part, offset)
    offset += part.length
  })
  return out
}

function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(now = new Date()) {
  const time =
    (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)
  const date =
    ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  return { time, date }
}

function zipStore(files) {
  const { time, date } = dosDateTime()
  const locals = []
  const centrals = []
  let offset = 0

  files.forEach((file) => {
    const nameBytes = utf8Bytes(file.name)
    const data = file.data
    const crc = crc32(data)
    const local = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(time),
      u16(date),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      data
    ])
    locals.push(local)
    centrals.push(
      concatBytes([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(time),
        u16(date),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(nameBytes.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBytes
      ])
    )
    offset += local.length
  })

  const central = concatBytes(centrals)
  const eocd = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0)
  ])
  return concatBytes(locals.concat([central, eocd]))
}

function sheetCell(col, rowIndex, value) {
  const ref = `${colName(col)}${rowIndex}`
  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'n')) {
    return `<c r="${ref}" t="n"><v>${value.n}</v></c>`
  }
  // 微信内置预览不支持 inlineStr，文字必须写在 <v> 里才能显示表头
  return `<c r="${ref}" t="str"><v>${escapeXml(value == null ? '' : value)}</v></c>`
}

function buildColsXml(widths) {
  if (!widths || !widths.length) return ''
  const cols = widths
    .map((width, index) => {
      if (!(width > 0)) return ''
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
    })
    .join('')
  return cols ? `<cols>${cols}</cols>` : ''
}

function buildSheetXml(records, colWidths) {
  const rowsXml = records
    .map((record, index) => {
      const r = index + 1
      const cells = (record || [])
        .map((value, col) => sheetCell(col, r, value == null ? '' : value))
        .join('')
      return `<row r="${r}">${cells}</row>`
    })
    .join('')
  const maxCol = records.reduce((max, record) => Math.max(max, (record || []).length), 1)
  const lastRow = Math.max(records.length, 1)
  const dim = `A1:${colName(maxCol - 1)}${lastRow}`

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dim}"/>
  ${buildColsXml(colWidths)}
  <sheetData>${rowsXml}</sheetData>
</worksheet>`
}

function kv(label, value, asNumber) {
  return asNumber ? [label, num(value)] : [label, value == null ? '' : String(value)]
}

function buildSummaryRecords(payload) {
  const display = payload.display || {}
  const early = payload.earlyInfo || {}
  const rows = [['项目', '内容']]

  rows.push(kv('贷款类型', payload.loanTypeLabel || ''))
  rows.push(kv('还款方式', payload.methodLabel || ''))
  rows.push(kv(payload.paymentLabel || '还款金额', payload.summaryPayment || ''))

  if (payload.method === 'equalPrincipal' && !payload.isFullPrepay && display.monthlyDecrease) {
    rows.push(kv('每月递减约（元）', display.monthlyDecrease))
  }
  if (payload.method === 'interestFirst' && !payload.isFullPrepay) {
    rows.push(kv('说明', '到期另还全部本金'))
  }

  if (payload.isRemaining) {
    if (display.annualRate) rows.push(kv('当前执行利率', `${display.annualRate}%`))
    if (!payload.isEarlyRepayment && display.remainingYears) {
      rows.push(kv('剩余还款年', `${display.remainingYears}年`))
    }
  }

  if (payload.isPartialPrepay && early.afterYears) {
    rows.push(kv('调整后剩余年限', `${early.afterYears}年`))
  }

  if (payload.isEarlyRepayment) {
    if (early.typeLabel) rows.push(kv('提前还款类型', early.typeLabel))
    if (early.adjustLabel) rows.push(kv('调整方式', early.adjustLabel))
    if (early.prepayAmount) rows.push(kv('提前还款额（元）', early.prepayAmount))
    if (early.interestSaved) rows.push(kv('预计节省利息（元）', early.interestSaved))
    if (early.afterMonths) rows.push(kv('提前后剩余期数', `${early.afterMonths} 期`))
    if (early.nextRepaymentDate) rows.push(kv('提前还款日期', early.nextRepaymentDate))
  }

  const principalLabel = payload.isRemaining ? '剩余本金（元）' : '贷款总额（元）'
  const interestLabel = payload.isFullPrepay
    ? '结清利息（元）'
    : payload.isRemaining
      ? '剩余利息（元）'
      : '支付利息（元）'
  const totalLabel = payload.isFullPrepay
    ? '结清总额（元）'
    : payload.isRemaining
      ? '剩余还款总额（元）'
      : '还款总额（元）'

  rows.push(kv(principalLabel, display.totalPrincipal || ''))
  rows.push(kv(interestLabel, display.totalInterest || ''))
  rows.push(kv(totalLabel, display.totalPayment || ''))
  rows.push(kv('还款期数', payload.months || 0, true))

  if (payload.isCombo) {
    rows.push(kv('商贷月供（首月）', payload.commercialFirst || ''))
    rows.push(kv('公积金月供（首月）', payload.providentFirst || ''))
  }

  if (
    display.lastMonthPayment &&
    (payload.method === 'equalPrincipal' || payload.method === 'interestFirst')
  ) {
    rows.push(kv('末月还款（元）', display.lastMonthPayment))
  }

  return rows
}

function buildScheduleRecords(payload) {
  const isCombo = !!payload.isCombo
  const rows = [
    isCombo
      ? ['期数', '月供', '本金', '利息', '剩余本金', '商贷本金', '商贷利息', '公积金本金', '公积金利息']
      : ['期数', '月供', '本金', '利息', '剩余本金']
  ]

  ;(payload.schedule || []).forEach((item) => {
    const line = [
      num(item.month),
      num(moneyOf(item, 'payment')),
      num(moneyOf(item, 'principal')),
      num(moneyOf(item, 'interest')),
      num(moneyOf(item, 'remaining'))
    ]
    if (isCombo) {
      line.push(num(moneyOf(item.commercial, 'principal')))
      line.push(num(moneyOf(item.commercial, 'interest')))
      line.push(num(moneyOf(item.provident, 'principal')))
      line.push(num(moneyOf(item.provident, 'interest')))
    }
    rows.push(line)
  })

  return rows
}

function buildXlsxBytes(payload) {
  const sheet1 = buildSheetXml(buildSummaryRecords(payload), [16.86, 22])
  const sheet2 = buildSheetXml(buildScheduleRecords(payload))

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="测算摘要" sheetId="1" r:id="rId1"/>
    <sheet name="还款计划" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`

  return zipStore([
    { name: '[Content_Types].xml', data: utf8Bytes(contentTypes) },
    { name: '_rels/.rels', data: utf8Bytes(rootRels) },
    { name: 'xl/workbook.xml', data: utf8Bytes(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8Bytes(workbookRels) },
    { name: 'xl/worksheets/sheet1.xml', data: utf8Bytes(sheet1) },
    { name: 'xl/worksheets/sheet2.xml', data: utf8Bytes(sheet2) }
  ])
}

function toArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

function writeExcelFile(bytes) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/fangdai-${stamp()}.xlsx`
    fs.writeFile({
      filePath,
      data: toArrayBuffer(bytes),
      success() {
        resolve(filePath)
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

function openExcelFile(filePath) {
  return new Promise((resolve, reject) => {
    wx.openDocument({
      filePath,
      fileType: 'xlsx',
      showMenu: true,
      success: resolve,
      fail: reject
    })
  })
}

function shareExcelFile(filePath) {
  return new Promise((resolve, reject) => {
    if (typeof wx.shareFileMessage !== 'function') {
      reject(new Error('shareFileMessage unavailable'))
      return
    }
    wx.shareFileMessage({
      filePath,
      fileName: '房贷计算结果.xlsx',
      success: resolve,
      fail: reject
    })
  })
}

function exportResultToExcel(payload) {
  return writeExcelFile(buildXlsxBytes(payload || {}))
}

module.exports = {
  exportResultToExcel,
  openExcelFile,
  shareExcelFile
}
