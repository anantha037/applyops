import { useEffect, useState, useCallback, useRef } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import {
  format, parse, startOfWeek, getDay,
  startOfMonth, addMonths, subMonths,
  addDays, startOfWeek as startOfWeekFn, isSameDay, isSameMonth,
  parseISO, isToday as isTodayFn, isValid
} from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { api, activityApi } from '../api/client'
import ActivityHeatmap from '../components/ActivityHeatmap'
import Dropdown from '../components/ui/Dropdown'
import {
  Plus, X, ChevronLeft, ChevronRight, RefreshCw,
  Calendar as CalendarIcon, Phone, Target, ClipboardList, Bell, Sparkles, Filter
} from 'lucide-react'

// ── Localizer ────────────────────────────────────────────────────────────────
const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

// ── Constants & Config ───────────────────────────────────────────────────────
const EVENT_TYPES = ['Follow-up', 'Interview', 'Application Deadline', 'Reminder', 'Personal']

const TYPE_CONFIG = {
  'Follow-up':            { color: '#6366F1', bg: 'rgba(99, 102, 241, 0.14)',  dotColor: '#818CF8', label: 'Follow-up',      Icon: Phone },
  'Interview':            { color: '#A855F7', bg: 'rgba(168, 85, 247, 0.14)',  dotColor: '#C084FC', label: 'Interview',       Icon: Target },
  'Application Deadline': { color: '#F97316', bg: 'rgba(249, 115, 22, 0.14)',  dotColor: '#FB923C', label: 'App Deadline',    Icon: ClipboardList },
  'Reminder':             { color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.14)',  dotColor: '#38BDF8', label: 'Reminder',        Icon: Bell },
  'Personal':             { color: '#10B981', bg: 'rgba(16, 185, 129, 0.14)',  dotColor: '#34D399', label: 'Personal',        Icon: Sparkles },
}

const CATEGORY_OPTIONS = [
  { label: 'All Events', value: 'All Events' },
  ...EVENT_TYPES.map(t => ({ label: t, value: t }))
]

const EVENT_MODAL_OPTIONS = EVENT_TYPES.map(t => ({ label: t, value: t }))

function safeParseDate(val) {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  try {
    const str = String(val)
    const d = str.includes('T') ? parseISO(str) : parseISO(str.split(' ')[0])
    return isValid(d) ? d : null
  } catch {
    return null
  }
}

