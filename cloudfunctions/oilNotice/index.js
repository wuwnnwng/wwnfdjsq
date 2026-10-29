const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const SUBS = 'oil_subs'
const STATE = 'oil_notice_state'
const TEMPLATE_ID = 'B1PjfE9EqEsrXxuTov1BiA5zD1rV2KSKx0LKIm2a-cs'
const API_URL = 'https://v2.xxapi.cn/api/oilPrice'
const PAGE = 'packageTravel/pages/oilprice/oilprice'
const MAX_QUOTA = 20

function fail(message) {
  return { ok: false, message }
}

function stateOf(value) {
  if (value === 'developer' || value === 'trial' || value === 'formal') return value
  return 'formal'
}

function errorCodeOf(err) {
  const direct = err && (err.errCode || err.errcode)
  if (direct) return Number(direct)
  const msg = (err && (err.errMsg || err.message)) || ''
  const matched = String(msg).match(/-?\d{4,}/)
  return matched ? Number(matched[0]) : 0
}

function clipThing(value) {
  const text = String(value || '').replace(/[\r\n\t]/g, '').trim()
  const clipped = Array.from(text).slice(0, 20).join('')
  return clipped || '今日油价已调整'
}

function formatSubscribeDate(now = Date.now()) {
  const shifted = new Date(now + 8 * 60 * 60 * 1000)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth() + 1
  const day = shifted.getUTCDate()
  const hour = String(shifted.getUTCHours()).padStart(2, '0')
  const minute = String(shifted.getUTCMinutes()).padStart(2, '0')
  return `${year}年${month}月${day}日 ${hour}:${minute}`
}

function ensureCollection(name) {
  return db.createCollection(name).catch(() => {})
}

function fetchOil() {
  return new Promise((resolve, reject) => {
    const req = https.get(API_URL, { timeout: 8000 }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
        } catch (err) {
          reject(err)
        }
      })
    })
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout'))
    })
    req.on('error', reject)
  })
}

function oilRows(payload) {
  if (!payload || Number(payload.code) !== 200) return []
  if (Array.isArray(payload.data)) return payload.data
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data
  return []
}

function signatureOf(rows) {
  const parts = rows.map((row) => {
    const name = String(row.regionName || row.province || row.name || '').trim()
    if (!name) return ''
    return [name, row.n92, row.n95, row.n98, row.n0, String(row.date || '').slice(0, 10)].join(',')
  }).filter(Boolean).sort()
  return parts.join(';').slice(0, 4000)
}

function summaryOf(rows) {
  const row = rows.find((item) => String(item.regionName || item.province || '') === '北京') || rows[0]
  const change = Number(row && (row.n92Change != null ? row.n92Change : row.c92))
  if (Number.isFinite(change) && change !== 0) {
    const dir = change > 0 ? '上调' : '下调'
    return clipThing(`92号汽油${dir}${Math.abs(change).toFixed(2)}元`)
  }
  return '今日油价已调整'
}

async function subscribe(openid, event) {
  await ensureCollection(SUBS)
  const state = stateOf(event && event.miniprogramState)
  const found = await db.collection(SUBS).where({ openid }).limit(1).get()
  const row = found.data && found.data[0]
  if (row) {
    const quota = Math.min(MAX_QUOTA, Number(row.quota || 0) + 1)
    await db.collection(SUBS).doc(row._id).update({
      data: { quota, state, updatedAt: Date.now() }
    })
    return { ok: true, quota }
  }
  await db.collection(SUBS).add({
    data: { openid, quota: 1, state, updatedAt: Date.now() }
  })
  return { ok: true, quota: 1 }
}

async function listSubscribers() {
  const users = []
  let skip = 0
  while (users.length < 300) {
    const page = await db.collection(SUBS).where({ quota: _.gt(0) }).skip(skip).limit(100).get()
    const rows = (page && page.data) || []
    users.push(...rows)
    if (rows.length < 100) break
    skip += rows.length
  }
  return users
}

async function notifyAll(summary) {
  const users = await listSubscribers()
  const when = formatSubscribeDate()
  let sent = 0
  for (let i = 0; i < users.length; i += 1) {
    const user = users[i]
    if (!user || !user.openid || !user._id) continue
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: user.openid,
        templateId: TEMPLATE_ID,
        page: PAGE,
        miniprogramState: stateOf(user.state),
        lang: 'zh_CN',
        data: {
          thing2: { value: summary },
          date3: { value: when }
        }
      })
      sent += 1
      const quota = Math.max(0, Number(user.quota || 1) - 1)
      await db.collection(SUBS).doc(user._id).update({
        data: { quota, updatedAt: Date.now() }
      })
    } catch (err) {
      if (errorCodeOf(err) === 43101) {
        await db.collection(SUBS).doc(user._id).update({
          data: { quota: 0, updatedAt: Date.now() }
        }).catch(() => {})
      }
    }
  }
  return sent
}

async function checkOil() {
  await ensureCollection(STATE)
  await ensureCollection(SUBS)
  const payload = await fetchOil()
  const rows = oilRows(payload)
  const signature = signatureOf(rows)
  if (!signature) return fail('没有拿到油价')
  const found = await db.collection(STATE).where({ key: 'latest' }).limit(1).get()
  const prev = found.data && found.data[0]
  if (!prev) {
    await db.collection(STATE).add({
      data: { key: 'latest', signature, notifiedAt: 0, sent: 0, checking: 0 }
    })
    return { ok: true, skipped: true }
  }
  if (prev.signature === signature) return { ok: true, skipped: true }
  if (prev.checking && Date.now() - Number(prev.checking) < 60000) {
    return { ok: true, skipped: true }
  }
  await db.collection(STATE).doc(prev._id).update({ data: { checking: Date.now() } })
  const summary = summaryOf(rows)
  const sent = await notifyAll(summary)
  await db.collection(STATE).doc(prev._id).update({
    data: {
      signature,
      summary,
      sent,
      notifiedAt: Date.now(),
      checking: 0
    }
  })
  return { ok: true, sent }
}

exports.main = async (event) => {
  if (event && (event.Type === 'Timer' || event.TriggerName === 'oilCheck')) {
    try {
      return await checkOil()
    } catch (err) {
      console.error('oilNotice timer', err)
      return fail('油价检查失败')
    }
  }
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('请先登录微信后再试')
  const action = event && event.action
  try {
    if (action === 'subscribe') return await subscribe(OPENID, event)
    if (action === 'check') return await checkOil()
    return fail('未知操作')
  } catch (err) {
    console.error('oilNotice', err)
    return fail(action === 'subscribe' ? '提醒没有开启' : '油价检查失败')
  }
}
