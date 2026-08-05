import { useEffect, useRef, useState, useCallback } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import {
  format, parse, startOfWeek, getDay,
  startOfMonth, endOfMonth, addMonths, subMonths,
  addDays, startOfWeek as startOfWeekFn, isSameDay, isSameMonth,
  parseISO, isToday as isTodayFn,
} from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { api } from '../api/client'

// ── Localizer ────────────────────────────────────────────────────────────────
const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

// ── Constants ────────────────────────────────────────────────────────────────
const EVENT_TYPES = ['Follow-up', 'Interview', 'Application Deadline', 'Reminder', 'Personal']

const TYPE_CONFIG = {
  'Follow-up':            { color: '#6366f1', bg: '#eef2ff', label: 'Follow-up',      icon: '📞' },
  'Interview':            { color: '#8b5cf6', bg: '#f5f3ff', label: 'Interview',       icon: '🎯' },
  'Application Deadline': { color: '#f97316', bg: '#fff7ed', label: 'App Deadline',    icon: '📋' },
  'Reminder':             { color: '#0ea5e9', bg: '#f0f9ff', label: 'Reminder',        icon: '🔔' },
  'Personal':             { color: '#10b981', bg: '#f0fdf4', label: 'Personal',        icon: '✨' },
}

const METHODS = ['LinkedIn Easy Apply', 'Company Website', 'Indeed', 'Email', 'Referral', 'Cold Call', 'Other']

function fmtDate(d) {
  return format(d instanceof Date ? d : parseISO(d), 'yyyy-MM-dd')
}

// ── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ selected, onSelect, eventDates = [] }) {
  const [current, setCurrent] = useState(selected || new Date())

  const start = startOfWeekFn(startOfMonth(current), { weekStartsOn: 1 })
  const cells = []
  let day = start
  for (let i = 0; i < 42; i++) {
    cells.push(day)
    day = addDays(day, 1)
  }

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCurrent(subMonths(current, 1))} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span className="text-xs font-semibold text-gray-700">{format(current, 'MMMM yyyy')}</span>
        <button onClick={() => setCurrent(addMonths(current, 1))} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {days.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          const isCurrentMonth = isSameMonth(cell, current)
          const isSelectedDay  = selected && isSameDay(cell, selected)
          const isToday        = isTodayFn(cell)
          const hasEvent       = eventDates.some(ed => isSameDay(parseISO(ed), cell))
          return (
            <button
              key={i}
              onClick={() => { onSelect(cell); setCurrent(cell) }}
              className={`
                relative flex flex-col items-center justify-center rounded-lg text-[11px] h-7 w-full font-medium transition-colors
                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}
                ${isSelectedDay ? '!bg-indigo-600 !text-white' : ''}
                ${isToday && !isSelectedDay ? 'bg-indigo-100 text-indigo-700 font-bold' : ''}
              `}
            >
              {format(cell, 'd')}
              {hasEvent && !isSelectedDay && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-indigo-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Upcoming Events list ─────────────────────────────────────────────────────
function UpcomingEvents({ events }) {
  const upcoming = [...events]
    .filter(ev => {
      const d = parseISO(ev.date)
      return d >= new Date(new Date().setHours(0, 0, 0, 0))
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)

  // Group by date
  const groups = {}
  upcoming.forEach(ev => {
    if (!groups[ev.date]) groups[ev.date] = []
    groups[ev.date].push(ev)
  })

  if (upcoming.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-4">No upcoming events</p>
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([date, evs]) => {
        const d = parseISO(date)
        const label = isTodayFn(d)
          ? `Today · ${format(d, 'EEE, d MMM')}`
          : format(d, 'EEE, d MMM')
        return (
          <div key={date}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
            <div className="space-y-2">
              {evs.map(ev => {
                const cfg = TYPE_CONFIG[ev.event_type] || TYPE_CONFIG['Personal']
                return (
                  <div key={ev.id} className="flex items-start gap-2.5 group">
                    <div className="mt-0.5 text-[10px] font-bold text-gray-400 w-12 flex-shrink-0 text-right">
                      {ev.time || '—'}
                    </div>
                    <div className="w-0.5 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{ev.title}</p>
                      <p className="text-[10px] text-gray-400">{ev.event_type}</p>
                    </div>
                    <span className="text-sm flex-shrink-0">{cfg.icon}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Add Event Modal ──────────────────────────────────────────────────────────
function AddEventModal({ defaultDate, onSave, onClose }) {
  const [form, setForm] = useState({
    title: '',
    event_type: 'Reminder',
    date: defaultDate ? fmtDate(defaultDate) : fmtDate(new Date()),
    time: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ ...form, time: form.time || null })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Add Event</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title *</label>
            <input required className="light-field text-sm" placeholder="Event title…" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type *</label>
              <select className="light-field text-sm" value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })}>
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date *</label>
              <input type="date" required className="light-field text-sm" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Time (optional)</label>
            <input type="time" className="light-field text-sm" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
            <textarea rows={2} className="light-field text-sm resize-none" placeholder="Optional notes…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Save event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Custom RBC event wrapper ─────────────────────────────────────────────────
function EventPill({ event }) {
  const cfg = TYPE_CONFIG[event.resource?.event_type] || TYPE_CONFIG['Personal']
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold truncate h-full"
      style={{ backgroundColor: cfg.bg, color: cfg.color, borderLeft: `2.5px solid ${cfg.color}` }}
    >
      {event.resource?.time && <span className="font-normal opacity-70 flex-shrink-0">{event.resource.time}</span>}
      <span className="truncate">{event.title}</span>
    </div>
  )
}

// ── Main Calendar page ───────────────────────────────────────────────────────
export default function Calendar() {
  const [events, setEvents]       = useState([])
  const [view, setView]           = useState('month')    // month | week | day
  const [date, setDate]           = useState(new Date()) // currently-displayed date
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeTypes, setActiveTypes]   = useState(new Set(EVENT_TYPES))
  const [showModal, setShowModal] = useState(false)
  const [modalDate, setModalDate] = useState(null)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.calendarEvents()
      setEvents(data)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const saveEvent = async payload => {
    await api.createCalendarEvent(payload)
    await load()
  }

  // Filter by active types
  const filteredEvents = events.filter(ev => activeTypes.has(ev.event_type))

  // Convert to react-big-calendar format
  const rbcEvents = filteredEvents.map(ev => {
    const d = parseISO(ev.date)
    return {
      id:       ev.id,
      title:    ev.title,
      start:    d,
      end:      d,
      allDay:   true,
      resource: ev,
    }
  })

  const eventDates = events.map(ev => ev.date)

  const toggleType = type => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const goToToday  = () => { setDate(new Date()); setSelectedDate(new Date()) }
  const goPrev     = () => {
    if (view === 'month')  setDate(subMonths(date, 1))
    else if (view === 'week') setDate(addDays(date, -7))
    else setDate(addDays(date, -1))
  }
  const goNext     = () => {
    if (view === 'month')  setDate(addMonths(date, 1))
    else if (view === 'week') setDate(addDays(date, 7))
    else setDate(addDays(date, 1))
  }

  const headerLabel = view === 'month'
    ? format(date, 'MMMM yyyy')
    : view === 'week'
      ? `${format(startOfWeekFn(date, { weekStartsOn: 1 }), 'MMM d')} – ${format(addDays(startOfWeekFn(date, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}`
      : format(date, 'EEEE, MMMM d, yyyy')

  // RBC event style getter
  const eventStyleGetter = rbcEv => {
    const cfg = TYPE_CONFIG[rbcEv.resource?.event_type] || TYPE_CONFIG['Personal']
    return {
      style: {
        backgroundColor: cfg.bg,
        color:           cfg.color,
        border:          `1px solid ${cfg.color}30`,
        borderLeft:      `3px solid ${cfg.color}`,
        borderRadius:    '6px',
        fontSize:        '11px',
        fontWeight:      600,
        padding:         '1px 5px',
      }
    }
  }

  const dayStyleGetter = d => ({
    style: isSameDay(d, selectedDate)
      ? { backgroundColor: '#eef2ff' }
      : {}
  })

  return (
    <section className="h-full pb-4">
      {/* Page header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
          <p className="mt-1 text-sm text-gray-500">Plan your follow-ups and never miss an opportunity.</p>
        </div>
        <button
          onClick={() => { setModalDate(new Date()); setShowModal(true) }}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5v14"/></svg>
          Add Event
        </button>
      </div>

      {error && <p className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-600">{error}</p>}

      <div className="flex gap-5 h-[calc(100vh-200px)] min-h-[600px]">
        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Mini calendar */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <MiniCalendar
              selected={selectedDate}
              onSelect={d => { setSelectedDate(d); setDate(d) }}
              eventDates={eventDates}
            />
          </div>

          {/* Type filters */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Calendars</p>
              <button onClick={() => setActiveTypes(new Set(EVENT_TYPES))} className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">All</button>
            </div>
            <div className="space-y-2">
              {EVENT_TYPES.map(type => {
                const cfg = TYPE_CONFIG[type]
                const active = activeTypes.has(type)
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className="flex items-center gap-2.5 w-full text-left group"
                  >
                    <div
                      className="h-4 w-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        backgroundColor: active ? cfg.color : 'transparent',
                        border: `2px solid ${cfg.color}`,
                      }}
                    >
                      {active && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6 9 17l-5-5"/></svg>
                      )}
                    </div>
                    <span className={`text-xs font-medium transition-colors ${active ? 'text-gray-700' : 'text-gray-400'}`}>{type}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Main calendar ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-0 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {['month', 'week', 'day'].map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      view === v
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Nav */}
              <button onClick={goPrev} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 shadow-sm transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button onClick={goNext} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 shadow-sm transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button onClick={goToday} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">Today</button>
            </div>

            <h3 className="text-base font-bold text-gray-800">{headerLabel}</h3>

            <div className="flex items-center gap-2">
              {loading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
              <button onClick={load} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 shadow-sm transition-colors">
                Refresh ↻
              </button>
            </div>
          </div>

          {/* The calendar itself */}
          <div className="flex-1 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden rbc-wrapper">
            <BigCalendar
              localizer={localizer}
              events={rbcEvents}
              view={view}
              date={date}
              onView={setView}
              onNavigate={setDate}
              onSelectSlot={({ start }) => { setModalDate(start); setShowModal(true) }}
              onSelectEvent={ev => { setSelectedDate(ev.start); setDate(ev.start) }}
              selectable
              popup
              eventPropGetter={eventStyleGetter}
              dayPropGetter={dayStyleGetter}
              components={{ event: EventPill }}
              style={{ height: '100%' }}
              formats={{
                weekdayFormat: (d, culture, loc) => loc.format(d, 'EEE', culture),
                dayFormat: (d, culture, loc) => loc.format(d, 'EEE d', culture),
              }}
            />
          </div>
        </div>

        {/* ── Right sidebar: upcoming events ─────────────────────────────── */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Upcoming Events</p>
              <button className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">View all</button>
            </div>
            <UpcomingEvents events={filteredEvents} />
            <button
              onClick={() => { setModalDate(new Date()); setShowModal(true) }}
              className="mt-4 flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5v14"/></svg>
              Add Reminder
            </button>
          </div>

          {/* Legend */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Legend</p>
            <div className="space-y-2">
              {EVENT_TYPES.map(type => {
                const cfg = TYPE_CONFIG[type]
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-sm">{cfg.icon}</span>
                    <span className="text-xs text-gray-600 font-medium">{type}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add event modal */}
      {showModal && (
        <AddEventModal
          defaultDate={modalDate}
          onSave={saveEvent}
          onClose={() => setShowModal(false)}
        />
      )}
    </section>
  )
}
