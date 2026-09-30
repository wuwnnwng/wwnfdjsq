function createClickSfx() {
  let ctx = null

  function ensure() {
    if (ctx || typeof wx.createWebAudioContext !== 'function') return ctx
    try {
      ctx = wx.createWebAudioContext()
      if (ctx && typeof ctx.resume === 'function') ctx.resume()
    } catch (e) {
      ctx = null
    }
    return ctx
  }

  function play() {
    const audio = ensure()
    if (!audio) return false
    try {
      const t = audio.currentTime
      const click = audio.createOscillator()
      const gain = audio.createGain()
      click.type = 'triangle'
      click.frequency.setValueAtTime(1680, t)
      click.frequency.exponentialRampToValueAtTime(520, t + 0.028)
      gain.gain.setValueAtTime(0.28, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
      click.connect(gain)
      gain.connect(audio.destination)
      click.start(t)
      click.stop(t + 0.045)

      const tap = audio.createOscillator()
      const tapGain = audio.createGain()
      tap.type = 'square'
      tap.frequency.setValueAtTime(740, t + 0.032)
      tapGain.gain.setValueAtTime(0.08, t + 0.032)
      tapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
      tap.connect(tapGain)
      tapGain.connect(audio.destination)
      tap.start(t + 0.032)
      tap.stop(t + 0.075)
      return true
    } catch (e) {
      return false
    }
  }

  function destroy() {
    if (!ctx) return
    try {
      ctx.close()
    } catch (e) {}
    ctx = null
  }

  return { play, destroy }
}

module.exports = {
  createClickSfx
}
