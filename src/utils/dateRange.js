/** Date-range helpers for admin inquiry filters. */

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/** Parse YYYY-MM-DD as local calendar date (avoids UTC timezone shift). */
function parseInputDate(str) {
  if (!str) return null
  const parts = String(str).split('-').map(Number)
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

export const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
]

export function getPresetRange(presetId, customStart, customEnd) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  switch (presetId) {
    case 'today':
      return { start: todayStart, end: todayEnd }
    case 'yesterday': {
      const y = new Date(todayStart)
      y.setDate(y.getDate() - 1)
      return { start: startOfDay(y), end: endOfDay(y) }
    }
    case 'last7': {
      const s = new Date(todayStart)
      s.setDate(s.getDate() - 6)
      return { start: s, end: todayEnd }
    }
    case 'last30': {
      const s = new Date(todayStart)
      s.setDate(s.getDate() - 29)
      return { start: s, end: todayEnd }
    }
    case 'thisMonth': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: startOfDay(s), end: todayEnd }
    }
    case 'lastMonth': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const e = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: startOfDay(s), end: endOfDay(e) }
    }
    case 'custom': {
      if (!customStart) return null
      const start = parseInputDate(customStart)
      if (!start) return null
      if (!customEnd) {
        return { start: startOfDay(start), end: endOfDay(start) }
      }
      const end = parseInputDate(customEnd)
      if (!end) return null
      const rangeStart = startOfDay(start)
      const rangeEnd = endOfDay(end)
      if (rangeStart.getTime() > rangeEnd.getTime()) {
        return { start: startOfDay(end), end: endOfDay(start) }
      }
      return { start: rangeStart, end: rangeEnd }
    }
    case 'all':
    default:
      return null
  }
}

export function formatRangeLabel(presetId, start, end) {
  if (presetId === 'all' || !start || !end) return 'All time'
  const fmt = (d) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export function inquiryInRange(createdAt, range) {
  if (!range) return true
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return false
  return t >= range.start.getTime() && t <= range.end.getTime()
}
