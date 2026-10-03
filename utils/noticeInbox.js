const INBOX_KEY = 'notice_inbox'

function readInbox() {
  try {
    const saved = wx.getStorageSync(INBOX_KEY)
    if (saved && typeof saved === 'object') {
      return {
        read: saved.read || {},
        hidden: saved.hidden || {}
      }
    }
  } catch (e) {}
  return { read: {}, hidden: {} }
}

function writeInbox(inbox) {
  try { wx.setStorageSync(INBOX_KEY, inbox) } catch (e) {}
}

function stamp(item) {
  return Number(item && item.updatedAt) || 0
}

function isHidden(inbox, item) {
  const mark = Number(inbox.hidden[item.id]) || 0
  if (!mark) return false
  return mark >= stamp(item)
}

function isRead(inbox, item) {
  const mark = Number(inbox.read[item.id]) || 0
  if (!mark) return false
  return mark >= stamp(item)
}

function presentNotices(list, includeHidden) {
  const inbox = readInbox()
  return (list || []).filter((item) => item && item.id && (includeHidden || !isHidden(inbox, item))).map((item) => Object.assign({}, item, {
    unread: !isRead(inbox, item)
  }))
}

function visibleNotices(list) {
  return presentNotices(list, false)
}

function unreadCount(list) {
  return visibleNotices(list).filter((item) => item.unread).length
}

module.exports = {
  readInbox,
  writeInbox,
  stamp,
  visibleNotices,
  presentNotices,
  unreadCount
}
