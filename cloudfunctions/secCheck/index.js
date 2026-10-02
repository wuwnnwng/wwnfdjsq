const path = require('path')
const Module = require('module')
process.env.NODE_PATH = path.join(__dirname, 'vendor')
Module._initPaths()

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const RISKY = 87014

function codeOf(err) {
  if (!err) return 0
  return err.errCode || err.errcode || 0
}

async function checkImage(fileID) {
  const file = await cloud.downloadFile({ fileID })
  const value = file && file.fileContent
  if (!value) return { ok: false, risky: false }
  try {
    const res = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/jpeg',
        value
      }
    })
    const errcode = codeOf(res)
    return { ok: true, risky: errcode === RISKY, errcode }
  } catch (err) {
    const errcode = codeOf(err)
    if (errcode === RISKY) return { ok: true, risky: true, errcode }
    return { ok: false, risky: false, errcode }
  }
}

async function checkText(content) {
  const text = String(content || '').trim()
  if (!text) return { ok: true, risky: false }
  const openid = cloud.getWXContext().OPENID
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      openid,
      scene: 1,
      version: 2,
      content: text.slice(0, 2500)
    })
    const suggest = res && res.result && res.result.suggest
    return { ok: true, risky: suggest === 'risky', errcode: codeOf(res) }
  } catch (err) {
    const errcode = codeOf(err)
    if (errcode === RISKY) return { ok: true, risky: true, errcode }
    return { ok: false, risky: false, errcode }
  }
}

exports.main = async (event) => {
  const payload = event || {}
  if (payload.type === 'text') return checkText(payload.content)
  if (!payload.fileID) return { ok: false, risky: false }
  return checkImage(payload.fileID)
}
