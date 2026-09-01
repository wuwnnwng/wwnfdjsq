/**
 * 法定退休年龄：按 2025 年 1 月 1 日起实施的渐进式延迟退休办法。
 * 依据全国人大常委会《关于实施渐进式延迟法定退休年龄的决定》
 * 及人社部公布的对照表口径（按出生年月）。
 *
 * 原法定年龄 / 节奏 / 上限：
 * - 男职工、灵活就业男：60 → 63，每 4 个月延迟 1 个月，最多 36 个月
 * - 原 50 周岁女职工（女工人）：50 → 55，每 2 个月延迟 1 个月，最多 60 个月
 * - 原 55 周岁女职工（女干部）、灵活就业女：55 → 58，每 4 个月延迟 1 个月，最多 36 个月
 *
 * 最低缴费年限：2030 年起由 15 年逐步提高至 20 年，每年提高 6 个月。
 */

const { parseYMD, formatDateText, formatWeekday, formatYMD, todayYMD } = require('./datetimeCalc')

const REFORM_YEAR = 2025
const MIN_CONTRIB_BEFORE = 15
const MIN_CONTRIB_AFTER = 20
const MIN_CONTRIB_START_YEAR = 2030
const MIN_CONTRIB_STEP_MONTHS = 6

const PERSON_TYPES = [
  {
    id: 'male_employee',
    name: '企业男职工',
    shortName: '男职工',
    kicker: '原 60 周岁',
    originalAge: 60,
    step: 4,
    maxDelay: 36,
    targetAge: 63,
    pensionType: 'employee'
  },
  {
    id: 'female_worker',
    name: '女职工',
    shortName: '女职工',
    kicker: '原 50 周岁',
    originalAge: 50,
    step: 2,
    maxDelay: 60,
    targetAge: 55,
    pensionType: 'employee'
  },
  {
    id: 'female_cadre',
    name: '女干部',
    shortName: '女干部',
    kicker: '原 55 周岁',
    originalAge: 55,
    step: 4,
    maxDelay: 36,
    targetAge: 58,
    pensionType: 'employee'
  },
  {
    id: 'flexible_male',
    name: '灵活就业男',
    shortName: '灵活男',
    kicker: '原 60 周岁',
    originalAge: 60,
    step: 4,
    maxDelay: 36,
    targetAge: 63,
    pensionType: 'flexible'
  },
  {
    id: 'flexible_female',
    name: '灵活就业女',
    shortName: '灵活女',
    kicker: '原 55 周岁',
    originalAge: 55,
    step: 4,
    maxDelay: 36,
    targetAge: 58,
    pensionType: 'flexible'
  }
]

const TYPE_HINTS = {
  male_employee: '企业男职工原法定 60 周岁，改革后逐步延迟至 63 周岁。',
  female_worker: '女职工一般指原按 50 周岁退休的企业女工人，改革后逐步延迟至 55 周岁。',
  female_cadre: '女干部指原按 55 周岁退休的女职工，改革后逐步延迟至 58 周岁。',
  flexible_male: '灵活就业男职工参加城镇职工养老，法定年龄与企业男职工相同。',
  flexible_female: '灵活就业女职工多数地区原按 55 周岁。若档案按女工人 50 周岁执行，请改选「女职工」。'
}

const TIP_TEXT =
  '从 2025 年 1 月 1 日起实施渐进式延迟法定退休年龄：男职工由 60 周岁逐步延迟至 63 周岁，每 4 个月延迟 1 个月；原法定 55 周岁的女职工逐步延迟至 58 周岁，每 4 个月延迟 1 个月；原法定 50 周岁的女职工逐步延迟至 55 周岁，每 2 个月延迟 1 个月。领取养老金的最低缴费年限从 2030 年起由 15 年逐步提高至 20 年，每年提高 6 个月。结果按法定年龄估算，未计入弹性提前或延迟（原则上最多 3 年），具体以当地社保经办为准。'

