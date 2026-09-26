const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const EVENTS = 'checkin_events'
const RECORDS = 'checkin_records'
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_EXPORT = 2000
const KEEP_MS = 7 * 24 * 60 * 60 * 1000

function fail(message) {
  return { ok: false, message }
}

function pad2(num) {
  return num < 10 ? `0${num}` : String(num)
}

function recordTime(value) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  if (typeof value === 'object') {
    if (value.$date) return recordTime(value.$date)
    if (typeof value.getTime === 'function') {
      const time = value.getTime()
      if (!Number.isNaN(time)) return time
    }
    const seconds = value.seconds || value._seconds
    if (typeof seconds === 'number') return seconds * 1000
  }
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function formatTime(value) {
  const time = recordTime(value)
  const date = time ? new Date(time) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())} ${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}:${pad2(shifted.getUTCSeconds())}`
}

function cleanText(value, max) {
  return String(value || '').trim().slice(0, max)
}

function makeCode() {
  let out = ''
  for (let i = 0; i < 8; i += 1) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return out
}

function xmlEscape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildXls(rows) {
  const body = rows
    .map((row) => {
      const cells = row
        .map((cell) => `<Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`)
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="签到">
<Table>
${body}
</Table>
</Worksheet>
</Workbook>`
  return Buffer.from(xml, 'utf8')
}

async function getEvent(eventId) {
  const id = cleanText(eventId, 32).toUpperCase()
  if (!id) return null
  try {
    const byCode = await db.collection(EVENTS).where({ code: id }).limit(1).get()
    if (byCode.data && byCode.data.length) return byCode.data[0]
  } catch (e) {}
  try {
    const direct = await db.collection(EVENTS).doc(id).get()
    return direct.data || null
  } catch (e) {
    return null
  }
}

function publicEvent(item) {
  if (!item) return null
  const fields = normalizeFields(item.fields)
  const expireAt = formatTime(new Date(new Date(item.createdAt).getTime() + KEEP_MS)).slice(0, 16)
  return {
    id: item.code || item._id,
    title: item.title,
    note: item.note || '',
    status: item.status === 'closed' ? 'closed' : 'open',
    createdAt: formatTime(item.createdAt),
    expireAt,
    expired: eventExpired(item),
    fields
  }
}

function eventExpired(item) {
  const at = item && item.createdAt ? new Date(item.createdAt).getTime() : 0
  if (!at || Number.isNaN(at)) return false
  return Date.now() - at >= KEEP_MS
}

function normalizeOptions(list) {
  const out = []
  const source = Array.isArray(list) ? list : []
  source.forEach((item) => {
    const text = cleanText(item, 12)
    if (!text || out.indexOf(text) >= 0 || out.length >= 10) return
    out.push(text)
  })
  return out
}

function normalizeCustoms(src) {
  const input = src && typeof src === 'object' ? src : {}
  const raw = Array.isArray(input.customs)
    ? input.customs
    : (Array.isArray(input.customFields) ? input.customFields : [])
  const out = []
  raw.forEach((item) => {
    if (!item || out.length >= 8) return
    const label = cleanText(item.label, 12)
    if (!label || out.some((row) => row.label === label)) return
    if (item.kind === 'select') {
      const options = normalizeOptions(item.options)
      if (options.length < 2) return
      out.push({ label, kind: 'select', options })
      return
    }
    out.push({ label, kind: 'text', options: [] })
  })
  if (!out.length && input.customLabel) {
    const label = cleanText(input.customLabel, 12)
    const options = normalizeOptions(input.customOptions)
    if (label && input.customKind === 'select' && options.length >= 2) {
      out.push({ label, kind: 'select', options })
    } else if (label) {
      out.push({ label, kind: 'text', options: [] })
    }
  }
  return out
}

function normalizeFields(fields) {
  const src = fields && typeof fields === 'object' ? fields : {}
  const customs = normalizeCustoms(src)
  const name = src.name !== false
  const first = customs[0] || { label: '', kind: '', options: [] }
  if (!name && !customs.length) {
    return { name: true, place: false, customs: [], customLabel: '', customKind: '', customOptions: [] }
  }
  return {
    name,
    place: false,
    customs,
    customLabel: first.label,
    customKind: first.kind,
    customOptions: first.options
  }
}

