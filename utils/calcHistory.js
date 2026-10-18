const STORAGE_KEY = 'calc_result_history_v1'
const PAGE_SIZE = 8

function prettyExpression(expression) {
  return String(expression || '').replace(/\*/g, '×').replace(/\//g, '÷')
}

function formatHistoryTime(time) {
  const date = new Date(Number(time) || 0)
  if (!Number(time)) return ''
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const pad = (value) => (value < 10 ? '0' + value : '' + value)
  return date.getFullYear() + '-' + pad(month) + '-' + pad(day) + ' ' + pad(hour) + ':' + pad(minute)
}

function readHistory() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (!Array.isArray(raw)) return []
    return raw.filter((item) => item && item.id && item.expression && item.result)
  } catch (e) {
    return []
  }
}

function writeHistory(list) {
  wx.setStorageSync(STORAGE_KEY, list)
}

function filterHistory(list, keyword) {
  const text = String(keyword || '').replace(/\s/g, '').toLowerCase()
  if (!text) return list.slice()
  return list.filter((item) => {
    const expression = String(item.expression || '').toLowerCase()
    const pretty = prettyExpression(item.expression).toLowerCase().replace(/\s/g, '')
    const result = String(item.result || '').toLowerCase()
    return expression.indexOf(text) >= 0 || pretty.indexOf(text) >= 0 || result.indexOf(text) >= 0
  })
}

function slicePage(list, page, size) {
  const total = list.length
  const pageSize = size || PAGE_SIZE
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  let current = parseInt(page, 10) || 1
  if (current < 1) current = 1
  if (current > pageCount) current = pageCount
  const start = (current - 1) * pageSize
  return {
    page: current,
    pageCount,
    total,
    list: list.slice(start, start + pageSize)
  }
}

function addHistory(expression, result) {
  const expr = String(expression || '').trim()
  const value = String(result || '').trim()
  if (!expr || !value || expr === value) return { ok: true, list: readHistory(), saved: false }
  const list = readHistory()
  const latest = list[0]
  if (latest && latest.expression === expr && latest.result === value) {
    return { ok: true, list, saved: false }
  }
  list.unshift({
    id: Date.now() + '-' + Math.floor(Math.random() * 1000000),
    expression: expr,
    result: value,
    time: Date.now()
  })
  try {
    writeHistory(list)
  } catch (e) {
    return { ok: false, list: readHistory(), saved: false, message: '本地空间不足，请先删除一些记录' }
  }
  return { ok: true, list, saved: true }
}

function removeHistory(id) {
  const list = readHistory().filter((item) => item.id !== id)
  try {
    writeHistory(list)
  } catch (e) {
    return { ok: false, list: readHistory(), message: '没有删除成功' }
  }
  return { ok: true, list }
}

function presentHistory(keyword, page) {
  const all = readHistory()
  const filtered = filterHistory(all, keyword)
  const view = slicePage(filtered, page, PAGE_SIZE)
  return {
    historyTotal: all.length,
    historyMatch: filtered.length,
    historyPage: view.page,
    historyPageCount: view.pageCount,
    historyRows: view.list.map((item) => ({
      id: item.id,
      expression: prettyExpression(item.expression),
      result: item.result,
      timeText: formatHistoryTime(item.time)
    }))
  }
}

module.exports = {
  PAGE_SIZE,
  prettyExpression,
  filterHistory,
  slicePage,
  readHistory,
  addHistory,
  removeHistory,
  presentHistory
}
