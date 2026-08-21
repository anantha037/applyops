import React from 'react'
import { Calendar as CalendarIcon, ArrowUpRight } from 'lucide-react'

const EVENT_DAYS = {}

export default function MiniCalendarCard({ onViewFullCalendar }) {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const currentDay = today.getDate()

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay()
  const startDayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // 0: Mon, 6: Sun

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = monthNames[currentMonth]

  return (
    <div className="panel rounded-2xl p-5 border border-border bg-surface shadow-xs h-full flex flex-col justify-between select-none">
      {/* Header with Title & Full Calendar Button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <span>Calendar</span>
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-secondary text-foreground-secondary">
            {monthName} {currentYear}
          </span>
        </div>

        <button
          onClick={() => {
            if (onViewFullCalendar) onViewFullCalendar()
            else window.location.hash = '#/calendar'
          }}
          className="text-[11px] font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-all duration-150 focus:outline-none group/link"
        >
          <span className="group-hover/link:underline">Full calendar</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
        </button>
      </div>

      {/* Mini Calendar Grid */}
      <div className="flex-1 flex flex-col justify-center my-1">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="text-[10px] font-bold text-foreground-secondary">
              {d}
            </span>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Empty Padding Cells before month start */}
          {Array.from({ length: startDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-7" />
          ))}

          {/* Days 1..31 */}
          {days.map((day) => {
            const isToday = day === currentDay
            const event = EVENT_DAYS[day]

            return (
              <div
                key={day}
                className={`relative h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                  isToday
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'text-foreground hover:bg-surface-secondary'
                }`}
                title={event ? `${day} ${monthName}: ${event.label}` : `${day} ${monthName}`}
              >
                <span>{day}</span>
                {event && !isToday && (
                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${event.color}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Full Calendar Redirect Button — Completely Borderless Clean Spacing */}
      <div className="mt-3 pt-1 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-foreground-secondary">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>3 events this week</span>
        </div>
        <button
          onClick={() => {
            if (onViewFullCalendar) onViewFullCalendar()
            else window.location.hash = '#/calendar'
          }}
          className="px-3 py-1.5 bg-surface-secondary hover:bg-primary hover:text-white text-[11px] font-bold text-foreground rounded-lg transition-all shadow-2xs active:scale-95 flex items-center gap-1.5"
        >
          <span>Open Full Calendar</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