function dbMessage(error) {
  const msg = (error && (error.errMsg || error.message)) || ''
  if (/collection not exist|DATABASE_COLLECTION_NOT_EXIST|-502005/i.test(msg)) {
    return '数据库集合创建失败，请到云开发控制台打开数据库后再试'
  }
  if (/permission|PERMISSION_DENIED|-502003/i.test(msg)) {
    return '数据库权限不足'
  }
  if (/未开通|database not|DATABASE_NOT|-501001|-501009/i.test(msg)) {
    return '请先在云开发控制台开通数据库'
  }
  const detail = String(msg).replace(/\s+/g, ' ').slice(0, 60)
  return detail ? `签到失败：${detail}` : '签到创建失败，请重试'
}

function alreadyExists(error) {
  const msg = (error && (error.errMsg || error.message)) || ''
  return /already exist|ALREADY_EXIST|已存在|-502002/i.test(msg)
}

async function ensureCollection(name) {
  if (typeof db.createCollection !== 'function') return
  try {
    await db.createCollection(name)
  } catch (error) {
    if (alreadyExists(error)) return
    throw error
  }
}

async function createEvent(openid, event) {
  const title = cleanText(event.title, 30)
  if (!title) return fail('请填写签到名称')
  const note = cleanText(event.note, 40)
  const customs = normalizeCustoms({
    customFields: event.customFields,
    customLabel: event.useCustom ? event.customLabel : '',
    customKind: event.customKind,
    customOptions: event.customOptions
  })
  if (event.useCustom && event.customKind === 'select' && !customs.length) return fail('请至少添加两个选项')
  if (Array.isArray(event.customFields)) {
    const asked = event.customFields.filter((item) => item && String(item.label || '').trim())
    if (asked.length && asked.length !== customs.length) {
      const badSelect = asked.some((item) => item.kind === 'select' && normalizeOptions(item.options).length < 2)
      if (badSelect) return fail('请至少添加两个选项')
    }
  }
  const fields = {
    name: event.fieldName !== false,
    place: false,
    customs
  }
  if (!fields.name && !customs.length) return fail('请至少保留一个填写字段')
  const code = makeCode()
  const data = {
    code,
    title,
    note,
    fields,
    ownerOpenid: openid,
    status: 'open',
    createdAt: new Date()
  }
  try {
    await ensureCollection(EVENTS)
    await ensureCollection(RECORDS)
    await db.collection(EVENTS).add({ data })
  } catch (error) {
    return fail(dbMessage(error))
  }
  return {
    ok: true,
    isOwner: true,
    event: {
      id: code,
      title,
      note,
      status: 'open',
      createdAt: formatTime(new Date()),
      fields: normalizeFields(fields)
    }
  }
}

async function listMine(openid, page) {
  const size = 5
  try {
    await ensureCollection(EVENTS)
    const res = await db.collection(EVENTS).where({ ownerOpenid: openid }).limit(100).get()
    const all = (res.data || [])
      .slice()
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bt - at
      })
      .map(publicEvent)
      .filter(Boolean)
    const total = all.length
    const pages = Math.max(1, Math.ceil(total / size) || 1)
    const current = Math.min(Math.max(1, parseInt(page, 10) || 1), pages)
    return {
      ok: true,
      events: all.slice((current - 1) * size, current * size),
      page: current,
      pages: total ? pages : 1,
      total
    }
  } catch (error) {
    const msg = (error && (error.errMsg || error.message)) || ''
    if (/not exist|-502005/i.test(msg)) return { ok: true, events: [] }
    return fail(dbMessage(error))
  }
}

async function listJoined(openid, page) {
  const size = 5
  try {
    await ensureCollection(RECORDS)
    try {
      await purgeExpired()
    } catch (e) {}
    let rows = []
    try {
      const res = await db.collection(RECORDS).where({ openid }).limit(100).get()
      rows = res.data || []
    } catch (e) {}
    if (!rows.length) {
      try {
        const res = await db.collection(RECORDS).limit(100).get()
        rows = (res.data || []).filter((row) => row.openid === openid || row._openid === openid)
      } catch (e) {}
    }
    const cutoff = Date.now() - KEEP_MS
    const fresh = rows.filter((row) => {
      const at = recordTime(row.createdAt)
      return !at || at >= cutoff
    })
    fresh.sort((a, b) => recordTime(b.createdAt) - recordTime(a.createdAt))
    const keys = []
    fresh.forEach((row) => {
      if (row.eventId && keys.indexOf(row.eventId) < 0) keys.push(row.eventId)
    })
    const events = {}
    await Promise.all(keys.map(async (key) => {
      const item = await getEvent(key)
      if (item) events[item.code || item._id] = item
      if (item && item.code) events[item.code] = item
      if (item && item._id) events[item._id] = item
    }))
    const all = fresh.map((row) => {
      const item = events[row.eventId]
      const values = recordValues(row)
      return {
        id: row._id,
        eventId: row.eventId,
        title: item ? item.title : '签到',
        time: formatTime(row.createdAt),
        summary: [row.name].concat(values).filter(Boolean).join(' · ') || '已签到',
        status: item && item.status === 'closed' ? 'closed' : 'open',
        note: item ? (item.note || '') : '',
        answers: recordAnswers(row)
      }
    })
    const total = all.length
    const pages = Math.max(1, Math.ceil(total / size) || 1)
    const current = Math.min(Math.max(1, parseInt(page, 10) || 1), pages)
    return {
      ok: true,
      records: all.slice((current - 1) * size, current * size),
      page: current,
      pages: total ? pages : 1,
      total
    }
  } catch (error) {
    const msg = (error && (error.errMsg || error.message)) || ''
    if (/not exist|-502005/i.test(msg)) return { ok: true, records: [], page: 1, pages: 1, total: 0 }
    return fail(dbMessage(error))
  }
}

