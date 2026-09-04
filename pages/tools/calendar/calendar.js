const {
  buildDayInfo,
  isSameDate,
  todayParts,
  pad2,
  solarToLunar,
  lunarToSolar,
  formatLunarCell,
  formatLunarYearDate,
  getLunarMonthOptions,
  getLunarDayOptions
} = require('../../../utils/lunar')
const {
  AUSPICIOUS_EVENTS,
  getAlmanac,
  getAuspiciousDaysInMonth,
  buildHuangliDetail
} = require('../../../utils/almanac')
const { buildFestivalGroups, getDayFestivalLabel, attachCountdownList } = require('../../../utils/festivals')
const { getDayHolidayRecord } = require('../../../utils/holidayApi')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getCalendarToolShare } = require('../../../utils/share')
const { createPickerTick } = require('../../../utils/pickerTick')
const { createLastInput } = require('../../../utils/toolLastInput')

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
const lastInput = createLastInput('calendar', [
  'viewYear',
  'viewMonth',
  'selectedYear',
  'selectedMonth',
  'selectedDay',
  'pickerCalendar'
])

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

function solarPickerHint(picked) {
  const lunar = solarToLunar(picked.year, picked.month, picked.day)
  return `农历${formatLunarYearDate(lunar)}`
}

function buildLunarPickerState(solarParts) {
  const lunar = solarToLunar(solarParts.year, solarParts.month, solarParts.day)
  const year = Math.min(PICKER_YEAR_END, Math.max(PICKER_YEAR_START, lunar.lunarYear))
  const months = getLunarMonthOptions(year)
  let monthIndex = months.findIndex((item) => item.month === lunar.lunarMonth && !!item.isLeap === !!lunar.isLeap)
  if (monthIndex < 0) monthIndex = months.findIndex((item) => item.month === lunar.lunarMonth)
  if (monthIndex < 0) monthIndex = 0
  const month = months[monthIndex]
  const days = getLunarDayOptions(year, month.month, month.isLeap)
  const dayIndex = Math.min(days.length - 1, Math.max(0, (lunar.lunarDay || 1) - 1))
  return {
    lunarMonths: months,
    lunarDays: days,
    lunarPickerValue: [year - PICKER_YEAR_START, monthIndex, dayIndex]
  }
}

function lunarPendingToSolar(pending) {
  const year = Math.min(
    PICKER_YEAR_END,
    Math.max(PICKER_YEAR_START, Number(pending && pending.year) || PICKER_YEAR_START)
  )
  const months = getLunarMonthOptions(year)
  const month = months[Math.min(months.length - 1, Math.max(0, Number(pending && pending.monthIndex) || 0))]
  if (!month) return clampPickerDate(year, 1, 1)
  const days = getLunarDayOptions(year, month.month, month.isLeap)
  const day = Math.min(days.length, Math.max(1, (Number(pending && pending.dayIndex) || 0) + 1))
  const solar = lunarToSolar(year, month.month, day, month.isLeap)
  return clampPickerDate(solar.year, solar.month, solar.day)
}

function lunarPickerHint(pending) {
  const solar = lunarPendingToSolar(pending)
  return `对应公历 ${solar.year}年${solar.month}月${solar.day}日`
}

