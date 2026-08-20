const {
  buildDayInfo,
  isSameDate,
  todayParts,
  pad2,
  solarToLunar,
  formatLunarCell
} = require('../../../utils/lunar')
const {
  AUSPICIOUS_EVENTS,
  getAlmanac,
  getAuspiciousDaysInMonth,
  buildHuangliDetail
} = require('../../../utils/almanac')
const { buildFestivalGroups, getDayFestivalLabel, attachCountdownList } = require('../../../utils/festivals')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getCalendarToolShare } = require('../../../utils/share')
const { createPickerTick } = require('../../../utils/pickerTick')

const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六']
const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function formatPickerDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function formatDateKey(year, month, day) {
  return formatPickerDate(year, month, day)
}

const PICKER_YEAR_START = 1900
const PICKER_YEAR_END = 2100
const PICKER_YEARS = []
for (let year = PICKER_YEAR_START; year <= PICKER_YEAR_END; year += 1) {
  PICKER_YEARS.push(year)
}
const PICKER_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function buildPickerDays(year, month) {
  const last = daysInMonth(year, month)
  const days = []
  for (let day = 1; day <= last; day += 1) {
    days.push(day)
  }
  return days
}

function clampPickerDate(year, month, day) {
  const y = Math.min(PICKER_YEAR_END, Math.max(PICKER_YEAR_START, Number(year) || PICKER_YEAR_START))
  const m = Math.min(12, Math.max(1, Number(month) || 1))
  const last = daysInMonth(y, m)
  const d = Math.min(last, Math.max(1, Number(day) || 1))
  return { year: y, month: m, day: d }
}

function pickerValueFromDate(year, month, day) {
  const picked = clampPickerDate(year, month, day)
  return [picked.year - PICKER_YEAR_START, picked.month - 1, picked.day - 1]
}

function buildMonthCells(
  viewYear,
  viewMonth,
  selected,
  today,
  auspiciousEvent,
  auspiciousDays,
  holidayDayMap
) {
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const prevMonthDays = new Date(viewYear, viewMonth - 1, 0).getDate()
  const cells = []

  for (let i = 0; i < 42; i += 1) {
    let year = viewYear
    let month = viewMonth
    let day = i - firstWeekday + 1
    let inMonth = true

    if (day <= 0) {
      month -= 1
      if (month < 1) {
        month = 12
        year -= 1
      }
      day = prevMonthDays + day
      inMonth = false
    } else if (day > daysInMonth) {
      day -= daysInMonth
      month += 1
      if (month > 12) {
        month = 1
        year += 1
      }
      inMonth = false
    }

    const festival = getDayFestivalLabel(year, month, day, holidayDayMap)
    const festivalShort = festival ? festival.split(' ')[0] : ''
    const lunarShort = formatLunarCell(solarToLunar(year, month, day))
    const isToday = isSameDate({ year, month, day }, today)
    const isSelected = isSameDate({ year, month, day }, selected)
    const isAuspicious =
      inMonth && month === viewMonth && auspiciousEvent && auspiciousDays.indexOf(day) >= 0

    cells.push({
      key: formatDateKey(year, month, day),
      year,
      month,
      day,
      inMonth,
      isToday,
      isSelected,
      isAuspicious,
      festivalShort,
      lunarShort,
      daySub: festivalShort || lunarShort
    })
  }

  return cells
}

