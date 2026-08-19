const {
  buildDayInfo,
  isSameDate,
  todayParts,
  solarToLunar
} = require('../../../utils/lunar')
const {
  AUSPICIOUS_EVENTS,
  getAlmanac,
  getAuspiciousDaysInMonth,
  buildHuangliDetail
} = require('../../../utils/almanac')
const { buildFestivalGroups, getDayFestivalLabel } = require('../../../utils/festivals')
const { getThemeId, applyThemeChrome } = require('../../../utils/theme')
const { enableShareMenu, getCalendarToolShare } = require('../../../utils/share')

const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六']
const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function formatDateKey(year, month, day) {
  return `${year}-${month}-${day}`
}

function buildMonthCells(viewYear, viewMonth, selected, today, auspiciousEvent, auspiciousDays) {
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

    const lunar = solarToLunar(year, month, day)
    const lunarShort =
      lunar.lunarDay === 1 ? `${lunar.isLeap ? '闰' : ''}${['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'][lunar.lunarMonth - 1]}月` : ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'][lunar.lunarDay - 1]
    const festival = inMonth && month === viewMonth ? getDayFestivalLabel(year, month, day) : ''
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
      lunarShort,
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
        selectedDay: today.day,
        festivalGroups: buildFestivalGroups(today.year)
      },
      () => this.refreshCalendarView()
    )
  },

  onShow() {
    const theme = getThemeId()
    this.setData({ theme })
    applyThemeChrome(theme)
  },

  refreshCalendarView() {
    const {
      viewYear,
      viewMonth,
      selectedYear,
      selectedMonth,
      selectedDay,
      auspiciousEvent
    } = this.data
    const today = this._today || todayParts()
    const selected = { year: selectedYear, month: selectedMonth, day: selectedDay }
    const auspiciousDays = auspiciousEvent
      ? getAuspiciousDaysInMonth(viewYear, viewMonth, auspiciousEvent)
      : []
    const dayInfo = buildDayInfo(selectedYear, selectedMonth, selectedDay)
    const almanac = getAlmanac(selectedYear, selectedMonth, selectedDay)
    const huangliDay = buildDayInfo(today.year, today.month, today.day)
    const huangliDetail = buildHuangliDetail(huangliDay)

    this.setData({
      monthCells: buildMonthCells(
        viewYear,
        viewMonth,
        selected,
        today,
        auspiciousEvent,
        auspiciousDays
      ),
      selectedInfo: {
        solarText: dayInfo.solarText,
        weekdayText: WEEKDAY_NAMES[new Date(selectedYear, selectedMonth - 1, selectedDay).getDay()],
        lunarText: dayInfo.lunarText,
        ganZhiText: `${dayInfo.ganZhiYear}年 · ${dayInfo.zodiac}年`,
        ganZhiDay: `${dayInfo.ganZhiDay}日`,
        solarTerm: dayInfo.solarTerm || '—',
        yi: almanac.yi,
        ji: almanac.ji,
        jianChu: almanac.jianChu
      },
      huangliDetail
    })
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.activeTab) return
    this.setData({ activeTab: tab })
  },

  onPrevMonth() {
    let { viewYear, viewMonth } = this.data
    viewMonth -= 1
    if (viewMonth < 1) {
      viewMonth = 12
      viewYear -= 1
    }
    this.setData({ viewYear, viewMonth }, () => this.refreshCalendarView())
  },

  onNextMonth() {
    let { viewYear, viewMonth } = this.data
    viewMonth += 1
    if (viewMonth > 12) {
      viewMonth = 1
      viewYear += 1
    }
    this.setData({ viewYear, viewMonth }, () => this.refreshCalendarView())
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
