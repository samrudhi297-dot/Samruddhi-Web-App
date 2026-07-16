import { useEffect, useMemo, useRef, useState } from 'react'
import { DATE_PRESETS, formatRangeLabel, getPresetRange } from '../../utils/dateRange.js'

function pad(n) {
  return String(n).padStart(2, '0')
}

function toInputDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function CalendarMonth({ month, year, rangeStart, rangeEnd, onPick }) {
  const first = new Date(year, month, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  function dayClass(day) {
    if (!day) return 'admin-cal-day is-empty'
    const date = new Date(year, month, day)
    const t = date.getTime()
    let cls = 'admin-cal-day'
    if (rangeStart && t === startOfDay(rangeStart).getTime()) cls += ' is-start'
    if (rangeEnd && t === startOfDay(rangeEnd).getTime()) cls += ' is-end'
    if (rangeStart && rangeEnd && t > startOfDay(rangeStart).getTime() && t < startOfDay(rangeEnd).getTime()) {
      cls += ' is-between'
    }
    return cls
  }

  function startOfDay(d) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }

  return (
    <div className="admin-cal-month">
      <div className="admin-cal-month-title">{monthLabel}</div>
      <div className="admin-cal-weekdays">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="admin-cal-grid">
        {cells.map((day, i) => (
          <button
            key={i}
            type="button"
            className={dayClass(day)}
            disabled={!day}
            onClick={() => day && onPick(new Date(year, month, day))}
          >
            {day || ''}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DateRangeFilter({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [draftPreset, setDraftPreset] = useState(value?.preset || 'all')
  const [draftStart, setDraftStart] = useState(value?.customStart || '')
  const [draftEnd, setDraftEnd] = useState(value?.customEnd || '')
  const [pickStart, setPickStart] = useState(null)
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setDraftPreset(value?.preset || 'all')
    setDraftStart(value?.customStart || '')
    setDraftEnd(value?.customEnd || '')
    const r = getPresetRange(value?.preset || 'all', value?.customStart, value?.customEnd)
    setPickStart(r?.start || null)
  }, [open, value])

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const appliedRange = useMemo(
    () => getPresetRange(value?.preset || 'all', value?.customStart, value?.customEnd),
    [value],
  )

  const draftRange = useMemo(() => {
    if (draftPreset === 'custom' && pickStart) {
      const end = draftEnd ? new Date(draftEnd) : pickStart
      return { start: pickStart, end }
    }
    return getPresetRange(draftPreset, draftStart, draftEnd)
  }, [draftPreset, draftStart, draftEnd, pickStart])

  function handleDayPick(date) {
    if (draftPreset !== 'custom') setDraftPreset('custom')
    if (!pickStart || (pickStart && draftEnd)) {
      setPickStart(date)
      setDraftStart(toInputDate(date))
      setDraftEnd('')
    } else {
      const a = pickStart.getTime()
      const b = date.getTime()
      const start = a <= b ? pickStart : date
      const end = a <= b ? date : pickStart
      setPickStart(start)
      setDraftStart(toInputDate(start))
      setDraftEnd(toInputDate(end))
    }
  }

  function applyFilter(preset, start = '', end = '') {
    onChange({
      preset,
      customStart: preset === 'custom' ? start : '',
      customEnd: preset === 'custom' ? end : '',
    })
    setOpen(false)
  }

  function apply() {
    if (draftPreset === 'custom') {
      if (!draftStart) return
      applyFilter('custom', draftStart, draftEnd || draftStart)
      return
    }
    applyFilter(draftPreset)
  }

  function selectPreset(presetId) {
    setDraftPreset(presetId)
    if (presetId === 'custom') return
    const r = getPresetRange(presetId)
    setPickStart(r?.start || null)
    if (r) {
      setDraftStart(toInputDate(r.start))
      setDraftEnd(toInputDate(r.end))
    }
    // Apply immediately for presets (no extra Apply click needed).
    applyFilter(presetId)
  }

  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear

  return (
    <div className="admin-date-filter" ref={wrapRef}>
      <button type="button" className="admin-date-trigger" onClick={() => setOpen((o) => !o)}>
        <i className="far fa-calendar-alt" aria-hidden="true" />
        <span>{formatRangeLabel(value?.preset || 'all', appliedRange?.start, appliedRange?.end)}</span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="admin-date-popover">
          <div className="admin-date-popover-inner">
            <div className="admin-date-presets">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`admin-date-preset${draftPreset === p.id ? ' is-active' : ''}`}
                  onClick={() => selectPreset(p.id)}
                >
                  {p.label}
                  {draftPreset === p.id && <i className="fas fa-check" />}
                </button>
              ))}
            </div>

            <div className="admin-date-calendars">
              <div className="admin-cal-nav">
                <button
                  type="button"
                  className="admin-cal-nav-btn"
                  onClick={() => {
                    if (viewMonth === 0) {
                      setViewMonth(11)
                      setViewYear((y) => y - 1)
                    } else setViewMonth((m) => m - 1)
                  }}
                  aria-label="Previous month"
                >
                  <i className="fas fa-chevron-left" />
                </button>
                <button
                  type="button"
                  className="admin-cal-nav-btn"
                  onClick={() => {
                    if (viewMonth === 11) {
                      setViewMonth(0)
                      setViewYear((y) => y + 1)
                    } else setViewMonth((m) => m + 1)
                  }}
                  aria-label="Next month"
                >
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
              <CalendarMonth
                month={viewMonth}
                year={viewYear}
                rangeStart={draftRange?.start}
                rangeEnd={draftRange?.end}
                onPick={handleDayPick}
              />
              <CalendarMonth
                month={nextMonth}
                year={nextYear}
                rangeStart={draftRange?.start}
                rangeEnd={draftRange?.end}
                onPick={handleDayPick}
              />
            </div>
          </div>

          <div className="admin-date-footer">
            <span className="admin-date-hint">Select a range or preset</span>
            <div className="admin-date-footer-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={apply}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
