/**
 * 日期滚轮拨动音（短促咔嗒声）
 * 必须在用户点击打开选择器时 prepare，后续滚动才能出声。
 */

function buildTickWav() {
  const sampleRate = 22050
  const n = Math.floor(sampleRate * 0.03)
  const bytes = new Uint8Array(44 + n)
  const view = new DataView(bytes.buffer)

  function writeStr(offset, text) {
    for (let i = 0; i < text.length; i += 1) {
      bytes[offset + i] = text.charCodeAt(i)
    }
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + n, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  writeStr(36, 'data')
  view.setUint32(40, n, true)

  for (let i = 0; i < n; i += 1) {
    const t = i / sampleRate
    const env = Math.exp(-t * 95)
    const sample = Math.sin(2 * Math.PI * 1680 * t) * env
    bytes[44 + i] = Math.max(0, Math.min(255, Math.round(128 + sample * 96)))
  }
  return bytes.buffer
}

function tickFilePath() {
  return `${wx.env.USER_DATA_PATH}/picker_tick.wav`
}

function ensureTickFile() {
  const path = tickFilePath()
  try {
    wx.getFileSystemManager().accessSync(path)
    return path
  } catch (e) {
    // create below
  }
  try {
    wx.getFileSystemManager().writeFileSync(path, buildTickWav())
  } catch (e) {
    return ''
  }
  return path
}

function createInnerAudio(src) {
  const audio = wx.createInnerAudioContext()
  audio.src = src
  audio.volume = 0.85
  audio.obeyMuteSwitch = false
  return audio
}

function createPickerTick() {
  let pool = []
  let cursor = 0
  let lastAt = 0
  let webCtx = null
  let ready = false

  function prepareWeb() {
    if (webCtx || typeof wx.createWebAudioContext !== 'function') return
    try {
      webCtx = wx.createWebAudioContext()
      if (webCtx && typeof webCtx.resume === 'function') {
        webCtx.resume()
      }
    } catch (e) {
      webCtx = null
    }
  }

  function prepareInner() {
    if (pool.length) return
    const src = ensureTickFile()
    if (!src) return
    pool = [createInnerAudio(src), createInnerAudio(src), createInnerAudio(src)]
    const warmup = pool[0]
    const prev = warmup.volume
    warmup.volume = 0
    warmup.play()
    setTimeout(() => {
      try {
        warmup.stop()
        warmup.volume = prev
      } catch (err) {
        // ignore
      }
    }, 30)
  }

  function prepare() {
    prepareWeb()
    prepareInner()
    ready = true
  }

  function playWeb() {
    if (!webCtx) return false
    try {
      const t = webCtx.currentTime
      const osc = webCtx.createOscillator()
      const gain = webCtx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(1750, t)
      osc.frequency.exponentialRampToValueAtTime(780, t + 0.022)
      gain.gain.setValueAtTime(0.16, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
      osc.connect(gain)
      gain.connect(webCtx.destination)
      osc.start(t)
      osc.stop(t + 0.045)
      return true
    } catch (e) {
      return false
    }
  }

  function playInner() {
    const audio = pool[cursor % pool.length]
    cursor += 1
    if (!audio) return false
    try {
      audio.stop()
      audio.seek(0)
      audio.play()
      return true
    } catch (e) {
      return false
    }
  }

  function play() {
    if (!ready) prepare()
    const now = Date.now()
    if (now - lastAt < 24) return
    lastAt = now
    if (playInner()) return
    if (playWeb()) return
    try {
      wx.vibrateShort({ type: 'light' })
    } catch (e) {
      // ignore
    }
  }

  function destroy() {
    pool.forEach((audio) => {
      try {
        audio.stop()
        audio.destroy()
      } catch (e) {
        // ignore
      }
    })
    pool = []
    if (webCtx && typeof webCtx.close === 'function') {
      try {
        webCtx.close()
      } catch (e) {
        // ignore
      }
    }
    webCtx = null
    ready = false
  }

  return { prepare, play, destroy }
}

module.exports = {
  createPickerTick
}
