function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function createDraftStore(storageKey, maxCount) {
  const lastKey = `${storageKey}:last`

  function readList() {
    try {
      const list = wx.getStorageSync(storageKey)
      return Array.isArray(list) ? list : []
    } catch (e) {
      return []
    }
  }

  function writeList(list) {
    try {
      wx.setStorageSync(storageKey, list)
    } catch (e) {}
    return list
  }

  function getLastId() {
    try {
      return wx.getStorageSync(lastKey) || ''
    } catch (e) {
      return ''
    }
  }

  function setLastId(id) {
    try {
      wx.setStorageSync(lastKey, id || '')
    } catch (e) {}
  }

  return {
    maxCount,
    list: readList,
    getLastId,
    setLastId,
    get(id) {
      if (!id) return null
      return readList().find((item) => item.id === id) || null
    },
    save(draft) {
      const list = readList()
      const next = Object.assign({}, draft, {
        id: draft.id || nowId(),
        updatedAt: Date.now()
      })
      const index = list.findIndex((item) => item.id === next.id)
      if (index >= 0) {
        list.splice(index, 1)
        list.unshift(next)
        writeList(list)
        setLastId(next.id)
        return { ok: true, item: next, list }
      }
      if (list.length >= maxCount) {
        return { ok: false, code: 'limit', list, item: next }
      }
      list.unshift(next)
      writeList(list)
      setLastId(next.id)
      return { ok: true, item: next, list }
    },
    overwrite(id, draft) {
      const list = readList().filter((item) => item.id !== id)
      const next = Object.assign({}, draft, { id, updatedAt: Date.now() })
      list.unshift(next)
      writeList(list)
      setLastId(id)
      return { ok: true, item: next, list }
    },
    remove(id) {
      const list = readList().filter((item) => item.id !== id)
      writeList(list)
      if (getLastId() === id) setLastId(list[0] ? list[0].id : '')
      return { list }
    }
  }
}

function formatDraftTime(ts) {
  const d = new Date(ts || Date.now())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

module.exports = {
  nowId,
  createDraftStore,
  formatDraftTime
}