function fmtDate(d) {
  const parsed = safeParseDate(d) || new Date()
  return format(parsed, 'yyyy-MM-dd')
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
  const parsedEventDates = eventDates.map(safeParseDate).filter(Boolean)

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrent(subMonths(current, 1))}
          className="rounded-lg p-1 text-foreground-secondary hover:bg-surface-secondary hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-foreground">{format(current, 'MMMM yyyy')}</span>
        <button
          onClick={() => setCurrent(addMonths(current, 1))}
          className="rounded-lg p-1 text-foreground-secondary hover:bg-surface-secondary hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {days.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-foreground-secondary/70 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          const isCurrentMonth = isSameMonth(cell, current)
          const isSelectedDay  = selected && isSameDay(cell, selected)
          const isToday        = isTodayFn(cell)
          const hasEvent       = parsedEventDates.some(ed => isSameDay(ed, cell))
          return (
            <button
              key={i}
              onClick={() => { onSelect(cell); setCurrent(cell) }}
              className={`
                relative flex flex-col items-center justify-center rounded-lg text-[11px] h-7 w-full font-semibold transition-all
                ${!isCurrentMonth ? 'text-muted/40' : 'text-foreground-secondary hover:bg-surface-secondary hover:text-foreground'}
                ${isSelectedDay ? '!bg-primary !text-white shadow-2xs' : ''}
                ${isToday && !isSelectedDay ? 'bg-primary/15 text-primary font-bold' : ''}
              `}
            >
              {format(cell, 'd')}
              {hasEvent && !isSelectedDay && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function UpcomingEvents({ events = [], loading = false, selectedDate }) {
  const [expandedId, setExpandedId] = useState(null)

  if (loading) {
    return (
      <div className="space-y-3 select-none">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-secondary/30 animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-surface-secondary flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 rounded bg-surface-secondary" />
              <div className="h-2 w-16 rounded bg-surface-secondary" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  let upcoming = [...events]
  if (selectedDate) {
    upcoming = upcoming.filter(ev => {
      const d = safeParseDate(ev.date)
      return d && isSameDay(d, selectedDate)
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  } else {
    upcoming = upcoming
      .filter(ev => {
        const d = safeParseDate(ev.date)
        if (!d) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return d >= today
      })
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(0, 5)
  }

  const groups = {}
  upcoming.forEach(ev => {
    const k = ev.date
    if (!groups[k]) groups[k] = []
    groups[k].push(ev)
  })

  if (upcoming.length === 0) {
    return <p className="text-xs text-muted text-center py-6">No upcoming events</p>
  }

  return (
    <div className="space-y-4 select-none">
      {Object.entries(groups).map(([dateStr, evs]) => {
        const d = safeParseDate(dateStr)
        const label = d && isTodayFn(d)
          ? `Today · ${format(d, 'EEE, d MMM')}`
          : d ? format(d, 'EEE, d MMM') : dateStr

        return (
          <div key={dateStr}>
            <p className="text-[10px] font-bold text-foreground-secondary/70 uppercase tracking-wider mb-2">{label}</p>
            <div className="space-y-2">
              {evs.map(ev => {
                const cfg = TYPE_CONFIG[ev.event_type] || TYPE_CONFIG['Personal']
                const TypeIcon = cfg.Icon
                const isExpanded = expandedId === ev.id
                return (
                  <div key={ev.id} className="flex flex-col rounded-xl bg-surface-secondary/40 hover:bg-surface-secondary/80 transition-colors group overflow-hidden">
                    <div 
                      className="flex items-center gap-2.5 p-2.5 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                        <TypeIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{ev.title}</p>
                        <p className="text-[10px] text-foreground-secondary font-medium">{ev.event_type} {ev.time ? `• ${ev.time}` : ''}</p>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-10 pb-3 text-[11px] text-foreground-secondary space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-200">
                        {ev.time && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-foreground">Time:</span>
                            <span>{ev.time}</span>
                          </div>
                        )}
                        {ev.event_type && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-foreground">Type:</span>
                            <span>{ev.event_type}</span>
                          </div>
                        )}
                        {ev.notes && (
                          <div className="flex gap-2 flex-col mt-1 bg-surface/50 p-2 rounded-lg border border-border/50">
                            <span className="font-semibold text-foreground">Notes</span>
                            <span className="whitespace-pre-wrap">{ev.notes}</span>
                          </div>
                        )}
                        {ev.related_application_id && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                window.location.hash = `#/applications`
                              }}
                              className="text-primary hover:underline font-semibold"
                            >
                              View related application &rarr;
                            </button>
                          </div>
                        )}
                      </div>
                    )}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-80 duration-150" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-2xl border border-transparent shadow-2xl w-full max-w-md overflow-hidden select-none">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Add Event</h3>
              <p className="text-[11px] text-foreground-secondary font-medium">Create a new calendar entry or reminder</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-foreground-secondary hover:text-foreground hover:bg-surface-secondary/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          {error && <p className="text-xs text-rose-400 bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Title *</label>
            <input
              required
              placeholder="Event title…"
              className="w-full rounded-xl border border-transparent bg-surface-secondary text-foreground placeholder:text-muted/70 px-3.5 py-2.5 text-xs focus:bg-surface-tertiary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Type *</label>
              <Dropdown
                options={EVENT_MODAL_OPTIONS}
                value={form.event_type}
                onChange={val => setForm({ ...form, event_type: val })}
                className="w-full"
                align="left"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Date *</label>
              <input
                type="date"
                required
                className="w-full rounded-xl border border-transparent bg-surface-secondary text-foreground px-3.5 py-2.5 text-xs focus:bg-surface-tertiary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Time (optional)</label>
            <input
              type="time"
              className="w-full rounded-xl border border-transparent bg-surface-secondary text-foreground px-3.5 py-2.5 text-xs focus:bg-surface-tertiary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              value={form.time}
              onChange={e => setForm({ ...form, time: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes…"
              className="w-full rounded-xl border border-transparent bg-surface-secondary text-foreground placeholder:text-muted/70 px-3.5 py-2.5 text-xs focus:bg-surface-tertiary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all resize-none"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-foreground-secondary hover:bg-surface-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-all shadow-2xs active:scale-95"
            >
              {saving ? 'Saving…' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EventPill({ event }) {
  const isTask = event.resource?.isNextActionTask
  const isCompleted = event.resource?.completed
  const cfg = isTask 
    ? { color: '#38BDF8', bg: 'rgba(14, 165, 233, 0.14)', dotColor: '#38BDF8' }
    : (TYPE_CONFIG[event.resource?.event_type] || TYPE_CONFIG['Personal'])

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold truncate h-full transition-all hover:opacity-90 shadow-2xs ${isCompleted ? 'opacity-50 line-through' : ''}`}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dotColor }} />
      {event.resource?.time && <span className="font-semibold opacity-75 flex-shrink-0">{event.resource.time}</span>}
      <span className="truncate">{event.title}</span>
    </div>
  )
}

// ── Main Calendar Page Component ─────────────────────────────────────────────
export default function Calendar() {
  const [events, setEvents]             = useState([])
  const [view, setView]                 = useState('month')
  const [date, setDate]                 = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('All Events')
  const [showModal, setShowModal]       = useState(false)
  const [modalDate, setModalDate]       = useState(null)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [streakData, setStreakData]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, sData] = await Promise.all([
        api.calendarEvents(),
        activityApi.getStreak()
      ])
      setStreakData(sData)
      const normalized = (data || []).map(ev => {
        const dStr = ev.date || (ev.start ? String(ev.start).split('T')[0] : null) || fmtDate(new Date())
        const tStr = ev.event_type || ev.type || 'Reminder'
        const tmStr = ev.time || (ev.start && String(ev.start).includes('T') ? String(ev.start).split('T')[1].slice(0, 5) : '')
        return {
          ...ev,
          date: dStr,
          event_type: tStr,
          time: tmStr,
        }
      })
      setEvents(normalized)
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

  const filteredEvents = events.filter(ev => selectedCategory === 'All Events' || ev.event_type === selectedCategory)

  const rbcEvents = filteredEvents.map(ev => {
    const d = safeParseDate(ev.date) || new Date()
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

  const goToToday  = () => { setDate(new Date()); setSelectedDate(null) }
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
      : view === 'day'
        ? format(date, 'EEEE, MMMM d, yyyy')
        : 'Agenda Schedule'

  const eventStyleGetter = rbcEv => {
    const cfg = TYPE_CONFIG[rbcEv.resource?.event_type] || TYPE_CONFIG['Personal']
    return {
      style: {
        backgroundColor: cfg.bg,
        color:           cfg.color,
        border:          'none',
        borderRadius:    '8px',
        padding:         '2px',
      }
    }
  }

  const dayStyleGetter = d => ({
    style: isSameDay(d, selectedDate)
      ? { backgroundColor: 'rgba(99, 102, 241, 0.08)' }
      : {}
  })

  return (
    <section className="animate-fade-in pb-10 select-none max-w-full">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Calendar & Schedule</h2>
          <p className="mt-0.5 text-xs font-medium text-foreground-secondary">
            Plan your follow-ups, interviews, and reminders.
          </p>
        </div>
        <button
          onClick={() => { setModalDate(new Date()); setShowModal(true) }}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-all shadow-2xs active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Event</span>
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-rose-500/10 p-3 text-xs font-medium text-rose-400 border border-rose-500/20">{error}</p>
      )}

      {loading ? (
        <div className="space-y-6 animate-pulse select-none max-w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
            <div className="lg:col-span-8 flex flex-col min-w-0">
              <div className="panel rounded-2xl border border-transparent bg-surface p-5 shadow-2xs h-[600px] flex flex-col justify-between">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-16 rounded-xl bg-surface-secondary" />
                    <div className="h-8 w-16 rounded-xl bg-surface-secondary" />
                    <div className="h-8 w-28 rounded-xl bg-surface-secondary" />
                  </div>
                  <div className="h-5 w-32 rounded bg-surface-secondary" />
                  <div className="h-8 w-36 rounded-xl bg-surface-secondary" />
                </div>
                <div className="flex-1 rounded-xl bg-surface-secondary/20 mt-5 mb-2" />
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="panel rounded-2xl border border-transparent bg-surface p-4 shadow-2xs h-[240px] flex flex-col justify-between">
                <div className="flex justify-between items-center mb-3">
                  <div className="h-4 w-6 rounded bg-surface-secondary" />
                  <div className="h-4 w-24 rounded bg-surface-secondary" />
                  <div className="h-4 w-6 rounded bg-surface-secondary" />
                </div>
                <div className="grid grid-cols-7 gap-2 flex-1 pt-2">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div key={i} className="h-6 w-full rounded bg-surface-secondary/40" />
                  ))}
                </div>
              </div>

              <div className="panel rounded-2xl border border-transparent bg-surface p-4 shadow-2xs flex-1 min-h-[320px] flex flex-col gap-3">
                <div className="h-4 w-28 rounded bg-surface-secondary mb-2" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-secondary/30">
                    <div className="w-7 h-7 rounded-lg bg-surface-secondary" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 rounded bg-surface-secondary" />
                      <div className="h-2 w-20 rounded bg-surface-secondary" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Calendar Main Section (Top) ────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
            {/* Center Main Calendar (Prominent 8 Columns) */}
            <div className="lg:col-span-8 flex flex-col min-w-0">
              <div className="panel rounded-2xl border border-transparent bg-surface p-5 shadow-2xs flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <button onClick={goToToday} className="rounded-xl bg-surface-secondary px-3 py-2 text-xs font-bold text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary transition-colors">
                      Today
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={goPrev} className="rounded-xl bg-surface-secondary p-2 text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={goNext} className="rounded-xl bg-surface-secondary p-2 text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 ml-1">
                      <Dropdown
                        prefix="Filter"
                        options={CATEGORY_OPTIONS}
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        align="left"
                      />
                      {selectedCategory !== 'All Events' && (
                        <button
                          onClick={() => setSelectedCategory('All Events')}
                          className="text-xs font-semibold text-primary hover:underline px-1 py-1 focus:outline-none"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-foreground tracking-tight">{headerLabel}</h3>

                  <div className="flex items-center gap-2">
                    <div className="flex rounded-xl bg-surface-secondary p-1">
                      {['month', 'week', 'day', 'agenda'].map(v => (
                        <button
                          key={v}
                          onClick={() => setView(v)}
                          className={`px-3 py-1 text-xs font-bold capitalize rounded-lg transition-all ${
                            view === v
                              ? 'bg-surface text-primary shadow-2xs'
                              : 'text-foreground-secondary hover:text-foreground'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <button onClick={load} className="rounded-xl bg-surface-secondary p-2 text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary transition-colors">
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-[520px] rbc-wrapper">
                  <BigCalendar
                    toolbar={false}
                    localizer={localizer}
                    events={rbcEvents}
                    view={view}
                    date={date}
                    onView={setView}
                    onNavigate={setDate}
                    onSelectSlot={({ start }) => {
                      if (selectedDate && isSameDay(start, selectedDate)) {
                        setSelectedDate(null)
                      } else {
                        setSelectedDate(start)
                        setDate(start)
                      }
                    }}
                    onSelectEvent={ev => {
                      if (selectedDate && isSameDay(ev.start, selectedDate)) {
                        setSelectedDate(null)
                      } else {
                        setSelectedDate(ev.start)
                        setDate(ev.start)
                      }
                    }}
                    selectable
                    popup
                    eventPropGetter={eventStyleGetter}
                    dayPropGetter={dayStyleGetter}
                    components={{ event: EventPill }}
                    style={{ height: '100%', minHeight: '520px' }}
                    formats={{
                      weekdayFormat: (d, culture, loc) => loc.format(d, 'EEE', culture),
                      dayFormat: (d, culture, loc) => loc.format(d, 'EEE d', culture),
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Sidebar (4 Columns) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="panel rounded-2xl border border-transparent bg-surface p-4 shadow-2xs">
                <MiniCalendar
                  selected={selectedDate}
                  onSelect={d => {
                    if (selectedDate && isSameDay(d, selectedDate)) {
                      setSelectedDate(null)
                    } else {
                      setSelectedDate(d)
                      setDate(d)
                    }
                  }}
                  eventDates={eventDates}
                />
              </div>

              <div className="panel rounded-2xl border border-transparent bg-surface p-4 shadow-2xs flex-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-foreground-secondary/80 uppercase tracking-wider">
                    {selectedDate ? `Events on ${format(selectedDate, 'MMM d')}` : 'Upcoming Events'}
                  </p>
                  <div className="flex items-center gap-2">
                    {selectedDate && (
                      <button onClick={() => setSelectedDate(null)} className="text-[10px] text-muted hover:text-foreground font-bold focus:outline-none">
                        Clear
                      </button>
                    )}
                    <button
                      onClick={() => { setModalDate(selectedDate || new Date()); setShowModal(true) }}
                      className="text-[10px] text-primary hover:underline font-bold"
                    >
                      + Add
                    </button>
                  </div>
                </div>
                <UpcomingEvents events={filteredEvents} selectedDate={selectedDate} />
              </div>
            </div>
          </div>

          {/* ── Streak Activity Heatmap (Bottom) ───────────────────────────── */}
          <div className="mt-6">
            <ActivityHeatmap data={streakData} />
          </div>
        </>
      )}

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