function getPersonType(id) {
  return PERSON_TYPES.find((item) => item.id === id) || PERSON_TYPES[0]
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function addCalendarMonths(year, month, day, months) {
  const total = year * 12 + (month - 1) + Number(months || 0)
  const nextYear = Math.floor(total / 12)
  const nextMonth = (total % 12) + 1
  const nextDay = Math.min(Math.max(1, day || 1), daysInMonth(nextYear, nextMonth))
  return { year: nextYear, month: nextMonth, day: nextDay }
}

function partsToDate(parts) {
  return new Date(parts.year, parts.month - 1, parts.day)
}

function calendarDiff(from, to) {
  let years = to.year - from.year
  let months = to.month - from.month
  let days = to.day - from.day
  if (days < 0) {
    months -= 1
    const prevMonth = to.month === 1 ? 12 : to.month - 1
    const prevYear = to.month === 1 ? to.year - 1 : to.year
    days += daysInMonth(prevYear, prevMonth)
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  return { years, months, days }
}

function compareParts(a, b) {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}

function dateParts(date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  }
}

function formatAgeText(years, months) {
  if (!months) return `${years} 岁`
  return `${years} 岁 ${months} 个月`
}

function formatSpanText(years, months, days) {
  return `${years} 年 ${months} 个月 ${days} 天`
}

function formatMonthText(year, month) {
  return `${year}年${month}月`
}

/**
 * 原法定退休所在月相对 2025 年 1 月的序号（2025 年 1 月 = 1）。
 * 延迟月数 = min(上限, ceil(n / 节奏))
 * 与人社部对照表一致：从改革首月起按节奏分组，每组延迟递增 1 个月。
 * 例如男职工每 4 个月延迟 1 个月：2025 年 1–4 月原法定对应延迟 1 个月，5–8 月延迟 2 个月。
 */
function delayMonthsOf(originalYear, originalMonth, step, maxDelay) {
  const n = (originalYear - REFORM_YEAR) * 12 + originalMonth
  if (n <= 0) return 0
  return Math.min(maxDelay, Math.ceil(n / step))
}

function minContributionOf(retireYear) {
  if (retireYear < MIN_CONTRIB_START_YEAR) {
    return { years: MIN_CONTRIB_BEFORE, months: 0 }
  }
  const steps = Math.min(
    ((MIN_CONTRIB_AFTER - MIN_CONTRIB_BEFORE) * 12) / MIN_CONTRIB_STEP_MONTHS,
    retireYear - (MIN_CONTRIB_START_YEAR - 1)
  )
  const totalMonths = MIN_CONTRIB_BEFORE * 12 + steps * MIN_CONTRIB_STEP_MONTHS
  const capped = Math.min(MIN_CONTRIB_AFTER * 12, totalMonths)
  return {
    years: Math.floor(capped / 12),
    months: capped % 12
  }
}

function formatContributionText(item) {
  if (!item) return ''
  if (!item.months) return `${item.years} 年`
  return `${item.years} 年 ${item.months} 个月`
}

function nearestPensionAge(years, months, pensionType) {
  const age = years + (months || 0) / 12
  const options = pensionType === 'resident' ? [60, 65] : [50, 55, 58, 60, 63, 65]
  return options.reduce((best, cur) => (Math.abs(cur - age) < Math.abs(best - age) ? cur : best))
}

function attachDate(parts) {
  const date = partsToDate(parts)
  return {
    ...parts,
    ymd: formatYMD(parts.year, parts.month, parts.day),
    dateText: formatDateText(date),
    weekday: formatWeekday(date)
  }
}

function calculateRetireAge({ typeId, birthText, asOfText } = {}) {
  const person = getPersonType(typeId)
  const birth = parseYMD(birthText)
  if (!birth) {
    return { valid: false, message: '请选择出生年月' }
  }
  const asOfDate = parseYMD(asOfText) || parseYMD(todayYMD())
  const asOf = dateParts(asOfDate)
  if (compareParts(dateParts(birth), asOf) > 0) {
    return { valid: false, message: '出生日期不能晚于今天' }
  }

  const birthParts = dateParts(birth)
  const original = addCalendarMonths(birthParts.year, birthParts.month, 1, person.originalAge * 12)
  const delayMonths = delayMonthsOf(original.year, original.month, person.step, person.maxDelay)
  const retireParts = addCalendarMonths(
    birthParts.year,
    birthParts.month,
    birthParts.day,
    person.originalAge * 12 + delayMonths
  )
  const retire = attachDate(retireParts)
  const statutoryYears = person.originalAge + Math.floor(delayMonths / 12)
  const statutoryMonths = delayMonths % 12
  const contrib = minContributionOf(retire.year)
  const remainRaw = calendarDiff(asOf, retireParts)
  const elapsedRaw = calendarDiff(retireParts, asOf)
  const cmp = compareParts(asOf, retireParts)
  const status = cmp > 0 ? 'retired' : cmp === 0 ? 'today' : 'upcoming'
  const remain = status === 'upcoming' ? remainRaw : { years: 0, months: 0, days: 0 }
  const elapsed = status === 'retired' ? elapsedRaw : { years: 0, months: 0, days: 0 }
  const originalRetire = attachDate(
    addCalendarMonths(birthParts.year, birthParts.month, birthParts.day, person.originalAge * 12)
  )
  const pensionRetireAge = nearestPensionAge(statutoryYears, statutoryMonths, person.pensionType)

  let remainHero = formatSpanText(remain.years, remain.months, remain.days)
  let statusText = '距离法定退休'
  if (status === 'today') {
    remainHero = '就是今天'
    statusText = '今天到达法定退休年龄'
  } else if (status === 'retired') {
    remainHero = `已过 ${formatSpanText(elapsed.years, elapsed.months, elapsed.days)}`
    statusText = '已过法定退休年龄'
  }

  const delayText = delayMonths ? `较原法定年龄延迟 ${delayMonths} 个月` : '未涉及延迟，按原法定年龄退休'
  const birthDisplay = `${birthParts.year}年${birthParts.month}月`

  return {
    valid: true,
    typeId: person.id,
    typeName: person.name,
    typeKicker: person.kicker,
    typeHint: TYPE_HINTS[person.id] || '',
    pensionType: person.pensionType,
    pensionRetireAge,
    originalAge: person.originalAge,
    targetAge: person.targetAge,
    delayMonths,
    delayText,
    statutoryYears,
    statutoryMonths,
    statutoryText: formatAgeText(statutoryYears, statutoryMonths),
    birthText: formatDateText(birth),
    birthMonthText: birthDisplay,
    retireYmd: retire.ymd,
    retireText: retire.dateText,
    retireWeekday: retire.weekday,
    retireMonthText: formatMonthText(retire.year, retire.month),
    originalRetireText: originalRetire.dateText,
    originalRetireMonthText: formatMonthText(originalRetire.year, originalRetire.month),
    remain,
    remainText: formatSpanText(remain.years, remain.months, remain.days),
    remainHero,
    elapsed,
    elapsedText: formatSpanText(elapsed.years, elapsed.months, elapsed.days),
    status,
    statusText,
    contribYears: contrib.years,
    contribMonths: contrib.months,
    contribText: formatContributionText(contrib),
    contribHint:
      retire.year < MIN_CONTRIB_START_YEAR
        ? '按你的法定退休年份，仍按满 15 年可领。'
        : `从 2030 年起最低缴费年限逐年提高，按 ${retire.year} 年退休需缴满 ${formatContributionText(contrib)}。`,
    heroText: retire.dateText,
    heroSub: `${statusText} · ${remainHero}`,
    formulaText: `${person.name} · ${birthDisplay}`,
    tipText: TIP_TEXT,
    note:
      '对照 2025 年起渐进式延迟法定退休年龄办法，按出生年月计算法定退休时间。退休当天按你的出生日顺延到对应月份（当月没有该日则取月末）。未计入弹性提前或延迟，结果仅供参考。'
  }
}

module.exports = {
  PERSON_TYPES,
  TYPE_HINTS,
  TIP_TEXT,
  getPersonType,
  delayMonthsOf,
  minContributionOf,
  calculateRetireAge
}
