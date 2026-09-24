const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const EVENTS = 'checkin_events'
const RECORDS = 'checkin_records'
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_EXPORT = 2000

function fail(message) {
  return { ok: false, message }
}

function pad2(num) {
  return num < 10 ? `0${num}` : String(num)
}

function formatTime(value) {
  const date = value instanceof Date ? value : new Date(value)
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
  return {
    id: item.code || item._id,
    title: item.title,
    note: item.note || '',
    status: item.status === 'closed' ? 'closed' : 'open',
    createdAt: formatTime(item.createdAt)
  }
}

function dbMessage(error) {
  const msg = (error && (error.errMsg || error.message)) || ''
  if (/collection not exist|DATABASE_COLLECTION_NOT_EXIST|-502005/i.test(msg)) {
    return '数据库还没建好，请再试一次'
  }
  if (/permission|PERMISSION_DENIED|-502003/i.test(msg)) {
    return '数据库权限不足'
  }
  return '签到创建失败，请重试'
}

function isMissingCollection(error) {
  const msg = (error && (error.errMsg || error.message)) || ''
  return /collection not exist|DATABASE_COLLECTION_NOT_EXIST|-502005/i.test(msg)
}

async function createEvent(openid, event) {
  const title = cleanText(event.title, 30)
  if (!title) return fail('请填写签到名称')
  const note = cleanText(event.note, 40)
  const code = makeCode()
  const data = {
    code,
    title,
    note,
    ownerOpenid: openid,
    status: 'open',
    createdAt: db.serverDate()
  }
  try {
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
      createdAt: formatTime(new Date())
    }
  }
}

async function listMine(openid) {
  const res = await db.collection(EVENTS).where({ ownerOpenid: openid }).limit(30).get()
  const list = (res.data || [])
    .slice()
    .sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bt - at
    })
    .map(publicEvent)
  return { ok: true, events: list }
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

async function listRecords(openid, eventId) {
  const item = await getEvent(eventId)
  if (!item) return fail('找不到这个签到')
  if (item.ownerOpenid !== openid) return fail('只有发起人可以查看名单')
  const res = await db.collection(RECORDS).where({ eventId: item.code || item._id }).limit(MAX_EXPORT).get()
  const records = (res.data || [])
    .slice()
    .sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return at - bt
    })
    .map((row, index) => ({
      index: index + 1,
      name: row.name,
      time: formatTime(row.createdAt)
    }))
  return { ok: true, event: publicEvent(item), isOwner: true, records }
}

async function checkIn(openid, event) {
  const item = await getEvent(event.eventId)
  if (!item) return fail('二维码无效')
  if (item.status === 'closed') return fail('签到已结束')
  const name = cleanText(event.name, 20)
  if (!name) return fail('请填写姓名')
  const exist = await db.collection(RECORDS).where({ eventId: item._id, openid }).limit(1).get()
  if (exist.data && exist.data.length) {
    return { ok: false, duplicate: true, message: '你已经签过到了', event: publicEvent(item) }
  }
  await db.collection(RECORDS).add({
    data: {
      eventId: item.code || item._id,
      openid,
      name,
      createdAt: db.serverDate()
    }
  })
  return { ok: true, event: publicEvent(item), name }
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

async function exportExcel(openid, eventId) {
  const listed = await listRecords(openid, eventId)
  if (!listed.ok) return listed
  const rows = [['序号', '姓名', '签到时间', '签到名称']]
  const title = listed.event.title
  listed.records.forEach((row) => {
    rows.push([row.index, row.name, row.time, title])
  })
  if (rows.length === 1) rows.push(['', '暂无签到', '', title])
  const fileContent = buildXls(rows)
  const cloudPath = `checkin/${listed.event.id}-${Date.now()}.xls`
  const uploaded = await cloud.uploadFile({ cloudPath, fileContent })
  return { ok: true, fileID: uploaded.fileID, count: listed.records.length }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('请先登录微信后再试')
  const action = event && event.action
  try {
    if (action === 'createEvent') return await createEvent(OPENID, event)
    if (action === 'listMine') return await listMine(OPENID)
    if (action === 'readEvent') return await readEvent(OPENID, event.eventId)
    if (action === 'listRecords') return await listRecords(OPENID, event.eventId)
    if (action === 'checkIn') return await checkIn(OPENID, event)
    if (action === 'closeEvent') return await setStatus(OPENID, event.eventId, 'closed')
    if (action === 'openEvent') return await setStatus(OPENID, event.eventId, 'open')
    if (action === 'exportExcel') return await exportExcel(OPENID, event.eventId)
    return fail('未知操作')
  } catch (e) {
    return fail('云端暂时不可用，请稍后再试')
  }
}
