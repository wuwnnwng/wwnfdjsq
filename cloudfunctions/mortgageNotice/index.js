const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const REMINDS = 'mortgage_reminds'
const TEMPLATE_ID = 'B1PjfE9EqEsrXxuTov1BiA5zD1rV2KSKx0LKIm2a-cs'

function fail(message) {
  return { ok: false, message }
}

function clip(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max)
}

function clipThing(value) {
  const text = String(value || '').replace(/[\r\n\t]/g, '').trim()
  const clipped = Array.from(text).slice(0, 20).join('')
  return clipped || '今日是房贷还款日'
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

function formatSubscribeDate(now = Date.now()) {
  const shifted = new Date(now + 8 * 60 * 60 * 1000)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth() + 1
  const day = shifted.getUTCDate()
  const hour = String(shifted.getUTCHours()).padStart(2, '0')
  const minute = String(shifted.getUTCMinutes()).padStart(2, '0')
  return `${year}年${month}月${day}日 ${hour}:${minute}`
}

function todayKey() {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${shifted.getUTCFullYear()}-${month}-${day}`
}

function pageOf(value) {
  const page = String(value || '')
  if (page.length > 900) return ''
  if (page.indexOf('pages/result/result?w=n') !== 0 && page.indexOf('pages/result/result?w=r') !== 0) {
    return ''
  }
  if (page.indexOf('//') >= 0 || page.indexOf('..') >= 0) return ''
  return page
}

function planKeyOf(page) {
  let hash = 2166136261
  const text = String(page || '')
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (`00000000${(hash >>> 0).toString(16)}`).slice(-8)
}

function ensureCollection() {
  return db.createCollection(REMINDS).catch(() => {})
}

function itemOf(raw) {
  const month = Math.round(Number(raw && raw.month))
  const repayDate = clip(raw && raw.repayDate, 10)
  const payment = clip(raw && raw.payment, 16)
  if (!month || !/^\d{4}-\d{2}-\d{2}$/.test(repayDate)) return null
  return { month, repayDate, payment }
}

async function listPlan(openid, planKey) {
  const found = await db.collection(REMINDS).where({ openid, planKey }).limit(100).get()
  return (found && found.data) || []
}

async function ensureRemind(openid, event) {
  await ensureCollection()
  const page = pageOf(event && event.page)
  const item = itemOf(event && event.item)
  if (!page || !item) return fail('没有可提醒的还款日')
  const planKey = planKeyOf(page)
  const rows = await listPlan(openid, planKey)
  if (!rows.length) {
    await db.collection(REMINDS).add({
      data: {
        openid,
        planKey,
        page,
        month: item.month,
        repayDate: item.repayDate,
        payment: item.payment,
        state: stateOf(event && event.miniprogramState),
        sentDate: '',
        updatedAt: Date.now()
      }
    })
    return { ok: true, months: [item.month] }
  }
  return { ok: true, months: rows.map((row) => row.month) }
}

async function toggleRemind(openid, event) {
  await ensureCollection()
  const page = pageOf(event && event.page)
  const item = itemOf(event)
  if (!page || !item) return fail('没有可提醒的还款日')
  const planKey = planKeyOf(page)
  const found = await db.collection(REMINDS).where({ openid, planKey, month: item.month }).limit(1).get()
  const row = found.data && found.data[0]
  if (!event.on) {
    if (row) await db.collection(REMINDS).doc(row._id).remove()
    return { ok: true }
  }
  const data = {
    openid,
    planKey,
    page,
    month: item.month,
    repayDate: item.repayDate,
    payment: item.payment,
    state: stateOf(event && event.miniprogramState),
    sentDate: row && row.sentDate ? row.sentDate : '',
    updatedAt: Date.now()
  }
  if (row) await db.collection(REMINDS).doc(row._id).update({ data })
  else await db.collection(REMINDS).add({ data })
  return { ok: true }
}

async function purgePastReminds(today) {
  let removed = 0
  while (removed < 500) {
    const found = await db.collection(REMINDS).where({
      repayDate: _.lt(today)
    }).limit(100).get()
    const rows = (found && found.data) || []
    if (!rows.length) break
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      if (!row || !row._id) continue
      await db.collection(REMINDS).doc(row._id).remove()
      removed += 1
    }
    if (rows.length < 100) break
  }
  return removed
}

async function runDue() {
  await ensureCollection()
  const today = todayKey()
  const removed = await purgePastReminds(today)
  let skip = 0
  let sent = 0
  while (skip < 300) {
    const found = await db.collection(REMINDS).where({ repayDate: today }).skip(skip).limit(100).get()
    const rows = (found && found.data) || []
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      if (!row || !row.openid || !row.page || row.sentDate === today) continue
      const amount = row.payment ? `${row.payment}元` : ''
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: row.openid,
          templateId: TEMPLATE_ID,
          page: row.page,
          miniprogramState: stateOf(row.state),
          lang: 'zh_CN',
          data: {
            thing2: { value: clipThing(`第${row.month}期应还${amount}`) },
            date3: { value: formatSubscribeDate() }
          }
        })
        sent += 1
        await db.collection(REMINDS).doc(row._id).update({ data: { sentDate: today } })
      } catch (err) {
        console.error('mortgageNotice due', errorCodeOf(err), row.openid)
      }
    }
    if (rows.length < 100) break
    skip += rows.length
  }
  return { ok: true, sent, removed }
}

exports.main = async (event) => {
  if (event && (event.Type === 'Timer' || event.TriggerName === 'repayRemind')) {
    try {
      return await runDue()
    } catch (err) {
      console.error('mortgageNotice timer', err)
      return fail('还款提醒没有发出去')
    }
  }
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('请先登录微信后再试')
  const action = event && event.action
  try {
    if (action === 'ensure') return await ensureRemind(OPENID, event)
    if (action === 'toggle') return await toggleRemind(OPENID, event)
    return fail('未知操作')
  } catch (err) {
    console.error('mortgageNotice', err)
    return fail('还款提醒没有记下')
  }
}
