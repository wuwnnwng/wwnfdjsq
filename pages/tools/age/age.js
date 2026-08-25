const { todayYMD } = require('../../../utils/datetimeCalc')
const { calculateAge } = require('../../../utils/ageCalc')
const {
  solarToLunar,
  lunarToSolar,
  formatLunarYearDate,
  getLunarMonthOptions,
  getLunarDayOptions
} = require('../../../utils/lunar')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getAgeToolShare } = require('../../../utils/share')
const { createPickerTick } = require('../../../utils/pickerTick')

const LUNAR_YEAR_START = 1900
const LUNAR_YEAR_END = 2100

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatYMD(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function parseYMDParts(text) {
  const matched = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(text || '').trim())
  if (!matched) return null
  return {
    year: Number(matched[1]),
    month: Number(matched[2]),
    day: Number(matched[3])
  }
}

function defaultBirthday() {
  const now = new Date()
  const year = now.getFullYear() - 18
  const month = now.getMonth() + 1
  const day = Math.min(now.getDate(), new Date(year, month, 0).getDate())
  return formatYMD(year, month, day)
}

function lunarYears() {
  const years = []
  for (let year = LUNAR_YEAR_START; year <= LUNAR_YEAR_END; year += 1) {
    years.push(year)
  }
  return years
}

const PICKER_LUNAR_YEARS = lunarYears()

const CONFETTI_COLORS = ['#f472b6', '#fb7185', '#fbbf24', '#34d399', '#60a5fa', '#c084fc', '#fb923c', '#f9a8d4']
const CONFETTI_FLOWERS = ['🌸', '🌺', '🌼', '💮', '🌷', '🌹', '✨']

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function createConfettiPieces() {
  const pieces = []
  let id = 0
  for (let i = 0; i < 20; i += 1) {
    const size = Math.round(rand(28, 46))
    pieces.push({
      id: id++,
      mode: 'burst',
      fall: i % 8,
      kind: 'flower',
      left: 50,
      top: '44%',
      delay: Math.round(rand(0, 0.22) * 100) / 100,
      duration: Math.round(rand(1.35, 2.15) * 100) / 100,
      color: 'transparent',
      size,
      height: size,
      emoji: CONFETTI_FLOWERS[i % CONFETTI_FLOWERS.length]
    })
  }
  for (let i = 0; i < 36; i += 1) {
    const isFlower = i % 4 === 0
    const size = Math.round(isFlower ? rand(24, 40) : rand(10, 18))
    pieces.push({
      id: id++,
      mode: 'rain',
      fall: i % 3,
      kind: isFlower ? 'flower' : i % 2 === 0 ? 'rect' : 'dot',
      left: Math.round(rand(2, 98)),
      top: '-48rpx',
      delay: Math.round(rand(0, 1.5) * 100) / 100,
      duration: Math.round(rand(2.3, 4.1) * 100) / 100,
      color: isFlower ? 'transparent' : CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size,
      height: isFlower ? size : Math.round(size * (i % 2 === 0 ? 1.7 : 1)),
      emoji: isFlower ? CONFETTI_FLOWERS[i % CONFETTI_FLOWERS.length] : ''
    })
  }
  return pieces
}

function clampSolarToToday(parts, today) {
  if (!parts) return parseYMDParts(today)
  if (
    parts.year > today.year ||
    (parts.year === today.year && (parts.month > today.month || (parts.month === today.month && parts.day > today.day)))
  ) {
    return today
  }
  return parts
}

