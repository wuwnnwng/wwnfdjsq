/**
 * 皮肤主题
 * forest 青绿（默认）/ ocean 商务蓝 / amber 琥珀金
 */

const STORAGE_KEY = 'app_theme_v1'
const DEFAULT_THEME = 'forest'

const THEMES = {
  forest: {
    id: 'forest',
    name: '青绿',
    navBar: '#0B3D2E',
    pageBg: '#F3F6F4',
    principal: '#1f6b52',
    interest: '#c45c26',
    dialog: '#f7f8f6',
    ink: '#14231c'
  },
  ocean: {
    id: 'ocean',
    name: '商务蓝',
    navBar: '#123A6B',
    pageBg: '#EEF3F9',
    principal: '#1F6FB5',
    interest: '#D97706',
    dialog: '#F5F8FC',
    ink: '#13233A'
  },
  amber: {
    id: 'amber',
    name: '琥珀金',
    navBar: '#7A4A12',
    pageBg: '#F7F2EA',
    principal: '#B7791F',
    interest: '#C05621',
    dialog: '#FBF7F0',
    ink: '#2B2116'
  }
}

const THEME_LIST = [
  { id: 'forest', name: '青绿' },
  { id: 'ocean', name: '商务蓝' },
  { id: 'amber', name: '琥珀金' }
]

function normalizeThemeId(id) {
  return THEMES[id] ? id : DEFAULT_THEME
}

function getThemeId() {
  try {
    return normalizeThemeId(wx.getStorageSync(STORAGE_KEY))
  } catch (e) {
    return DEFAULT_THEME
  }
}

function getTheme(id) {
  return THEMES[normalizeThemeId(id || getThemeId())]
}

function setThemeId(id) {
  const themeId = normalizeThemeId(id)
  try {
    wx.setStorageSync(STORAGE_KEY, themeId)
  } catch (e) {
    // ignore
  }

  const app = getApp()
  if (app) {
    app.globalData = app.globalData || {}
    app.globalData.theme = themeId
  }

  return themeId
}

function applyThemeChrome(themeId) {
  const theme = getTheme(themeId)
  wx.setNavigationBarColor({
    frontColor: '#ffffff',
    backgroundColor: theme.navBar,
    animation: {
      duration: 200,
      timingFunc: 'easeIn'
    }
  })
  if (wx.setBackgroundColor) {
    wx.setBackgroundColor({
      backgroundColor: theme.pageBg,
      backgroundColorTop: theme.pageBg,
      backgroundColorBottom: theme.pageBg
    })
  }
  return theme
}

module.exports = {
  DEFAULT_THEME,
  THEMES,
  THEME_LIST,
  getThemeId,
  getTheme,
  setThemeId,
  applyThemeChrome,
  normalizeThemeId
}
