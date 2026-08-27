function pad2(n) {
  return String(n).padStart(2, '0')
}

function parseYMD(text) {
  const matched = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(text || '').trim())
  if (!matched) return null
  return {
    year: Number(matched[1]),
    month: Number(matched[2]),
    day: Number(matched[3])
  }
}

function formatYMD(parts) {
  if (!parts) return ''
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function compareYMD(a, b) {
  if (!a) return -1
  if (!b) return 1
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
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
  if (compareYMD(next, minParts) < 0) {
    return { year: minParts.year, month: minParts.month, day: minParts.day }
  }
  if (compareYMD(next, maxParts) > 0) {
    return { year: maxParts.year, month: maxParts.month, day: maxParts.day }
  }
  return next
}

function buildYears(minParts, maxParts) {
  const years = []
  for (let year = minParts.year; year <= maxParts.year; year += 1) {
    years.push(year)
  }
  return years
}

function buildMonths(year, minParts, maxParts) {
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

function buildDays(year, month, minParts, maxParts) {
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

function pickerValue(parts, years, months, days) {
  return [
    indexOrLast(years, parts.year),
    indexOrLast(months, parts.month),
    indexOrLast(days, parts.day)
  ]
}

function defaultRange() {
  return {
    min: { year: 1900, month: 1, day: 1 },
    max: { year: 2100, month: 12, day: 31 }
  }
}

function parseBound(text, fallback) {
  return parseYMD(text) || fallback
}

function buildPickerState(valueText, startText, endText) {
  const range = defaultRange()
  const min = parseBound(startText, range.min)
  const max = parseBound(endText, range.max)
  const current = parseYMD(valueText) || max
  const picked = clampYMD(current, min, max)
  const years = buildYears(min, max)
  const months = buildMonths(picked.year, min, max)
  const days = buildDays(picked.year, picked.month, min, max)
  return {
    min,
    max,
    picked,
    years,
    months,
    days,
    pickerValue: pickerValue(picked, years, months, days)
  }
}

function applyPickerChange(value, currentMonths, currentDays, min, max) {
  const years = buildYears(min, max)
  const year = years[value[0]] || min.year
  const nextMonths = buildMonths(year, min, max)
  let month = (currentMonths && currentMonths[value[1]]) || nextMonths[0]
  if (nextMonths.indexOf(month) < 0) {
    month = nextMonths[Math.min(nextMonths.length - 1, Math.max(0, value[1] || 0))]
  }
  const nextDays = buildDays(year, month, min, max)
  let day = (currentDays && currentDays[value[2]]) || nextDays[0]
  if (nextDays.indexOf(day) < 0) {
    day = nextDays[Math.min(nextDays.length - 1, Math.max(0, value[2] || 0))]
  }
  const picked = { year, month, day }
  return {
    picked,
    years,
    months: nextMonths,
    days: nextDays,
    pickerValue: pickerValue(picked, years, nextMonths, nextDays),
    columnsChanged:
      nextMonths.length !== (currentMonths || []).length ||
      nextMonths[0] !== (currentMonths || [])[0] ||
      nextDays.length !== (currentDays || []).length ||
      nextDays[0] !== (currentDays || [])[0]
  }
}

module.exports = {
  parseYMD,
  formatYMD,
  buildPickerState,
  applyPickerChange,
  clampYMD
}