function lunarPendingFromValue(value) {
  return {
    year: PICKER_YEARS[value && value[0]] || PICKER_YEAR_START,
    monthIndex: Number(value && value[1]) || 0,
    dayIndex: Number(value && value[2]) || 0
  }
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

    const festival = (() => {
      try {
        return getDayFestivalLabel(year, month, day, holidayDayMap)
      } catch (e) {
        return ''
      }
    })()
    const festivalShort = festival ? festival.split(' ')[0] : ''
    const lunarShort = formatLunarCell(solarToLunar(year, month, day))
    const isToday = isSameDate({ year, month, day }, today)
    const isSelected = isSameDate({ year, month, day }, selected)
    const isAuspicious =
      inMonth && month === viewMonth && auspiciousEvent && auspiciousDays.indexOf(day) >= 0
    const holidayRecord = getDayHolidayRecord(holidayDayMap, year, month, day)
    const isRestDay = !!(holidayRecord && holidayRecord.holiday)
    const isWorkDay = !!(
      holidayRecord &&
      !holidayRecord.holiday &&
      (holidayRecord.after || /补班/.test(holidayRecord.name || ''))
    )
    const tagFestival = festivalShort === '班' ? '' : festivalShort

    cells.push({
      key: formatDateKey(year, month, day),
      year,
      month,
      day,
      inMonth,
      isToday,
      isSelected,
      isAuspicious,
      isRestDay,
      isWorkDay,
      festivalShort: tagFestival,
      lunarShort,
      daySub: tagFestival || lunarShort
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
    pickerCalendar: 'solar',
    pickerHint: '',
    pickerYears: PICKER_YEARS,
    pickerMonths: PICKER_MONTHS,
    pickerDays: [],
    datePickerValue: [0, 0, 0],
    lunarMonths: [],
    lunarDays: [],
    lunarPickerValue: [0, 0, 0],
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
    selectedHourZhi: '',
    selectedHour: null,
    showHuangliTip: false
  },

  onLoad() {
    enableShareMenu()
    this._pickerTick = createPickerTick()
    const today = todayParts()
    this._today = today
    const saved = lastInput.restore()
    const picked = clampPickerDate(
      saved.selectedYear || saved.viewYear || today.year,
      saved.selectedMonth || saved.viewMonth || today.month,
      saved.selectedDay || today.day
    )
    this.setData(
      {
        viewYear: saved.viewYear || picked.year,
        viewMonth: saved.viewMonth || picked.month,
        selectedYear: picked.year,
        selectedMonth: picked.month,
        selectedDay: picked.day,
        pickerCalendar: saved.pickerCalendar === 'lunar' ? 'lunar' : 'solar'
      },
      () => {
        this.loadFestivalData(picked.year, () => this.refreshCalendarView())
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
    if (this.data.activeTab === 'almanac' && this.data.selectedYear) {
      this.refreshCalendarView()
    }
  },

  onHide() {
    lastInput.flush(this)
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
    const festival = getDayFestivalLabel(selectedYear, selectedMonth, selectedDay, holidayDayMap, {
      includeTerm: false
    })
    const almanac = getAlmanac(selectedYear, selectedMonth, selectedDay)
    const huangliDetail = buildHuangliDetail(dayInfo, new Date())
    const hourList = huangliDetail.hourLuckList || []
    let selectedHourZhi = this.data.selectedHourZhi
    if (!selectedHourZhi) {
      selectedHourZhi = (huangliDetail.currentHour && huangliDetail.currentHour.zhi) || '子'
    }
    const selectedHour = hourList.find((item) => item.zhi === selectedHourZhi) || hourList[0] || null

    this.setData({
      selectedHourZhi,
      selectedHour,
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
        festival: festival || '',
        solarTerm: dayInfo.solarTerm || '—',
        constellation: dayInfo.constellation || '',
        yi: almanac.yi,
        ji: almanac.ji,
        yiList: almanac.yiList,
        jiList: almanac.jiList,
        jianChu: almanac.jianChu
      },
      huangliDetail
    }, () => lastInput.save(this))
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
        this.refreshCalendarView()
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
    if (this.data.pickerCalendar === 'lunar') {
      this.openLunarPickerFromSolar(picked)
      return
    }
    this.openSolarPickerFromDate(picked)
  },

  openSolarPickerFromDate(picked) {
    this._pendingPickerDate = picked
    this._datePickerReady = false
    this._syncingPicker = false
    if (this._pickerTick) this._pickerTick.prepare()
    this.setData(
      {
        showDatePicker: true,
        pickerCalendar: 'solar',
        pickerDays: buildPickerDays(picked.year, picked.month),
        datePickerValue: pickerValueFromDate(picked.year, picked.month, picked.day),
        pickerHint: solarPickerHint(picked)
      },
      () => {
        lastInput.save(this)
        setTimeout(() => {
          this._datePickerReady = true
        }, 180)
      }
    )
  },

  openLunarPickerFromSolar(picked) {
    const state = buildLunarPickerState(picked)
    this._pendingLunar = lunarPendingFromValue(state.lunarPickerValue)
    this._lunarPickerReady = false
    this._syncingLunarPicker = false
    if (this._pickerTick) this._pickerTick.prepare()
    this.setData(
      {
        showDatePicker: true,
        pickerCalendar: 'lunar',
        lunarMonths: state.lunarMonths,
        lunarDays: state.lunarDays,
        lunarPickerValue: state.lunarPickerValue,
        pickerHint: lunarPickerHint(this._pendingLunar)
      },
      () => {
        lastInput.save(this)
        setTimeout(() => {
          this._lunarPickerReady = true
        }, 180)
      }
    )
  },

  onSwitchPickerCalendar(e) {
    const next = e.currentTarget.dataset.cal
    if (next !== 'solar' && next !== 'lunar') return
    if (next === this.data.pickerCalendar) return
    if (next === 'lunar') {
      const solar = this._pendingPickerDate || clampPickerDate(
        this.data.selectedYear,
        this.data.selectedMonth,
        this.data.selectedDay
      )
      this.openLunarPickerFromSolar(solar)
      return
    }
    const solar = lunarPendingToSolar(
      this._pendingLunar || lunarPendingFromValue(this.data.lunarPickerValue)
    )
    this.openSolarPickerFromDate(solar)
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
    const hint = solarPickerHint(picked)
    if (this._syncingPicker) return
    if (this._datePickerReady && this._pickerTick) {
      this._pickerTick.play()
    }
    if (nextDays.length !== currentDays.length) {
      this._syncingPicker = true
      this.setData(
        {
          pickerDays: nextDays,
          datePickerValue: pickerValueFromDate(picked.year, picked.month, picked.day),
          pickerHint: hint
        },
        () => {
          this._syncingPicker = false
        }
      )
      return
    }
    if (hint !== this.data.pickerHint) {
      this.setData({ pickerHint: hint })
    }
  },

  onLunarPickerChange(e) {
    const value = (e.detail && e.detail.value) || []
    const year = PICKER_YEARS[value[0]] || PICKER_YEAR_START
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
    const yearChanged = year !== (PICKER_YEARS[this.data.lunarPickerValue[0]] || 0)
    this._pendingLunar = { year, monthIndex, dayIndex }
    const hint = lunarPickerHint(this._pendingLunar)
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
          lunarPickerValue: [year - PICKER_YEAR_START, monthIndex, dayIndex],
          pickerHint: hint
        },
        () => {
          this._syncingLunarPicker = false
        }
      )
      return
    }
    if (hint !== this.data.pickerHint) {
      this.setData({ pickerHint: hint })
    }
  },

  onConfirmDatePicker() {
    const picked = this.data.pickerCalendar === 'lunar'
      ? lunarPendingToSolar(this._pendingLunar || lunarPendingFromValue(this.data.lunarPickerValue))
      : this._pendingPickerDate || {
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
      if (tab === 'almanac') {
        this.refreshCalendarView()
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

  shiftSelectedDay(delta) {
    const date = new Date(
      Number(this.data.selectedYear),
      Number(this.data.selectedMonth) - 1,
      Number(this.data.selectedDay) + Number(delta)
    )
    this.applyPickedDate(
      clampPickerDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
    )
  },

  onHuangliPrevDay() {
    this.shiftSelectedDay(-1)
  },

  onHuangliNextDay() {
    this.shiftSelectedDay(1)
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
        selectedDay: today.day,
        selectedHourZhi: ''
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

  onSelectHuangliHour(e) {
    const zhi = e.currentTarget.dataset.zhi
    if (!zhi) return
    const list = (this.data.huangliDetail && this.data.huangliDetail.hourLuckList) || []
    const selectedHour = list.find((item) => item.zhi === zhi)
    if (!selectedHour) return
    this.setData({
      selectedHourZhi: zhi,
      selectedHour
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
    lastInput.flush(this)
    if (this._pickerTick) {
      this._pickerTick.destroy()
      this._pickerTick = null
    }
  }
})
