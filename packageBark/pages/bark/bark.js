const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu } = require('../../../utils/share')
const { CALLS } = require('../../utils/barkSounds')

const PAGE_PATH = '/packageBark/pages/bark/bark'

Page({
  data: {
    theme: getThemeId(),
    calls: CALLS,
    playingId: '',
    playingName: ''
  },

  onLoad() {
    enableShareMenu()
    this._audio = null
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  onHide() {
    this.stopAudio()
  },

  onUnload() {
    this.stopAudio()
  },

  stopAudio(silent) {
    const audio = this._audio
    this._audio = null
    if (audio) {
      try {
        audio.stop()
      } catch (e) {}
      try {
        audio.destroy()
      } catch (e) {}
    }
    if (!silent && this.data.playingId) this.setData({ playingId: '', playingName: '' })
  },

  onPlay(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    if (this.data.playingId === id) {
      this.stopAudio()
      return
    }
    const item = CALLS.find((row) => row.id === id)
    if (!item) return
    this.stopAudio(true)
    const audio = wx.createInnerAudioContext()
    audio.src = item.src
    audio.loop = true
    audio.obeyMuteSwitch = false
    audio.onError(() => {
      if (this._audio !== audio) return
      this.stopAudio()
      wx.showToast({ title: '这台设备暂时播不了', icon: 'none' })
    })
    this._audio = audio
    audio.play()
    this.setData({ playingId: id, playingName: item.name })
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
  },

  onShareAppMessage() {
    return {
      title: '狗狗叫声｜小小便民工具箱',
      path: PAGE_PATH
    }
  },

  onShareTimeline() {
    return { title: '狗狗叫声｜小小便民工具箱' }
  }
})
