/**
 * 将测算结果导出为可被 Excel 打开的 .xls（SpreadsheetML）
 * 写入小程序本地用户目录后，用系统文档预览打开，并可从右上角菜单保存到手机。
 */

function pad2(n) {
  return String(n).padStart(2, '0')
}

function stamp() {
  const d = new Date()
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`
}

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cellString(value, styleId) {
  const style = styleId ? ` ss:StyleID="${styleId}"` : ''
  return `<Cell${style}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`
}

function cellNumber(value, styleId) {
  const n = Number(value)
  const safe = Number.isFinite(n) ? n : 0
  const style = styleId ? ` ss:StyleID="${styleId}"` : ''
  return `<Cell${style}><Data ss:Type="Number">${safe}</Data></Cell>`
}

function row(cells) {
  return `<Row>${cells.join('')}</Row>`
}

function kvRow(label, value, asNumber) {
  return row([
    cellString(label, 'sLabel'),
    asNumber ? cellNumber(value, 'sMoney') : cellString(value)
  ])
}

function headerRow(labels) {
  return row(labels.map((label) => cellString(label, 'sHeader')))
}

function moneyOf(item, key) {
  if (!item || item[key] == null || item[key] === '') return 0
  const n = Number(item[key])
  return Number.isFinite(n) ? n : 0
}

function buildSummaryRows(payload) {
  const display = payload.display || {}
  const early = payload.earlyInfo || {}
  const input = payload.shareInput || {}
  const rows = [
    row([cellString('房贷测算结果', 'sTitle')]),
    kvRow('贷款类型', payload.loanTypeLabel || ''),
    kvRow('还款方式', payload.methodLabel || ''),
    kvRow(payload.paymentLabel || '还款金额', payload.summaryPayment || '')
  ]

  if (payload.isRemaining) {
    if (display.annualRate) rows.push(kvRow('当前执行利率', `${display.annualRate}%`))
    if (display.remainingYears) rows.push(kvRow('剩余还款年', `${display.remainingYears}年`))
  }

  if (input.mode === 'new' || (!payload.isRemaining && input.loanType)) {
    if (input.commercialAmount) rows.push(kvRow('商贷金额（万元）', input.commercialAmount))
    if (input.commercialYears) rows.push(kvRow('商贷年限（年）', input.commercialYears))
    if (input.commercialRate) rows.push(kvRow('商贷年利率（%）', input.commercialRate))
    if (input.providentAmount) rows.push(kvRow('公积金金额（万元）', input.providentAmount))
    if (input.providentYears) rows.push(kvRow('公积金年限（年）', input.providentYears))
    if (input.providentRate) rows.push(kvRow('公积金年利率（%）', input.providentRate))
  }

  if (payload.isRemaining && input.mode === 'remaining') {
    if (input.originalYears) rows.push(kvRow('首次贷款期限（年）', input.originalYears))
    if (input.firstRepaymentDate) rows.push(kvRow('首次还款日期', input.firstRepaymentDate))
  }

  if (payload.isEarlyRepayment) {
    if (early.typeLabel) rows.push(kvRow('提前还款类型', early.typeLabel))
    if (early.adjustLabel) rows.push(kvRow('调整方式', early.adjustLabel))
    if (early.prepayAmount) rows.push(kvRow('提前还款额（元）', early.prepayAmount))
    if (early.interestSaved) rows.push(kvRow('预计节省利息（元）', early.interestSaved))
    if (early.afterYears) rows.push(kvRow('调整后剩余年限', `${early.afterYears}年`))
    if (early.nextRepaymentDate) rows.push(kvRow('提前还款日期', early.nextRepaymentDate))
  }

  const principalLabel = payload.isRemaining ? '剩余本金（元）' : '贷款总额（元）'
  const interestLabel = payload.isFullPrepay
    ? '结清利息（元）'
    : payload.isRemaining
      ? '剩余利息（元）'
      : '支付利息（元）'
  const paymentLabel = payload.isFullPrepay
    ? '结清总额（元）'
    : payload.isRemaining
      ? '剩余还款总额（元）'
      : '还款总额（元）'

  rows.push(kvRow(principalLabel, display.totalPrincipal || ''))
  rows.push(kvRow(interestLabel, display.totalInterest || ''))
  rows.push(kvRow(paymentLabel, display.totalPayment || ''))
  rows.push(kvRow('还款期数', payload.months || 0, true))

  if (payload.isCombo) {
    rows.push(kvRow('商贷月供（首月）', payload.commercialFirst || ''))
    rows.push(kvRow('公积金月供（首月）', payload.providentFirst || ''))
  }

  if (display.lastMonthPayment && (payload.method === 'equalPrincipal' || payload.method === 'interestFirst')) {
    rows.push(kvRow('末月还款（元）', display.lastMonthPayment))
  }

  rows.push(row([]))
  rows.push(kvRow('说明', '计算结果仅供参考，实际以银行审批为准'))
  return rows
}

function buildScheduleRows(payload) {
  const isCombo = !!payload.isCombo
  const headers = isCombo
    ? ['期数', '月供', '本金', '利息', '剩余本金', '商贷本金', '商贷利息', '公积金本金', '公积金利息']
    : ['期数', '月供', '本金', '利息', '剩余本金']

  const rows = [headerRow(headers)]
  const list = payload.schedule || []

  list.forEach((item) => {
    const cells = [
      cellNumber(item.month),
      cellNumber(moneyOf(item, 'payment'), 'sMoney'),
      cellNumber(moneyOf(item, 'principal'), 'sMoney'),
      cellNumber(moneyOf(item, 'interest'), 'sMoney'),
      cellNumber(moneyOf(item, 'remaining'), 'sMoney')
    ]
    if (isCombo) {
      cells.push(cellNumber(moneyOf(item.commercial, 'principal'), 'sMoney'))
      cells.push(cellNumber(moneyOf(item.commercial, 'interest'), 'sMoney'))
      cells.push(cellNumber(moneyOf(item.provident, 'principal'), 'sMoney'))
      cells.push(cellNumber(moneyOf(item.provident, 'interest'), 'sMoney'))
    }
    rows.push(row(cells))
  })

  return rows
}

function buildWorkbookXml(payload) {
  const summaryRows = buildSummaryRows(payload).join('')
  const scheduleRows = buildScheduleRows(payload).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="sTitle"><Font ss:Bold="1" ss:Size="14"/></Style>
    <Style ss:ID="sHeader"><Font ss:Bold="1"/><Interior ss:Color="#E8F0EC" ss:Pattern="Solid"/></Style>
    <Style ss:ID="sLabel"><Font ss:Bold="1"/></Style>
    <Style ss:ID="sMoney"><NumberFormat ss:Format="#,##0.00"/></Style>
  </Styles>
  <Worksheet ss:Name="测算摘要">
    <Table ss:DefaultColumnWidth="88">${summaryRows}</Table>
  </Worksheet>
  <Worksheet ss:Name="还款计划">
    <Table ss:DefaultColumnWidth="80">${scheduleRows}</Table>
  </Worksheet>
</Workbook>`
}

function writeExcelFile(xml) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/fangdai-${stamp()}.xls`
    fs.writeFile({
      filePath,
      data: xml,
      encoding: 'utf8',
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
      fileType: 'xls',
      showMenu: true,
      success: resolve,
      fail() {
        if (typeof wx.shareFileMessage !== 'function') {
          reject(new Error('openDocument failed'))
          return
        }
        wx.shareFileMessage({
          filePath,
          fileName: '房贷计算结果.xls',
          success: resolve,
          fail: reject
        })
      }
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
      fileName: '房贷计算结果.xls',
      success: resolve,
      fail: reject
    })
  })
}

function exportResultToExcel(payload) {
  return writeExcelFile(buildWorkbookXml(payload || {}))
}

module.exports = {
  exportResultToExcel,
  openExcelFile,
  shareExcelFile
}
