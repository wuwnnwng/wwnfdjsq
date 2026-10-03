const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const USERS = 'user_points'
const INVITES = 'point_invites'
const NOTICES = 'notices'
const ADMIN_OPENID = 'opl734khWEfxThguUoCc5XfpRRgY'
const CHECKIN_POINTS = 5
const TIMELINE_POINTS = 5
const INVITE_POINTS = 15
const REDEEM_COST = 100
const REDEEM_MS = 15 * 24 * 60 * 60 * 1000
const RISKY_TEXT = '所发布内容含违规信息'
const RISKY_CODE = 87014

function errCodeOf(err) {
  if (!err) return 0
  return err.errCode || err.errcode || 0
}

async function checkPublishText(openid, content) {
  const text = String(content || '').trim()
  if (!text) return { ok: true }
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      openid,
      scene: 1,
      version: 2,
      content: text.slice(0, 2500)
    })
    const suggest = res && res.result && res.result.suggest
    if (suggest === 'risky' || suggest === 'review' || errCodeOf(res) === RISKY_CODE) {
      return { ok: false, message: RISKY_TEXT }
    }
    return { ok: true }
  } catch (err) {
    if (errCodeOf(err) === RISKY_CODE) return { ok: false, message: RISKY_TEXT }
    return { ok: false, message: '没有保存成功' }
  }
}

async function checkPublishImage(buffer) {
  try {
    const res = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/jpeg',
        value: buffer
      }
    })
    if (errCodeOf(res) === RISKY_CODE) return { ok: false, message: RISKY_TEXT }
    return { ok: true }
  } catch (err) {
    if (errCodeOf(err) === RISKY_CODE) return { ok: false, message: RISKY_TEXT }
    return { ok: false, message: '没有保存成功' }
  }
}