async function readRecord(openid, recordId) {
  const id = cleanText(recordId, 64)
  if (!id) return fail('找不到这条签到')
  let row
  try {
    const res = await db.collection(RECORDS).doc(id).get()
    row = res && res.data
  } catch (error) {
    return fail('找不到这条签到')
  }
  if (!row) return fail('找不到这条签到')
  if (row.openid !== openid && row._openid !== openid) return fail('只能查看自己的签到')
  const item = row.eventId ? await getEvent(row.eventId) : null
  return {
    ok: true,
    record: {
      id: row._id,
      eventId: row.eventId || '',
      title: item ? item.title : '签到',
      note: item ? (item.note || '') : '',
      status: item && item.status === 'closed' ? 'closed' : 'open',
      time: formatTime(row.createdAt),
      answers: recordAnswers(row)
    }
  }
}

async function readEvent(openid, eventId) {
  const item = await getEvent(eventId)
  if (!item) return fail('找不到这个签到')
  return {
    ok: true,
    event: publicEvent(item),
    isOwner: item.ownerOpenid === openid
  }
}

async function purgeExpired(eventKey) {
  const cutoff = Date.now() - KEEP_MS
  for (let round = 0; round < 20; round += 1) {
    let res
    try {
      const query = eventKey
        ? db.collection(RECORDS).where({ eventId: eventKey })
        : db.collection(RECORDS)
      res = await query.limit(100).get()
    } catch (error) {
      const msg = (error && (error.errMsg || error.message)) || ''
      if (/not exist|-502005/i.test(msg)) return
      throw error
    }
    const rows = ((res && res.data) || []).filter((row) => {
      const at = recordTime(row.createdAt)
      return at && at < cutoff
    })
    if (!rows.length) return
    await Promise.all(rows.map((row) => db.collection(RECORDS).doc(row._id).remove().catch(() => {})))
    if (((res && res.data) || []).length < 100) return
  }
}

async function listRecords(openid, eventId) {
  const item = await getEvent(eventId)
  if (!item) return fail('找不到这个签到')
  if (item.ownerOpenid !== openid) return fail('只有发起人可以查看名单')
  const eventKey = item.code || item._id
  try {
    await purgeExpired(eventKey)
  } catch (e) {}
  let rows = []
  try {
    await ensureCollection(RECORDS)
    const res = await db.collection(RECORDS).where({ eventId: eventKey }).limit(MAX_EXPORT).get()
    rows = res.data || []
  } catch (error) {
    const msg = (error && (error.errMsg || error.message)) || ''
    if (!/not exist|-502005/i.test(msg)) return fail(dbMessage(error))
  }
  const cutoff = Date.now() - KEEP_MS
  const fresh = []
  const stale = []
  rows.forEach((row) => {
    const at = row.createdAt ? new Date(row.createdAt).getTime() : 0
    if (at && at < cutoff) stale.push(row)
    else fresh.push(row)
  })
  if (stale.length) {
    await Promise.all(stale.map((row) => db.collection(RECORDS).doc(row._id).remove().catch(() => {})))
  }
  const records = fresh
    .slice()
    .sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return at - bt
    })
    .map((row, index) => ({
      index: index + 1,
      id: row._id,
      name: row.name || '',
      place: row.place || '',
      customs: Array.isArray(row.customs) ? row.customs : [],
      customValue: row.customValue || '',
      summary: [row.name].concat(recordValues(row)).filter(Boolean).join(' · ') || '未填写',
      time: formatTime(row.createdAt)
    }))
  return { ok: true, event: publicEvent(item), isOwner: true, records }
}

