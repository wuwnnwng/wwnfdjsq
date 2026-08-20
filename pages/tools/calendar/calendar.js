const {
  buildDayInfo,
  isSameDate,
  todayParts,
  pad2
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

const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六']
const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function formatPickerDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function formatDateKey(year, month, day) {
  return formatPickerDate(year, month, day)
}

function parsePickerDate(value) {
  const parts = String(value || '').split('-')
  if (parts.length !== 3) return null
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  if (!year || !month || !day) return null
  return { year, month, day }
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
      festivalShort: festival ? festival.split(' ')[0] : ''
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
    }
  },

  onLoad() {
    enableShareMenu()
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
    if (this._festivalLoading) return
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
    }
  },

  ensureFestivalYear(year, callback) {
    if (this._holidayYear === year && this.data.holidayDayMap) {
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

  onPickDate(e) {
    const picked = parsePickerDate(e.detail.value)
    if (!picked) return
    this.setData(
      {
        viewYear: picked.year,
        viewMonth: picked.month,
        selectedYear: picked.year,
        selectedMonth: picked.month,
        selectedDay: picked.day
      },
      () => {
        this.ensureFestivalYear(picked.year, () => this.refreshCalendarView())
      }
    )
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.activeTab) return
    this.setData({ activeTab: tab }, () => {
      if (tab === 'festival') {
        this.refreshFestivalCountdown()
      }
    })
  },

  onPrevMonth() {
    let { viewYear, viewMonth } = this.data
    viewMonth -= 1
    if (viewMonth < 1) {
      viewMonth = 12
      viewYear -= 1
    }
    this.setData({ viewYear, viewMonth }, () => {
      this.ensureFestivalYear(viewYear, () => this.refreshCalendarView())
    })
  },

  onNextMonth() {
    let { viewYear, viewMonth } = this.data
    viewMonth += 1
    if (viewMonth > 12) {
      viewMonth = 1
      viewYear += 1
    }
    this.setData({ viewYear, viewMonth }, () => {
      this.ensureFestivalYear(viewYear, () => this.refreshCalendarView())
    })
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
  }
})