function buildLunarPickerState(solarParts) {
  const lunar = solarToLunar(solarParts.year, solarParts.month, solarParts.day)
  const year = Math.min(LUNAR_YEAR_END, Math.max(LUNAR_YEAR_START, lunar.lunarYear))
  const months = getLunarMonthOptions(year)
  let monthIndex = months.findIndex((item) => item.month === lunar.lunarMonth && !!item.isLeap === !!lunar.isLeap)
  if (monthIndex < 0) monthIndex = months.findIndex((item) => item.month === lunar.lunarMonth)
  if (monthIndex < 0) monthIndex = 0
  const month = months[monthIndex]
  const days = getLunarDayOptions(year, month.month, month.isLeap)
  const dayIndex = Math.min(days.length - 1, Math.max(0, (lunar.lunarDay || 1) - 1))
  return {
    lunarYears: PICKER_LUNAR_YEARS,
    lunarMonths: months,
    lunarDays: days,
    lunarPickerValue: [year - LUNAR_YEAR_START, monthIndex, dayIndex],
    lunarBirthdayText: formatLunarYearDate({
      lunarYear: year,
      lunarMonth: month.month,
      lunarDay: dayIndex + 1,
      isLeap: month.isLeap
    })
  }
}

Page({
  data: {
    theme: getThemeId(),
    today: todayYMD(),
    birthday: defaultBirthday(),
    asOf: todayYMD(),
    birthCalendar: 'solar',
    birthdayDisplay: '',
    lunarBirthdayText: '',
    showLunarPicker: false,
    lunarYears: PICKER_LUNAR_YEARS,
    lunarMonths: [],
    lunarDays: [],
    lunarPickerValue: [0, 0, 0],
    result: null,
    showLivedPopup: false,
    confettiPieces: []
  },

  onLoad() {
    enableShareMenu()
    this._pickerTick = createPickerTick()
    this.syncBirthdayDisplay()
    this.recalculate()
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme, today: todayYMD() })
    applyThemeChrome(theme)
  },

  todayParts() {
    const today = parseYMDParts(this.data.today || todayYMD())
    return today || parseYMDParts(todayYMD())
  },

  syncBirthdayDisplay() {
    const solar = parseYMDParts(this.data.birthday) || parseYMDParts(defaultBirthday())
    const lunarState = buildLunarPickerState(solar)
    this.setData({
      birthdayDisplay: `${solar.year}年${solar.month}月${solar.day}日`,
      lunarBirthdayText: lunarState.lunarBirthdayText
    })
  },

  onSwitchBirthCalendar(e) {
    const birthCalendar = e.currentTarget.dataset.cal
    if (!birthCalendar || birthCalendar === this.data.birthCalendar) return
    this.setData({ birthCalendar }, () => {
      this.syncBirthdayDisplay()
      this.recalculate()
    })
  },

  onBirthdayChange(e) {
    this.setData({ birthday: e.detail.value }, () => {
      this.syncBirthdayDisplay()
      this.recalculate({ celebrate: true })
    })
  },

  onAsOfChange(e) {
    this.setData({ asOf: e.detail.value }, () => this.recalculate({ celebrate: true }))
  },

  onOpenLunarPicker() {
    const solar = parseYMDParts(this.data.birthday) || parseYMDParts(defaultBirthday())
    const state = buildLunarPickerState(solar)
    this._pendingLunar = {
      year: PICKER_LUNAR_YEARS[state.lunarPickerValue[0]],
      monthIndex: state.lunarPickerValue[1],
      dayIndex: state.lunarPickerValue[2]
    }
    this._lunarPickerReady = false
    if (this._pickerTick) this._pickerTick.prepare()
    this.setData(
      {
        showLunarPicker: true,
        lunarMonths: state.lunarMonths,
        lunarDays: state.lunarDays,
        lunarPickerValue: state.lunarPickerValue
      },
      () => {
        setTimeout(() => {
          this._lunarPickerReady = true
        }, 180)
      }
    )
  },

  onLunarPickerChange(e) {
    const value = (e.detail && e.detail.value) || []
    const year = PICKER_LUNAR_YEARS[value[0]] || LUNAR_YEAR_START
    const currentMonths = this.data.lunarMonths && this.data.lunarMonths.length
      ? this.data.lunarMonths
      : getLunarMonthOptions(year)
    const nextMonths = getLunarMonthOptions(year)
    let monthIndex = Math.min(nextMonths.length - 1, Math.max(0, value[1] || 0))
    if (currentMonths[value[1]] && nextMonths.length === currentMonths.length) {
      monthIndex = value[1]
    } else if (currentMonths[value[1]]) {
      const prev = currentMonths[value[1]]
      const found = nextMonths.findIndex((item) => item.month === prev.month && !!item.isLeap === !!prev.isLeap)
      monthIndex = found >= 0 ? found : Math.min(monthIndex, nextMonths.length - 1)
    }
    const month = nextMonths[monthIndex]
    const nextDays = getLunarDayOptions(year, month.month, month.isLeap)
    const currentDays = this.data.lunarDays && this.data.lunarDays.length ? this.data.lunarDays : nextDays
    let dayIndex = Math.min(nextDays.length - 1, Math.max(0, value[2] || 0))
    const yearChanged = year !== (this.data.lunarYears[this.data.lunarPickerValue[0]] || 0)
    this._pendingLunar = { year, monthIndex, dayIndex }
    if (this._syncingLunarPicker) return
    if (this._lunarPickerReady && this._pickerTick) this._pickerTick.play()
    if (
      yearChanged ||
      nextMonths.length !== currentMonths.length ||
      nextDays.length !== currentDays.length
    ) {
      this._syncingLunarPicker = true
      this.setData(
        {
          lunarMonths: nextMonths,
          lunarDays: nextDays,
          lunarPickerValue: [year - LUNAR_YEAR_START, monthIndex, dayIndex]
        },
        () => {
          this._syncingLunarPicker = false
        }
      )
    }
  },

  onConfirmLunarPicker() {
    const pending = this._pendingLunar || {
      year: PICKER_LUNAR_YEARS[this.data.lunarPickerValue[0]],
      monthIndex: this.data.lunarPickerValue[1],
      dayIndex: this.data.lunarPickerValue[2]
    }
    const months = getLunarMonthOptions(pending.year)
    const month = months[Math.min(months.length - 1, Math.max(0, pending.monthIndex || 0))]
    if (!month) {
      this.setData({ showLunarPicker: false })
      return
    }
    const days = getLunarDayOptions(pending.year, month.month, month.isLeap)
    const day = Math.min(days.length, Math.max(1, (pending.dayIndex || 0) + 1))
    const solar = lunarToSolar(pending.year, month.month, day, month.isLeap)
    const today = this.todayParts()
    const clamped = clampSolarToToday(solar, today)
    this.setData(
      {
        birthday: formatYMD(clamped.year, clamped.month, clamped.day),
        showLunarPicker: false
      },
      () => {
        this.syncBirthdayDisplay()
        this.recalculate({ celebrate: true, delay: 180 })
      }
    )
  },

  onCancelLunarPicker() {
    this.setData({ showLunarPicker: false })
  },

  onLunarPickerSheetTap() {},

  onLivedDialogTap() {},

  onCloseLivedPopup() {
    this.setData({ showLivedPopup: false, confettiPieces: [] })
  },

  openLivedDaysPopup() {
    const result = this.data.result
    if (!result || !result.valid) return
    this.setData({
      showLivedPopup: true,
      confettiPieces: createConfettiPieces()
    })
  },

  preventMove() {},

  recalculate(options) {
    const result = calculateAge(this.data.birthday, this.data.asOf, {
      birthdayCalendar: this.data.birthCalendar
    })
    this.setData({ result }, () => {
      if (!options || !options.celebrate) return
      if (this._livedPopupTimer) {
        clearTimeout(this._livedPopupTimer)
        this._livedPopupTimer = null
      }
      const delay = Number(options.delay) || 0
      if (delay > 0) {
        this._livedPopupTimer = setTimeout(() => {
          this._livedPopupTimer = null
          this.openLivedDaysPopup()
        }, delay)
        return
      }
      this.openLivedDaysPopup()
    })
  },

  onShareAppMessage() {
    return getAgeToolShare().appMessage
  },

  onShareTimeline() {
    return getAgeToolShare().timeline
  },

  onUnload() {
    if (this._livedPopupTimer) {
      clearTimeout(this._livedPopupTimer)
      this._livedPopupTimer = null
    }
    if (this._pickerTick) {
      this._pickerTick.destroy()
      this._pickerTick = null
    }
  }
})