function recordValues(row) {
  if (Array.isArray(row.customs) && row.customs.length) {
    return row.customs.map((item) => item && item.value).filter(Boolean)
  }
  return row.customValue ? [row.customValue] : []
}

function recordAnswers(row) {
  const answers = []
  if (row.name) answers.push({ label: '姓名', value: row.name })
  if (Array.isArray(row.customs) && row.customs.length) {
    row.customs.forEach((item) => {
      if (!item || !item.label) return
      answers.push({ label: item.label, value: item.value || '' })
    })
    return answers
  }
  if (row.customLabel || row.customValue) {
    answers.push({ label: row.customLabel || '填写内容', value: row.customValue || '' })
  }
  return answers
}

function collectAnswers(customs, event) {
  const fields = customs || []
  const incoming = Array.isArray(event.customs) ? event.customs : []
  const saved = []
  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i]
    const found = incoming.find((item) => item && item.label === field.label)
    const legacy = fields.length === 1 && !incoming.length ? event.customValue : ''
    const value = cleanText((found && found.value) || legacy, 40)
    if (field.kind === 'select') {
      if (field.options.indexOf(value) < 0) return { error: `请选择${field.label}` }
    } else if (!value) {
      return { error: `请填写${field.label}` }
    }
    saved.push({ label: field.label, value })
  }
  return { customs: saved }
}

async function checkIn(openid, event) {
  const item = await getEvent(event.eventId)
  if (!item) return fail('二维码无效')
  if (eventExpired(item)) return fail('签到码已过期')
  if (item.status === 'closed') return fail('签到已结束')
  const fields = normalizeFields(item.fields)
  const name = fields.name ? cleanText(event.name, 20) : ''
  if (fields.name && !name) return fail('请填写姓名')
  const answers = collectAnswers(fields.customs, event)
  if (answers.error) return fail(answers.error)
  const eventKey = item.code || item._id
  try {
    await ensureCollection(RECORDS)
    await purgeExpired(eventKey)
  } catch (error) {
    if (!/not exist|-502005/i.test((error && (error.errMsg || error.message)) || '')) {
      return fail(dbMessage(error))
    }
  }
  let exist = { data: [] }
  try {
    exist = await db.collection(RECORDS).where({ eventId: eventKey, openid }).limit(1).get()
  } catch (error) {
    if (!/collection not exist|DATABASE_COLLECTION_NOT_EXIST|-502005/i.test((error && (error.errMsg || error.message)) || '')) {
      return fail('签到失败，请重试')
    }
  }
  if (exist.data && exist.data.length) {
    return { ok: false, duplicate: true, message: '你已经签过到了', event: publicEvent(item) }
  }
  try {
    await db.collection(RECORDS).add({
      data: {
        eventId: eventKey,
        openid,
        name,
        customs: answers.customs,
        customLabel: answers.customs[0] ? answers.customs[0].label : '',
        customValue: answers.customs.map((item) => item.value).filter(Boolean).join(' · '),
        createdAt: new Date()
      }
    })
  } catch (error) {
    return fail(dbMessage(error))
  }
  return { ok: true, event: publicEvent(item), name }
}

async function removeRecord(openid, recordId) {
  const id = cleanText(recordId, 64)
  if (!id) return fail('找不到这条签到')
  let row
  try {
    const res = await db.collection(RECORDS).doc(id).get()
    row = res && res.data
  } catch (error) {
    return fail('找不到这条签到')
  }
  if (!row) return fail('找不到这条签到')
  if (row.openid !== openid && row._openid !== openid) return fail('只能删除自己的签到')
  try {
    await db.collection(RECORDS).doc(id).remove()
  } catch (error) {
    return fail('删除失败，请重试')
  }
  return { ok: true }
}

async function removeEvent(openid, eventId) {
  const item = await getEvent(eventId)
  if (!item) return fail('找不到这个签到')
  if (item.ownerOpenid !== openid) return fail('只有发起人可以删除')
  const eventKey = item.code || item._id
  for (let round = 0; round < 20; round += 1) {
    let res
    try {
      res = await db.collection(RECORDS).where({ eventId: eventKey }).limit(100).get()
    } catch (error) {
      const msg = (error && (error.errMsg || error.message)) || ''
      if (/not exist|-502005/i.test(msg)) break
      return fail('删除失败，请重试')
    }
    const rows = (res && res.data) || []
    if (!rows.length) break
    await Promise.all(rows.map((row) => db.collection(RECORDS).doc(row._id).remove().catch(() => {})))
    if (rows.length < 100) break
  }
  try {
    await db.collection(EVENTS).doc(item._id).remove()
  } catch (error) {
    return fail('删除失败，请重试')
  }
  return { ok: true }
}

