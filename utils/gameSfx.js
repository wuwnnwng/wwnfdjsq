/**
 * 娱乐工具过程音：骰子碰撞、硬币翻转、转盘卡位。
 * 在用户点击时 prepare，后续播放才能出声。
 */

const SAMPLE_RATE = 22050

function writeStr(bytes, offset, text) {
  for (let i = 0; i < text.length; i += 1) {
    bytes[offset + i] = text.charCodeAt(i)
  }
}

function pcm8Wav(duration, sampleFn) {
  const n = Math.floor(SAMPLE_RATE * duration)
  const bytes = new Uint8Array(44 + n)
  const view = new DataView(bytes.buffer)
  writeStr(bytes, 0, 'RIFF')
  view.setUint32(4, 36 + n, true)
  writeStr(bytes, 8, 'WAVE')
  writeStr(bytes, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  writeStr(bytes, 36, 'data')
  view.setUint32(40, n, true)
  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE
    const sample = sampleFn(t, i)
    bytes[44 + i] = Math.max(0, Math.min(255, Math.round(128 + sample * 110)))
  }
  return bytes.buffer
}

function noise(i) {
  const x = Math.sin(i * 127.1) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

const BUILDERS = {
  diceTick: () =>
    pcm8Wav(0.055, (t, i) => {
      const env = Math.exp(-t * 78)
      const wood = Math.sin(2 * Math.PI * 540 * t) + Math.sin(2 * Math.PI * 880 * t) * 0.45
      return wood * 0.55 * env + noise(i) * 0.42 * env
    }),
  diceLand: () =>
    pcm8Wav(0.14, (t, i) => {
      const env = Math.exp(-t * 22)
      return (
        Math.sin(2 * Math.PI * 210 * t) * 0.7 * env +
        Math.sin(2 * Math.PI * 92 * t) * 0.45 * env +
        noise(i) * 0.22 * Math.exp(-t * 40)
      )
    }),
  coinSpin: () =>
    pcm8Wav(0.07, (t) => {
      const env = Math.exp(-t * 42)
      const freq = 2100 - t * 9000
      return Math.sin(2 * Math.PI * freq * t) * env * 0.72
    }),
  coinLand: () =>
    pcm8Wav(0.22, (t) => {
      const env = Math.exp(-t * 9)
      return (
        Math.sin(2 * Math.PI * 1760 * t) * 0.58 * env +
        Math.sin(2 * Math.PI * 2637 * t) * 0.32 * env
      )
    }),
  wheelTick: () =>
    pcm8Wav(0.032, (t) => {
      const env = Math.exp(-t * 95)
      return Math.sin(2 * Math.PI * 1680 * t) * env * 0.9
    }),
  wheelLand: () =>
    pcm8Wav(0.28, (t) => {
      const env = Math.exp(-t * 7)
      return (
        Math.sin(2 * Math.PI * 988 * t) * 0.55 * env +
        Math.sin(2 * Math.PI * 1480 * t) * 0.28 * env
      )
    })
}

function filePath(kind) {
  return `${wx.env.USER_DATA_PATH}/game_sfx_${kind}_v1.wav`
}

function ensureFile(kind) {
  const path = filePath(kind)
  try {
    wx.getFileSystemManager().accessSync(path)
    return path
  } catch (e) {
    // write below
  }
  try {
    wx.getFileSystemManager().writeFileSync(path, BUILDERS[kind]())
  } catch (err) {
    return ''
  }
  return path
}

function createInnerAudio(src, volume) {
  const audio = wx.createInnerAudioContext()
  audio.src = src
  audio.volume = volume
  audio.obeyMuteSwitch = false
  return audio
}

function bezierX(t, x1, x2) {
  return 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t
}

function bezierY(t, y1, y2) {
  return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t
}

function easeCubicBezier(x, x1, y1, x2, y2) {
  let lo = 0
  let hi = 1
  let t = x
  for (let i = 0; i < 10; i += 1) {
    const bx = bezierX(t, x1, x2)
    if (bx < x) lo = t
    else hi = t
    t = (lo + hi) / 2
  }
  return bezierY(t, y1, y2)
}

function wheelTickDelays(duration, deltaDeg, count) {
  const slice = 360 / Math.max(1, Number(count) || 1)
  const delta = Math.abs(Number(deltaDeg) || 0)
  const times = []
  let lastK = 0
  const steps = 96
  for (let i = 1; i <= steps; i += 1) {
    const u = i / steps
    const p = easeCubicBezier(u, 0.12, 0.7, 0.18, 1)
    const k = Math.floor((p * delta) / slice)
    if (k > lastK) {
      times.push(Math.round(u * duration))
      lastK = k
    }
  }
  if (!times.length) times.push(Math.round(duration * 0.08))
  return times
}

function createGameSfx() {
  const pools = {}
  const cursors = {}
  let webCtx = null
  let ready = false

  function prepareWeb() {
    if (webCtx || typeof wx.createWebAudioContext !== 'function') return
    try {
      webCtx = wx.createWebAudioContext()
      if (webCtx && typeof webCtx.resume === 'function') webCtx.resume()
    } catch (e) {
      webCtx = null
    }
  }

  function prepareInner(kind) {
    if (pools[kind] && pools[kind].length) return
    const src = ensureFile(kind)
    if (!src) return
    const volume = kind === 'wheelTick' ? 0.72 : 0.88
    pools[kind] = [createInnerAudio(src, volume), createInnerAudio(src, volume), createInnerAudio(src, volume)]
    cursors[kind] = 0
    const warmup = pools[kind][0]
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
    Object.keys(BUILDERS).forEach(prepareInner)
    ready = true
  }

  function playWeb(kind) {
    if (!webCtx) return false
    try {
      const t = webCtx.currentTime
      if (kind === 'diceTick') {
        const n = Math.floor(webCtx.sampleRate * 0.045)
        const buffer = webCtx.createBuffer(1, n, webCtx.sampleRate)
        const data = buffer.getChannelData(0)
        const pitch = 480 + Math.random() * 220
        for (let i = 0; i < n; i += 1) {
          const u = i / webCtx.sampleRate
          const env = Math.exp(-u * 78)
          data[i] = (Math.sin(2 * Math.PI * pitch * u) * 0.55 + (Math.random() * 2 - 1) * 0.4) * env
        }
        const src = webCtx.createBufferSource()
        const gain = webCtx.createGain()
        src.buffer = buffer
        gain.gain.setValueAtTime(0.9, t)
        src.connect(gain)
        gain.connect(webCtx.destination)
        src.start(t)
        return true
      }
      if (kind === 'diceLand') {
        const osc = webCtx.createOscillator()
        const gain = webCtx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(240, t)
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.12)
        gain.gain.setValueAtTime(0.22, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
        osc.connect(gain)
        gain.connect(webCtx.destination)
        osc.start(t)
        osc.stop(t + 0.15)
        return true
      }
      if (kind === 'coinSpin') {
        const osc = webCtx.createOscillator()
        const gain = webCtx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(2200, t)
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.055)
        gain.gain.setValueAtTime(0.14, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
        osc.connect(gain)
        gain.connect(webCtx.destination)
        osc.start(t)
        osc.stop(t + 0.065)
        return true
      }
      if (kind === 'coinLand') {
        ;[1760, 2637].forEach((freq, i) => {
          const osc = webCtx.createOscillator()
          const gain = webCtx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, t)
          gain.gain.setValueAtTime(i ? 0.08 : 0.16, t)
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
          osc.connect(gain)
          gain.connect(webCtx.destination)
          osc.start(t)
          osc.stop(t + 0.24)
        })
        return true
      }
      if (kind === 'wheelTick') {
        const osc = webCtx.createOscillator()
        const gain = webCtx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(1750, t)
        osc.frequency.exponentialRampToValueAtTime(780, t + 0.022)
        gain.gain.setValueAtTime(0.15, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
        osc.connect(gain)
        gain.connect(webCtx.destination)
        osc.start(t)
        osc.stop(t + 0.045)
        return true
      }
      if (kind === 'wheelLand') {
        const osc = webCtx.createOscillator()
        const gain = webCtx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(988, t)
        gain.gain.setValueAtTime(0.18, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26)
        osc.connect(gain)
        gain.connect(webCtx.destination)
        osc.start(t)
        osc.stop(t + 0.28)
        return true
      }
      return false
    } catch (e) {
      return false
    }
  }

  function playInner(kind) {
    const pool = pools[kind]
    if (!pool || !pool.length) return false
    const audio = pool[(cursors[kind] || 0) % pool.length]
    cursors[kind] = (cursors[kind] || 0) + 1
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

  function play(kind) {
    if (!BUILDERS[kind]) return
    if (!ready) prepare()
    if (playInner(kind)) return
    if (playWeb(kind)) return
  }

  function destroy() {
    Object.keys(pools).forEach((kind) => {
      ;(pools[kind] || []).forEach((audio) => {
        try {
          audio.stop()
          audio.destroy()
        } catch (e) {
          // ignore
        }
      })
      pools[kind] = []
    })
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
  createGameSfx,
  wheelTickDelays
}