Page({
  data: {
    theme: getThemeId(),
    activeTab: 'calendar',
    weekHeaders: WEEK_HEADERS,
    viewYear: 0,
    viewMonth: 0,
    selectedYear: 0,
    selectedMonth: 0,
    selectedDay: 0,
    pickerDate: '',
    showDatePicker: false,
    pickerYears: PICKER_YEARS,
    pickerMonths: PICKER_MONTHS,
    pickerDays: [],
    datePickerValue: [0, 0, 0],
    monthCells: [],
    selectedInfo: null,
    huangliDetail: null,
    showAuspiciousPicker: false,
    auspiciousEvents: AUSPICIOUS_EVENTS,
    auspiciousEvent: '',
    auspiciousEventName: '',
    festivalGroups: {
      legal: [],
      terms: [],
      popular: []
    },
    festivalLoading: false,
    festivalError: '',
    holidayDayMap: {},
    festivalSectionOpen: {
      legal: true,
      terms: false,
      popular: false
    },
    huangliSectionOpen: {
      jianChu: false,
      hourLuck: false
    },
    showHuangliTip: false
  },

  onLoad() {
    enableShareMenu()
    this._pickerTick = createPickerTick()
    const today = todayParts()
    this._today = today
    this.setData(
      {
        viewYear: today.year,
        viewMonth: today.month,
        selectedYear: today.year,
        selectedMonth: today.month,
        selectedDay: today.day
      },
      () => {
        this.loadFestivalData(today.year, () => this.refreshCalendarView())
      }
    )
  },

  async loadFestivalData(year, callback) {
    if (this._festivalLoading) {
      this._festivalPending = { year, callback }
      return
    }
    this._festivalLoading = true
    this.setData({ festivalLoading: true, festivalError: '' })
    try {
      const groups = await buildFestivalGroups(year, new Date())
      this._holidayYear = year
      this.setData(
        {
          festivalGroups: {
            legal: groups.legal,
            terms: groups.terms,
            popular: groups.popular
          },
          holidayDayMap: groups.holidayDayMap || {},
          festivalLoading: false,
          festivalError: groups.holidayError || (groups.holidayStale ? '已使用缓存的放假安排' : '')
        },
        () => {
          if (callback) callback()
        }
      )
    } catch (e) {
      this.setData({
        festivalLoading: false,
        festivalError: '节日数据加载失败'
      })
      if (callback) callback()
    } finally {
      this._festivalLoading = false
      const pending = this._festivalPending
      this._festivalPending = null
      if (pending && pending.year !== this._holidayYear) {
        this.loadFestivalData(pending.year, pending.callback)
      } else if (pending && pending.callback) {
        pending.callback()
      }
    }
  },

  ensureFestivalYear(year, callback) {
    if (this._holidayYear === year) {
      if (callback) callback()
      return
    }
    this.loadFestivalData(year, callback)
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
    if (this.data.activeTab === 'festival' && this.data.festivalGroups) {
      this.refreshFestivalCountdown()
    }
  },

  refreshFestivalCountdown() {
    const { festivalGroups, viewYear } = this.data
    if (!festivalGroups) return
    const now = new Date()
    this.setData({
      festivalGroups: {
        legal: attachCountdownList(festivalGroups.legal, viewYear, now),
        terms: attachCountdownList(festivalGroups.terms, viewYear, now),
        popular: attachCountdownList(festivalGroups.popular, viewYear, now)
      }
    })
  },

  refreshCalendarView() {
    const {
      viewYear,
      viewMonth,
      selectedYear,
      selectedMonth,
      selectedDay,
      auspiciousEvent,
      holidayDayMap
    } = this.data
    const today = this._today || todayParts()
    const selected = { year: selectedYear, month: selectedMonth, day: selectedDay }
    const auspiciousDays = auspiciousEvent
      ? getAuspiciousDaysInMonth(viewYear, viewMonth, auspiciousEvent)
      : []
    const dayInfo = buildDayInfo(selectedYear, selectedMonth, selectedDay)
    const almanac = getAlmanac(selectedYear, selectedMonth, selectedDay)
    const huangliDay = buildDayInfo(today.year, today.month, today.day)
    const huangliDetail = buildHuangliDetail(huangliDay, new Date())

    this.setData({
      monthCells: buildMonthCells(
        viewYear,
        viewMonth,
        selected,
        today,
        auspiciousEvent,
        auspiciousDays,
        holidayDayMap
      ),
      pickerDate: formatPickerDate(selectedYear, selectedMonth, selectedDay),
      selectedInfo: {
        solarText: dayInfo.solarText,
        weekdayText: WEEKDAY_NAMES[new Date(selectedYear, selectedMonth - 1, selectedDay).getDay()],
        weekText: dayInfo.weekText,
        lunarText: dayInfo.lunarText,
        ganZhiText: `${dayInfo.ganZhiYear}年 · ${dayInfo.ganZhiMonth}月 · ${dayInfo.zodiac}年`,
        ganZhiDay: `${dayInfo.ganZhiDay}日`,
        solarTerm: dayInfo.solarTerm || '—',
        yi: almanac.yi,
        ji: almanac.ji,
        jianChu: almanac.jianChu
      },
      huangliDetail
    })
  },

  applyPickedDate(picked) {
    if (!picked) return
    this.setData(
      {
        viewYear: picked.year,
        viewMonth: picked.month,
        selectedYear: picked.year,
        selectedMonth: picked.month,
        selectedDay: picked.day,
        showDatePicker: false
      },
      () => {
        this.ensureFestivalYear(picked.year, () => this.refreshCalendarView())
      }
    )
  },

  onOpenDatePicker() {
    const year = Number(this.data.selectedYear) || Number(this.data.viewYear)
    const month = Number(this.data.selectedMonth) || Number(this.data.viewMonth)
    const day = Number(this.data.selectedDay) || 1
    const picked = clampPickerDate(year, month, day)
    this._pendingPickerDate = picked
    this._datePickerReady = false
    if (this._pickerTick) this._pickerTick.prepare()
    this.setData(
      {
        showDatePicker: true,
        pickerDays: buildPickerDays(picked.year, picked.month),
        datePickerValue: pickerValueFromDate(picked.year, picked.month, picked.day)
      },
      () => {
        setTimeout(() => {
          this._datePickerReady = true
        }, 180)
      }
    )
  },

  onDatePickerChange(e) {
    const value = (e.detail && e.detail.value) || []
    const year = PICKER_YEARS[value[0]] || PICKER_YEAR_START
    const month = PICKER_MONTHS[value[1]] || 1
    const currentDays = this.data.pickerDays && this.data.pickerDays.length
      ? this.data.pickerDays
      : buildPickerDays(year, month)
    const nextDays = buildPickerDays(year, month)
    let day = currentDays[value[2]] || value[2] + 1
    if (day > nextDays.length) day = nextDays.length
    const picked = clampPickerDate(year, month, day)
    this._pendingPickerDate = picked
    if (this._syncingPicker) return
    if (this._datePickerReady && this._pickerTick) {
      this._pickerTick.play()
    }
    if (nextDays.length !== currentDays.length) {
      this._syncingPicker = true
      this.setData(
        {
          pickerDays: nextDays,
          datePickerValue: pickerValueFromDate(picked.year, picked.month, picked.day)
        },
        () => {
          this._syncingPicker = false
        }
      )
    }
  },

  onConfirmDatePicker() {
    const picked = this._pendingPickerDate || {
      year: this.data.selectedYear,
      month: this.data.selectedMonth,
      day: this.data.selectedDay
    }
    this.applyPickedDate(picked)
  },

  onCancelDatePicker() {
    this.setData({ showDatePicker: false })
  },

  onDatePickerSheetTap() {},

  preventMove() {},

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.activeTab) return
    this.setData({ activeTab: tab }, () => {
      if (tab === 'festival') {
        this.refreshFestivalCountdown()
      }
    })
  },

  shiftMonth(delta) {
    let year = Number(this.data.viewYear)
    let month = Number(this.data.viewMonth) + Number(delta)
    if (month < 1) {
      month = 12
      year -= 1
    } else if (month > 12) {
      month = 1
      year += 1
    }
    const daysInMonth = new Date(year, month, 0).getDate()
    const selectedDay = Math.min(Number(this.data.selectedDay) || 1, daysInMonth)
    this.setData(
      {
        viewYear: year,
        viewMonth: month,
        selectedYear: year,
        selectedMonth: month,
        selectedDay
      },
      () => {
        this.refreshCalendarView()
        this.ensureFestivalYear(year, () => this.refreshCalendarView())
      }
    )
  },

  onPrevMonth() {
    this.shiftMonth(-1)
  },

  onNextMonth() {
    this.shiftMonth(1)
  },

  onCalendarTouchStart(e) {
    const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
    if (!touch) return
    this._monthTouch = {
      x: touch.clientX,
      y: touch.clientY
    }
    this._didSwipeMonth = false
  },

  onCalendarTouchEnd(e) {
    const start = this._monthTouch
    this._monthTouch = null
    if (!start) return
    const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
    if (!touch) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 56) return
    if (Math.abs(dx) <= Math.abs(dy) * 1.15) return
    this._didSwipeMonth = true
    this.shiftMonth(dx < 0 ? 1 : -1)
  },

  onBackToday() {
    const today = this._today || todayParts()
    this.setData(
      {
        viewYear: today.year,
        viewMonth: today.month,
        selectedYear: today.year,
        selectedMonth: today.month,
        selectedDay: today.day
      },
      () => this.refreshCalendarView()
    )
  },

  onSelectDay(e) {
    if (this._didSwipeMonth) {
      this._didSwipeMonth = false
      return
    }
    const { year, month, day, inmonth } = e.currentTarget.dataset
    if (!year || !month || !day) return
    const patch = {
      selectedYear: Number(year),
      selectedMonth: Number(month),
      selectedDay: Number(day)
    }
    if (inmonth === false || inmonth === 'false') {
      patch.viewYear = Number(year)
      patch.viewMonth = Number(month)
    }
    this.setData(patch, () => this.refreshCalendarView())
  },

  onToggleAuspiciousPicker() {
    this.setData({ showAuspiciousPicker: !this.data.showAuspiciousPicker })
  },

  onToggleFestivalSection(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    const open = this.data.festivalSectionOpen[key]
    this.setData({
      [`festivalSectionOpen.${key}`]: !open
    })
  },

  onToggleHuangliSection(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    const open = this.data.huangliSectionOpen[key]
    this.setData({
      [`huangliSectionOpen.${key}`]: !open
    })
  },

  onShowHuangliTip() {
    this.setData({ showHuangliTip: true })
  },

  onHideHuangliTip() {
    this.setData({ showHuangliTip: false })
  },

  onSelectAuspiciousEvent(e) {
    const id = e.currentTarget.dataset.id
    const item = AUSPICIOUS_EVENTS.find((row) => row.id === id)
    if (!item) return
    const next = this.data.auspiciousEvent === id ? '' : id
    const nextItem = next ? item : null
    this.setData(
      {
        auspiciousEvent: next,
        auspiciousEventName: nextItem ? nextItem.name : '',
        showAuspiciousPicker: !!next
      },
      () => this.refreshCalendarView()
    )
  },

  onShareAppMessage() {
    return getCalendarToolShare().appMessage
  },

  onShareTimeline() {
    return getCalendarToolShare().timeline
  },

  onUnload() {
    if (this._pickerTick) {
      this._pickerTick.destroy()
      this._pickerTick = null
    }
  }
})