async function setStatus(openid, eventId, status) {
  const item = await getEvent(eventId)
  if (!item) return fail('找不到这个签到')
  if (item.ownerOpenid !== openid) return fail('只有发起人可以操作')
  const next = status === 'closed' ? 'closed' : 'open'
  await db.collection(EVENTS).doc(item._id).update({
    data: { status: next }
  })
  return { ok: true, event: publicEvent(Object.assign({}, item, { status: next })), isOwner: true }
}

async function makeCodeImage(code, envVersion) {
  const version = envVersion === 'release' || envVersion === 'trial' ? envVersion : 'trial'
  let res
  try {
    res = await cloud.openapi.wxacode.getUnlimited({
      scene: code,
      page: 'packageCheckin/pages/checkin/checkin',
      checkPath: false,
      envVersion: version,
      width: 430,
      isHyaline: false
    })
  } catch (error) {
    return fail(dbMessage(error))
  }
  const fileContent = Buffer.isBuffer(res) ? res : (res && res.buffer)
  if (!fileContent || fileContent[0] === 123) {
    return fail('签到码生成失败，请重新上传云函数后再生成')
  }
  return { ok: true, image: fileContent.toString('base64') }
}

async function getCodeImage(openid, eventId, envVersion) {
  const item = await getEvent(eventId)
  if (!item) return fail('找不到这个签到')
  if (item.ownerOpenid !== openid) return fail('只有发起人可以出示签到码')
  return makeCodeImage(item.code || item._id, envVersion)
}

async function exportExcel(openid, eventId) {
  const listed = await listRecords(openid, eventId)
  if (!listed.ok) return listed
  const fields = listed.event.fields || { name: true, place: false, customLabel: '' }
  const header = ['序号']
  const customs = fields.customs || []
  if (fields.name) header.push('姓名')
  customs.forEach((item) => header.push(item.label))
  header.push('签到时间', '签到名称')
  const rows = [header]
  const title = listed.event.title
  listed.records.forEach((row) => {
    const line = [row.index]
    if (fields.name) line.push(row.name)
    const values = Array.isArray(row.customs) ? row.customs : []
    customs.forEach((item) => {
      const found = values.find((entry) => entry && entry.label === item.label)
      line.push((found && found.value) || '')
    })
    line.push(row.time, title)
    rows.push(line)
  })
  if (rows.length === 1) rows.push(['', '暂无签到', '', title])
  const fileContent = buildXls(rows)
  const cloudPath = `checkin/${listed.event.id}-${Date.now()}.xls`
  const uploaded = await cloud.uploadFile({ cloudPath, fileContent })
  return { ok: true, fileID: uploaded.fileID, count: listed.records.length }
}

exports.main = async (event) => {
  if (event && (event.Type === 'Timer' || event.TriggerName === 'purgeCheckinRecords')) {
    try {
      await purgeExpired()
      return { ok: true }
    } catch (e) {
      const detail = (e && (e.errMsg || e.message)) || ''
      return fail(detail ? String(detail).slice(0, 80) : '清理失败')
    }
  }
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('请先登录微信后再试')
  const action = event && event.action
  try {
    if (action === 'createEvent') return await createEvent(OPENID, event)
    if (action === 'listMine') return await listMine(OPENID, event.page)
    if (action === 'listJoined') return await listJoined(OPENID, event.page)
    if (action === 'readRecord') return await readRecord(OPENID, event.recordId)
    if (action === 'readEvent') return await readEvent(OPENID, event.eventId)
    if (action === 'listRecords') return await listRecords(OPENID, event.eventId)
    if (action === 'checkIn') return await checkIn(OPENID, event)
    if (action === 'removeRecord') return await removeRecord(OPENID, event.recordId)
    if (action === 'removeEvent') return await removeEvent(OPENID, event.eventId)
    if (action === 'closeEvent') return await setStatus(OPENID, event.eventId, 'closed')
    if (action === 'openEvent') return await setStatus(OPENID, event.eventId, 'open')
    if (action === 'exportExcel') return await exportExcel(OPENID, event.eventId)
    if (action === 'getCodeImage') return await getCodeImage(OPENID, event.eventId, event.envVersion)
    return fail('未知操作')
  } catch (e) {
    const detail = (e && (e.errMsg || e.message)) || ''
    return fail(detail ? String(detail).slice(0, 80) : '云函数执行失败')
  }
}