function todayKey() {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${shifted.getUTCFullYear()}-${month}-${day}`
}

function newSession() {
  return crypto.randomBytes(16).toString('hex')
}

function signedIn(doc, event) {
  const session = event && event.session
  return !!(doc && doc.session && session && doc.session === session)
}

function viewOf(doc, openid, loggedIn) {
  const nick = (doc && doc.nick) || ''
  const avatar = (doc && doc.avatar) || ''
  if (!loggedIn) {
    return {
      ok: true,
      loggedIn: false,
      openid: '',
      session: '',
      points: 0,
      adFreeUntil: 0,
      checked: false,
      timelineDone: false,
      nick,
      avatar,
      admin: false
    }
  }
  const day = todayKey()
  return {
    ok: true,
    loggedIn: true,
    openid,
    session: doc.session || '',
    points: doc.points || 0,
    adFreeUntil: doc.adFreeUntil || 0,
    checked: doc.checkinDate === day,
    timelineDone: doc.timelineDate === day,
    nick,
    avatar,
    admin: !!doc.admin
  }
}

async function presentView(view) {
  const avatar = view && view.avatar
  if (!avatar || String(avatar).indexOf('cloud://') !== 0) return view
  try {
    const res = await cloud.getTempFileURL({ fileList: [avatar] })
    const file = res && res.fileList && res.fileList[0]
    if (file && file.tempFileURL) view.avatarUrl = file.tempFileURL
  } catch (err) {}
  return view
}

function isAdmin(openid) {
  return openid === ADMIN_OPENID
}

function noticeItem(item) {
  return {
    id: item._id,
    title: item.title || '',
    body: item.body || '',
    published: !!item.published,
    updatedAt: item.updatedAt || 0
  }
}

const readyCollections = {}
const ENV_ID = 'cloud1-d1gbvmd3eca12dcdc'

function collectionMissing(err) {
  const text = errText(err)
  return text.indexOf('-502005') >= 0 || /not exist/i.test(text) || /ResourceNotFound/i.test(text)
}

function errText(err) {
  if (!err) return ''
  if (typeof err === 'string') return err
  return String(err.errMsg || err.message || err.Message || '')
}

function alreadyThere(err) {
  const text = errText(err)
  if (/not exist/i.test(text) || text.indexOf('-502005') >= 0) return false
  return /exist/i.test(text) || /已存在/.test(text)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function sha256(message) {
  return crypto.createHash('sha256').update(message).digest('hex')
}

function hmac(key, message) {
  return crypto.createHmac('sha256', key).update(message).digest()
}

function tc3Request(action, payload, region) {
  const secretId = process.env.TENCENTCLOUD_SECRETID
  const secretKey = process.env.TENCENTCLOUD_SECRETKEY
  const token = process.env.TENCENTCLOUD_SESSIONTOKEN
  if (!secretId || !secretKey) return Promise.reject(new Error('缺少云函数密钥'))
  const host = 'tcb.tencentcloudapi.com'
  const service = 'tcb'
  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
  const body = JSON.stringify(payload)
  const canonicalHeaders = 'content-type:application/json; charset=utf-8\nhost:' + host + '\nx-tc-action:' + action.toLowerCase() + '\n'
  const signedHeaders = 'content-type;host;x-tc-action'
  const canonicalRequest = 'POST\n/\n\n' + canonicalHeaders + signedHeaders + '\n' + sha256(body)
  const credentialScope = date + '/' + service + '/tc3_request'
  const stringToSign = 'TC3-HMAC-SHA256\n' + timestamp + '\n' + credentialScope + '\n' + sha256(canonicalRequest)
  const secretDate = hmac('TC3' + secretKey, date)
  const secretService = hmac(secretDate, service)
  const secretSigning = hmac(secretService, 'tc3_request')
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex')
  const headers = {
    Authorization: 'TC3-HMAC-SHA256 Credential=' + secretId + '/' + credentialScope + ', SignedHeaders=' + signedHeaders + ', Signature=' + signature,
    'Content-Type': 'application/json; charset=utf-8',
    Host: host,
    'X-TC-Action': action,
    'X-TC-Version': '2018-06-08',
    'X-TC-Timestamp': String(timestamp),
    'X-TC-Region': region
  }
  if (token) headers['X-TC-Token'] = token
  return new Promise((resolve, reject) => {
    const req = require('https').request({ host, method: 'POST', path: '/', headers }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        try {
          resolve(JSON.parse(raw))
        } catch (err) {
          reject(new Error(raw.slice(0, 300)))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(8000, () => req.destroy(new Error('创建数据表超时')))
    req.write(body)
    req.end()
  })
}

async function createDocumentTable(name) {
  const envId = process.env.TCB_ENV || process.env.SCF_NAMESPACE || ENV_ID
  const preferred = process.env.TENCENTCLOUD_REGION || process.env.TCB_REGION || 'ap-shanghai'
  const regions = []
  ;[preferred, 'ap-shanghai', 'ap-guangzhou', 'ap-beijing'].forEach((region) => {
    if (regions.indexOf(region) < 0) regions.push(region)
  })
  let last = ''
  for (let i = 0; i < regions.length; i++) {
    const parsed = await tc3Request('CreateTable', { TableName: name, EnvId: envId }, regions[i])
    const err = parsed && parsed.Response && parsed.Response.Error
    if (!err) return
    const text = (err.Code || '') + ' ' + (err.Message || '')
    if (alreadyThere(text)) return
    last = text
    if (!/Region|地域/i.test(text)) break
  }
  throw new Error(last || '创建数据表失败')
}

async function collectionReady(name) {
  await db.collection(name).limit(1).get()
  readyCollections[name] = true
}

async function ensureCollection(name) {
  if (readyCollections[name]) return
  let createError = ''
  try {
    await db.createCollection(name)
  } catch (err) {
    if (!alreadyThere(err)) createError = errText(err)
  }
  try {
    await collectionReady(name)
    return
  } catch (err) {
    if (!collectionMissing(err)) throw err
  }
  try {
    await createDocumentTable(name)
  } catch (err) {
    createError = createError ? createError + '；' + errText(err) : errText(err)
  }
  for (let i = 0; i < 8; i++) {
    try {
      await collectionReady(name)
      return
    } catch (err) {
      if (!collectionMissing(err)) throw err
      await sleep(400)
    }
  }
  throw new Error('数据表 ' + name + ' 还没建好。' + (createError || '请到云开发控制台的数据库里新建这个集合'))
}

async function noticeRows() {
  try {
    const found = await db.collection(NOTICES).limit(50).get()
    return (found.data || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  } catch (err) {
    return []
  }
}

async function loadUser(openid) {
  await ensureCollection(USERS)
  const found = await db.collection(USERS).where({ openid }).limit(1).get()
  if (found.data && found.data[0]) {
    const doc = found.data[0]
    if (!doc.createdAt) {
      doc.createdAt = Date.now()
      await db.collection(USERS).doc(doc._id).update({ data: { createdAt: doc.createdAt } })
    }
    return doc
  }
  const created = await db.collection(USERS).add({
    data: {
      openid,
      points: 0,
      adFreeUntil: 0,
      checkinDate: '',
      timelineDate: '',
      session: '',
      redeemCount: 0,
      createdAt: Date.now()
    }
  })
  return {
    _id: created._id,
    openid,
    points: 0,
    adFreeUntil: 0,
    checkinDate: '',
    timelineDate: '',
    session: '',
    redeemCount: 0,
    createdAt: Date.now()
  }
}

async function addPoints(doc, extra) {
  await db.collection(USERS).doc(doc._id).update({
    data: Object.assign({ points: _.inc(extra.points || 0) }, extra.patch || {})
  })
  const next = await db.collection(USERS).doc(doc._id).get()
  return next.data
}

exports.main = async (event) => {
  try {
    return await handle(event)
  } catch (err) {
    return { ok: false, message: (err && (err.message || err.errMsg)) || '登录失败' }
  }
}

async function handle(event) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return { ok: false, message: '没有拿到用户身份' }
  const action = (event && event.action) || 'sync'
  const payload = event || {}
  await ensureCollection(INVITES)
  await ensureCollection(NOTICES)
  const doc = await loadUser(openid)
  const active = signedIn(doc, payload)
  doc.admin = isAdmin(openid)

  if (action === 'login') {
    const session = newSession()
    await db.collection(USERS).doc(doc._id).update({ data: { session } })
    doc.session = session
    return presentView(viewOf(doc, openid, true))
  }

  if (action === 'logout') {
    await db.collection(USERS).doc(doc._id).update({ data: { session: '' } })
    doc.session = ''
    return presentView(viewOf(doc, openid, false))
  }

  if (action === 'sync') return presentView(viewOf(doc, openid, active))

  if (action === 'notices') {
    const rows = await noticeRows()
    const canManage = active && doc.admin
    return {
      ok: true,
      list: rows.filter((item) => item.published).map(noticeItem),
      canManage
    }
  }

  if (action === 'noticeManage') {
    if (!active) return { ok: false, message: '请先登录' }
    if (!doc.admin) return { ok: false, message: '没有管理权限' }
    return { ok: true, list: (await noticeRows()).map(noticeItem) }
  }

  if (action === 'noticeSave') {
    if (!active || !doc.admin) return { ok: false, message: '没有管理权限' }
    const title = String(payload.title || '').trim().slice(0, 40)
    const body = String(payload.body || '').trim().slice(0, 1000)
    if (!title || !body) return { ok: false, message: '请填写标题和内容' }
    const data = { title, body, published: !!payload.published, updatedAt: Date.now() }
    if (payload.id) await db.collection(NOTICES).doc(payload.id).update({ data })
    else await db.collection(NOTICES).add({ data })
    return { ok: true, list: (await noticeRows()).map(noticeItem) }
  }

  if (action === 'noticeRemove') {
    if (!active || !doc.admin) return { ok: false, message: '没有管理权限' }
    if (!payload.id) return { ok: false, message: '没有这条通知' }
    await db.collection(NOTICES).doc(payload.id).remove()
    return { ok: true, list: (await noticeRows()).map(noticeItem) }
  }

  if (action === 'invite') {
    const inviter = String(payload.inviter || '').trim()
    if (!inviter || inviter === openid) return viewOf(doc, openid, active)
    const owner = await loadUser(inviter)
    const existed = await db.collection(INVITES).where({ inviter, friend: openid }).limit(1).get()
    if (existed.data && existed.data.length) return viewOf(doc, openid, active)
    await db.collection(INVITES).add({
      data: { inviter, friend: openid, createdAt: Date.now() }
    })
    await addPoints(owner, { points: INVITE_POINTS })
    return viewOf(doc, openid, active)
  }

  if (!active) return { ok: false, message: '请先登录' }

  if (action === 'users') {
    if (!doc.admin) return { ok: false, message: '没有管理权限' }
    const page = Math.max(1, parseInt(payload.page, 10) || 1)
    const size = 20
    const skip = (page - 1) * size
    const counted = await db.collection(USERS).count()
    const total = (counted && counted.total) || 0
    const found = await db.collection(USERS).skip(skip).limit(size).get()
    const list = (found.data || []).map((item) => ({
      id: item._id,
      nick: item.nick || '',
      points: item.points || 0,
      redeemCount: item.redeemCount || 0,
      online: !!item.session,
      createdAt: item.createdAt || 0
    }))
    return { ok: true, list, page, size, total, hasMore: skip + list.length < total }
  }

  if (action === 'avatar') {
    const image = String(payload.image || '')
    if (!image || image.length > 1800000) return { ok: false, message: '图片太大' }
    const buffer = Buffer.from(image, 'base64')
    const imageCheck = await checkPublishImage(buffer)
    if (!imageCheck.ok) return { ok: false, message: imageCheck.message }
    const nick = typeof payload.nick === 'string' ? String(payload.nick).trim().slice(0, 32) : ''
    const textCheck = await checkPublishText(openid, nick)
    if (!textCheck.ok) return { ok: false, message: textCheck.message }
    const uploaded = await cloud.uploadFile({
      cloudPath: `avatars/${openid}-${Date.now()}.jpg`,
      fileContent: Buffer.from(image, 'base64')
    })
    const fileID = uploaded && uploaded.fileID
    if (!fileID) return { ok: false, message: '头像没有上传成功' }
    if (doc.avatar && String(doc.avatar).indexOf('cloud://') === 0) {
      try {
        await cloud.deleteFile({ fileList: [doc.avatar] })
      } catch (err) {}
    }
    const patch = { avatar: fileID }
    if (nick) patch.nick = nick
    await db.collection(USERS).doc(doc._id).update({ data: patch })
    const next = await db.collection(USERS).doc(doc._id).get()
    next.data.admin = doc.admin
    next.data.session = doc.session
    return presentView(viewOf(next.data, openid, true))
  }

  if (action === 'profile') {
    const patch = {}
    if (payload.clear) {
      patch.nick = ''
      patch.avatar = ''
    } else {
      if (typeof payload.nick === 'string' && String(payload.nick).trim()) {
        const nick = String(payload.nick).trim().slice(0, 32)
        const textCheck = await checkPublishText(openid, nick)
        if (!textCheck.ok) return { ok: false, message: textCheck.message }
        patch.nick = nick
      }
      if (typeof payload.avatar === 'string' && payload.avatar.indexOf('http') !== 0) {
        patch.avatar = String(payload.avatar).slice(0, 300)
      }
    }
    if (Object.keys(patch).length) {
      await db.collection(USERS).doc(doc._id).update({ data: patch })
    }
    const next = await db.collection(USERS).doc(doc._id).get()
    next.data.admin = doc.admin
    next.data.session = doc.session
    return presentView(viewOf(next.data, openid, true))
  }

  if (action === 'checkin') {
    if (doc.checkinDate === todayKey()) return Object.assign(viewOf(doc, openid, true), { message: '今天已经签到' })
    const next = await addPoints(doc, { points: CHECKIN_POINTS, patch: { checkinDate: todayKey() } })
    next.admin = doc.admin
    next.session = doc.session
    return Object.assign(viewOf(next, openid, true), { message: `签到成功，+${CHECKIN_POINTS}积分` })
  }

  if (action === 'timeline') {
    if (doc.timelineDate === todayKey()) return Object.assign(viewOf(doc, openid, true), { message: '今天的朋友圈积分已领取' })
    const next = await addPoints(doc, { points: TIMELINE_POINTS, patch: { timelineDate: todayKey() } })
    next.admin = doc.admin
    next.session = doc.session
    return Object.assign(viewOf(next, openid, true), { message: `已获得${TIMELINE_POINTS}积分` })
  }

  if (action === 'redeem') {
    if ((doc.points || 0) < REDEEM_COST) {
      return Object.assign(viewOf(doc, openid, true), { message: '积分还不够' })
    }
    const base = Math.max(Date.now(), doc.adFreeUntil || 0)
    const next = await addPoints(doc, {
      points: -REDEEM_COST,
      patch: { adFreeUntil: base + REDEEM_MS, redeemCount: _.inc(1) }
    })
    next.admin = doc.admin
    next.session = doc.session
    return Object.assign(viewOf(next, openid, true), { message: '已兑换15天免广告' })
  }

  return { ok: false, message: '不支持的操作' }
}
