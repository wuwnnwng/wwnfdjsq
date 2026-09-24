const DRAFT_KEY = 'mbtiDraft'
const HISTORY_KEY = 'mbtiHistory'
const MAX_HISTORY = 6

function read(key) {
  try {
    return wx.getStorageSync(key)
  } catch (e) {
    return null
  }
}

function write(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (e) {}
}

function loadDraft() {
  const draft = read(DRAFT_KEY)
  if (!draft || typeof draft !== 'object') return null
  if (draft.mode !== 'quick' && draft.mode !== 'standard' && draft.mode !== 'deep') return null
  if (!draft.answers || typeof draft.answers !== 'object') return null
  return draft
}

function saveDraft(draft) {
  write(DRAFT_KEY, draft)
}

function clearDraft() {
  try {
    wx.removeStorageSync(DRAFT_KEY)
  } catch (e) {}
}

function loadHistory() {
  const list = read(HISTORY_KEY)
  if (!Array.isArray(list)) return []
  return list.filter((item) => item && item.code && item.at).slice(0, MAX_HISTORY)
}

function pushHistory(item) {
  const list = loadHistory().filter((row) => row.at !== item.at)
  list.unshift(item)
  const next = list.slice(0, MAX_HISTORY)
  write(HISTORY_KEY, next)
  return next
}

function clearHistory() {
  try {
    wx.removeStorageSync(HISTORY_KEY)
  } catch (e) {}
}

module.exports = {
  loadDraft,
  saveDraft,
  clearDraft,
  loadHistory,
  pushHistory,
  clearHistory
}
