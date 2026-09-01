/**
 * 记住各工具上次填写的数据，存本地。卸载/删除小程序后才会清空。
 */

const PREFIX = 'toolLastInput:'
const timers = {}

function storageKey(toolId) {
  return `${PREFIX}${toolId}`
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readLastInput(toolId) {
  if (!toolId) return null
  try {
    const raw = wx.getStorageSync(storageKey(toolId))
    return isPlainObject(raw) ? raw : null
  } catch (e) {
    return null
  }
}

function writeLastInput(toolId, values) {
  if (!toolId || !isPlainObject(values)) return
  try {
    wx.setStorageSync(storageKey(toolId), values)
  } catch (e) {}
}

function pickFields(source, fields) {
  const next = {}
  if (!source || !Array.isArray(fields)) return next
  fields.forEach((key) => {
    if (source[key] !== undefined) next[key] = source[key]
  })
  return next
}

function restoreLastInput(toolId, fields) {
  return pickFields(readLastInput(toolId), fields)
}

function saveLastInput(toolId, data, fields) {
  const next = pickFields(data, fields)
  if (!Object.keys(next).length) return
  writeLastInput(toolId, Object.assign({}, readLastInput(toolId) || {}, next))
}

function scheduleSaveLastInput(toolId, data, fields) {
  if (!toolId) return
  if (timers[toolId]) clearTimeout(timers[toolId])
  timers[toolId] = setTimeout(() => {
    timers[toolId] = null
    saveLastInput(toolId, data, fields)
  }, 240)
}

function flushLastInput(toolId, data, fields) {
  if (!toolId) return
  if (timers[toolId]) {
    clearTimeout(timers[toolId])
    timers[toolId] = null
  }
  saveLastInput(toolId, data, fields)
}

function mergePageData(page, extra) {
  const data = page && page.data ? page.data : {}
  return extra ? Object.assign({}, data, extra) : data
}

function createLastInput(toolId, fields) {
  return {
    restore() {
      return restoreLastInput(toolId, fields)
    },
    save(page, extra) {
      scheduleSaveLastInput(toolId, mergePageData(page, extra), fields)
    },
    flush(page, extra) {
      flushLastInput(toolId, mergePageData(page, extra), fields)
    }
  }
}

module.exports = {
  readLastInput,
  writeLastInput,
  restoreLastInput,
  saveLastInput,
  createLastInput
}
