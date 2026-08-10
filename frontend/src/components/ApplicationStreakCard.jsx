import React, { useState, useRef } from 'react'
import { Flame, ArrowRight } from 'lucide-react'
import { generateMockStreakData } from '../api/streakMockData'
import { format, parseISO } from 'date-fns'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function intensityClass(total) {
  if (total === 0) return 'bg-surface-tertiary/40'
  if (total === 1) return 'bg-emerald-500/20 text-emerald-400'
  if (total <= 3) return 'bg-emerald-500/45 text-white/90 font-medium'
  if (total <= 5) return 'bg-emerald-500/75 text-white font-semibold'
  return 'bg-emerald-500 text-white font-extrabold shadow-2xs'
}

function dateTextClass(total) {
  if (total === 0) return 'text-muted/60'
  if (total === 1) return 'text-emerald-400'
  return 'text-white'
}

export default function ApplicationStreakCard({ data: propData, onViewHistory }) {
  const [hovered, setHovered] = useState(null)
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 })
  const cardRef = useRef(null)
  const cellMap = useRef({})

  const d = propData || generateMockStreakData()
  const {
    currentStreak = 0,
    bestStreak = 0,
    totalApplications = 0,
    activeDays = 0,
    todayCompleted = true,
    last14Days = [],
  } = d

  const week1 = last14Days.slice(0, 7)
  const week2 = last14Days.slice(7, 14)

  const motivationalCopy = () => {
    if (currentStreak === 0) return 'Start your streak today'
    if (!todayCompleted) return 'Keep it alive today'
    if (currentStreak >= 7) return "You're building momentum"
    if (currentStreak >= 3) return 'Keep the momentum going'
    return 'Nice start — keep it going'
  }

  const enter = (day, key) => {
    setHovered(day)
    const cell = cellMap.current[key]
    const card = cardRef.current
    if (cell && card) {
      const cr = cell.getBoundingClientRect()
      const pr = card.getBoundingClientRect()
      setTipPos({
        x: cr.left - pr.left + cr.width / 2,
        y: cr.top - pr.top,
      })
    }
  }

  const navigate = () => {
    if (onViewHistory) onViewHistory()
    else window.location.hash = '#/calendar'
  }

  const renderCell = (day, key) => {
    const dayNum = format(parseISO(day.date), 'd')
    return (
      <div
        key={day.date}
        ref={el => { cellMap.current[key] = el }}
        className="relative"
        onMouseEnter={() => enter(day, key)}
        onMouseLeave={() => setHovered(null)}
        onFocus={() => enter(day, key)}
        onBlur={() => setHovered(null)}
        tabIndex={0}
        role="gridcell"
        aria-label={`${day.displayDate}: ${day.total} activities`}
      >
        <div
          className={`
            w-full aspect-square rounded-[5px] flex items-center justify-center
            transition-colors duration-75 cursor-default
            ${intensityClass(day.total)}
            ${day.isToday ? 'ring-[1.5px] ring-foreground/40 ring-offset-1 ring-offset-surface' : ''}
            hover:opacity-80
          `}
        >
          <span className={`text-[9px] leading-none select-none ${dateTextClass(day.total)}`}>
            {dayNum}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      className="panel rounded-2xl px-5 py-5 border border-border bg-surface shadow-xs flex flex-col select-none relative overflow-visible"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-foreground-secondary tracking-tight">
            Application Streak
          </span>
        </div>
        {bestStreak > 0 && (
          <span className="text-[10px] font-medium text-muted tabular-nums">
            Best {bestStreak}d
          </span>
        )}
      </div>

      <div className="mb-1">
        <span className="text-[2.25rem] font-extrabold text-foreground leading-none tracking-tight tabular-nums">
          {currentStreak}
        </span>
        <span className="ml-2 text-xs font-semibold uppercase tracking-widest text-foreground-secondary/80">
          day streak
        </span>
      </div>

      <p className="text-[11px] font-medium text-muted mb-5 flex items-center gap-1.5">
        {motivationalCopy()}
        {!todayCompleted && (
          <span className="inline-block w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
        )}
      </p>

      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[10px] font-medium text-foreground-secondary">
          14-day activity
        </span>
        <span className="text-[10px] text-muted tabular-nums">
          {totalApplications} apps · {activeDays} active
        </span>
      </div>

      <div role="grid" aria-label="14-day activity heatmap">
        <div className="grid grid-cols-7 gap-[5px] mb-[3px]" role="row">
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="flex items-center justify-center">
              <span className="text-[8px] font-semibold text-muted/70 uppercase">{l}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-[5px]" role="row">
          {week1.map((day, i) => renderCell(day, `a${i}`))}
        </div>

        <div className="grid grid-cols-7 gap-[5px] mt-[5px]" role="row">
          {week2.map((day, i) => renderCell(day, `b${i}`))}
        </div>
      </div>

      {hovered && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: `${tipPos.x}px`,
            top: `${tipPos.y - 6}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-foreground text-background rounded-lg shadow-lg py-1.5 px-2.5 min-w-[120px]">
            <p className="text-[10px] font-bold mb-0.5">{hovered.displayDate}</p>
            <div className="space-y-px text-[9px] text-background/70">
              {hovered.applications > 0 && (
                <div className="flex justify-between gap-3">
                  <span>Applications</span>
                  <span className="font-semibold text-background">{hovered.applications}</span>
                </div>
              )}
              {hovered.followUps > 0 && (
                <div className="flex justify-between gap-3">
                  <span>Follow-ups</span>
                  <span className="font-semibold text-background">{hovered.followUps}</span>
                </div>
              )}
              {hovered.interviews > 0 && (
                <div className="flex justify-between gap-3">
                  <span>Interviews</span>
                  <span className="font-semibold text-background">{hovered.interviews}</span>
                </div>
              )}
              {hovered.recruiterCalls > 0 && (
                <div className="flex justify-between gap-3">
                  <span>Calls</span>
                  <span className="font-semibold text-background">{hovered.recruiterCalls}</span>
                </div>
              )}
              {hovered.total === 0 && (
                <span className="text-background/50">No activity</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-[3px]">
          <span className="text-[8px] font-medium text-muted mr-0.5">Less</span>
          <div className="w-[9px] h-[9px] rounded-[2px] bg-surface-tertiary/40" />
          <div className="w-[9px] h-[9px] rounded-[2px] bg-emerald-500/20" />
          <div className="w-[9px] h-[9px] rounded-[2px] bg-emerald-500/45" />
          <div className="w-[9px] h-[9px] rounded-[2px] bg-emerald-500/75" />
          <div className="w-[9px] h-[9px] rounded-[2px] bg-emerald-500" />
          <span className="text-[8px] font-medium text-muted ml-0.5">More</span>
        </div>

        <button
          onClick={navigate}
          className="group flex items-center gap-0.5 text-[10px] font-medium text-muted hover:text-primary transition-colors focus:outline-none focus-visible:underline"
        >
          View activity history
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
