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
const { createConfettiPieces } = require('../../../utils/confetti')
const { saveResultCard, handleSaveError, drawAgeCard } = require('../../../utils/resultCard')

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
const SOLAR_YEAR_START = 1900
const SOLAR_YEAR_END = 2100

function compareYMD(a, b) {
  if (!a) return -1
  if (!b) return 1
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function clampYMD(parts, minParts, maxParts) {
  let year = Number(parts && parts.year)
  let month = Number(parts && parts.month)
  let day = Number(parts && parts.day)
  if (!year || !month || !day) {
    return { year: minParts.year, month: minParts.month, day: minParts.day }
  }
  month = Math.min(12, Math.max(1, month))
  day = Math.min(daysInMonth(year, month), Math.max(1, day))
  const next = { year, month, day }
  if (compareYMD(next, minParts) < 0) return { year: minParts.year, month: minParts.month, day: minParts.day }
  if (compareYMD(next, maxParts) > 0) return { year: maxParts.year, month: maxParts.month, day: maxParts.day }
  return next
}

function buildSolarYears(minParts, maxParts) {
  const years = []
  for (let year = minParts.year; year <= maxParts.year; year += 1) {
    years.push(year)
  }
  return years
}

function buildSolarMonths(year, minParts, maxParts) {
  let start = 1
  let end = 12
  if (year <= minParts.year) start = minParts.month
  if (year >= maxParts.year) end = maxParts.month
  if (start > end) start = end
  const months = []
  for (let month = start; month <= end; month += 1) {
    months.push(month)
  }
  return months
}

function buildSolarDays(year, month, minParts, maxParts) {
  let start = 1
  let end = daysInMonth(year, month)
  if (year === minParts.year && month === minParts.month) start = minParts.day
  if (year === maxParts.year && month === maxParts.month) end = Math.min(end, maxParts.day)
  if (start > end) start = end
  const days = []
  for (let day = start; day <= end; day += 1) {
    days.push(day)
  }
  return days
}

function indexOrLast(list, value) {
  const index = list.indexOf(value)
  if (index >= 0) return index
  return Math.max(0, list.length - 1)
}

function solarPickerValue(parts, years, months, days) {
  return [indexOrLast(years, parts.year), indexOrLast(months, parts.month), indexOrLast(days, parts.day)]
}

function formatDisplayYMD(parts) {
  if (!parts) return ''
  return `${parts.year}年${parts.month}月${parts.day}日`
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
    asOfDisplay: '',
    lunarBirthdayText: '',
    showLunarPicker: false,
    showSolarPicker: false,
    solarPickerTitle: '选择日期',
    solarYears: [],
    solarMonths: [],
    solarDays: [],
    solarPickerValue: [0, 0, 0],
    lunarYears: PICKER_LUNAR_YEARS,
    lunarMonths: [],
    lunarDays: [],
    lunarPickerValue: [0, 0, 0],
    result: null,
    showLivedPopup: false,
    confettiPieces: [],
    savingCard: false
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
    const asOf = parseYMDParts(this.data.asOf) || this.todayParts()
    const lunarState = buildLunarPickerState(solar)
    this.setData({
      birthdayDisplay: formatDisplayYMD(solar),
      asOfDisplay: formatDisplayYMD(asOf),
      lunarBirthdayText: lunarState.lunarBirthdayText
    })
  },

  solarPickerBounds(target) {
    const today = this.todayParts()
    const minBirthday = { year: SOLAR_YEAR_START, month: 1, day: 1 }
    const maxAsOf = { year: SOLAR_YEAR_END, month: 12, day: 31 }
    if (target === 'asOf') {
      const birthday = parseYMDParts(this.data.birthday) || minBirthday
      return { min: birthday, max: maxAsOf }
    }
    return { min: minBirthday, max: today }
  },

  openSolarPicker(target) {
    const bounds = this.solarPickerBounds(target)
    const current =
      parseYMDParts(target === 'asOf' ? this.data.asOf : this.data.birthday) || bounds.max
    const picked = clampYMD(current, bounds.min, bounds.max)
    const years = buildSolarYears(bounds.min, bounds.max)
    const months = buildSolarMonths(picked.year, bounds.min, bounds.max)
    const days = buildSolarDays(picked.year, picked.month, bounds.min, bounds.max)
    this._solarPickerTarget = target
    this._pendingSolar = picked
    this._solarPickerReady = false
    if (this._pickerTick) this._pickerTick.prepare()
    this.setData(
      {
        showSolarPicker: true,
        solarPickerTitle: target === 'asOf' ? '选择计算日期' : '选择出生日期',
        solarYears: years,
        solarMonths: months,
        solarDays: days,
        solarPickerValue: solarPickerValue(picked, years, months, days)
      },
      () => {
        setTimeout(() => {
          this._solarPickerReady = true
        }, 180)
      }
    )
  },

  onOpenBirthdayPicker() {
    this.openSolarPicker('birthday')
  },

  onOpenAsOfPicker() {
    this.openSolarPicker('asOf')
  },

  onSolarPickerChange(e) {
    const value = (e.detail && e.detail.value) || []
    const bounds = this.solarPickerBounds(this._solarPickerTarget || 'birthday')
    const years = this.data.solarYears && this.data.solarYears.length
      ? this.data.solarYears
      : buildSolarYears(bounds.min, bounds.max)
    const year = years[value[0]] || bounds.min.year
    const currentMonths =
      this.data.solarMonths && this.data.solarMonths.length
        ? this.data.solarMonths
        : buildSolarMonths(year, bounds.min, bounds.max)
    const nextMonths = buildSolarMonths(year, bounds.min, bounds.max)
    let month = currentMonths[value[1]] || nextMonths[0]
    if (nextMonths.indexOf(month) < 0) {
      month = nextMonths[Math.min(nextMonths.length - 1, Math.max(0, value[1] || 0))]
    }
    const currentDays =
      this.data.solarDays && this.data.solarDays.length
        ? this.data.solarDays
        : buildSolarDays(year, month, bounds.min, bounds.max)
    const nextDays = buildSolarDays(year, month, bounds.min, bounds.max)
    let day = currentDays[value[2]] || nextDays[0]
    if (nextDays.indexOf(day) < 0) {
      day = nextDays[Math.min(nextDays.length - 1, Math.max(0, value[2] || 0))]
    }
    const picked = { year, month, day }
    this._pendingSolar = picked
    if (this._syncingSolarPicker) return
    if (this._solarPickerReady && this._pickerTick) this._pickerTick.play()
    if (
      nextMonths.length !== currentMonths.length ||
      nextMonths[0] !== currentMonths[0] ||
      nextDays.length !== currentDays.length ||
      nextDays[0] !== currentDays[0]
    ) {
      this._syncingSolarPicker = true
      this.setData(
        {
          solarMonths: nextMonths,
          solarDays: nextDays,
          solarPickerValue: solarPickerValue(picked, years, nextMonths, nextDays)
        },
        () => {
          this._syncingSolarPicker = false
        }
      )
    }
  },

  onConfirmSolarPicker() {
    const target = this._solarPickerTarget || 'birthday'
    const bounds = this.solarPickerBounds(target)
    const picked = clampYMD(this._pendingSolar, bounds.min, bounds.max)
    if (target === 'asOf') {
      this.setData(
        {
          asOf: formatYMD(picked.year, picked.month, picked.day),
          showSolarPicker: false
        },
        () => {
          this.syncBirthdayDisplay()
          this.recalculate({ celebrate: true, delay: 180 })
        }
      )
      return
    }
    this.applyBirthday(picked)
  },

  onCancelSolarPicker() {
    this.setData({ showSolarPicker: false })
  },

  onSolarPickerSheetTap() {},

  applyBirthday(parts) {
    const today = this.todayParts()
    const birthday = clampSolarToToday(parts, today)
    let asOf = parseYMDParts(this.data.asOf) || today
    if (compareYMD(asOf, birthday) < 0) asOf = birthday
    this.setData(
      {
        birthday: formatYMD(birthday.year, birthday.month, birthday.day),
        asOf: formatYMD(asOf.year, asOf.month, asOf.day),
        showSolarPicker: false,
        showLunarPicker: false
      },
      () => {
        this.syncBirthdayDisplay()
        this.recalculate({ celebrate: true, delay: 180 })
      }
    )
  },

  onSwitchBirthCalendar(e) {
    const birthCalendar = e.currentTarget.dataset.cal
    if (!birthCalendar || birthCalendar === this.data.birthCalendar) return
    this.setData({ birthCalendar }, () => {
      this.syncBirthdayDisplay()
      this.recalculate()
    })
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
    this.applyBirthday(clamped)
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

  onSaveCard() {
    const result = this.data.result
    if (!result || !result.valid) {
      wx.showToast({ title: '请先算出结果', icon: 'none' })
      return
    }
    if (this._savingCard) return
    this._savingCard = true
    this.setData({ savingCard: true })
    wx.showLoading({ title: '正在生成', mask: true })
    saveResultCard(this, 'resultCard', (ctx, width, height) => {
      drawAgeCard(ctx, width, height, result)
    })
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      })
      .catch((err) => {
        wx.hideLoading()
        handleSaveError(err)
      })
      .then(() => {
        this._savingCard = false
        this.setData({ savingCard: false })
      })
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
