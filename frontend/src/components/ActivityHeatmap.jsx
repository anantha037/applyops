import React, { useState, useRef } from 'react'
import { Flame, Calendar, CheckCircle2, Award, Filter } from 'lucide-react'
import { generateMockStreakData } from '../api/streakMockData'

const RANGE_OPTIONS = [
  { label: '7 Days', value: 7 },
  { label: '14 Days', value: 14 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
]

const TYPE_OPTIONS = [
  { label: 'All Activity', value: 'all' },
  { label: 'Applications', value: 'applications' },
  { label: 'Follow-ups', value: 'followUps' },
  { label: 'Interviews', value: 'interviews' },
  { label: 'Recruiter Calls', value: 'recruiterCalls' },
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ActivityHeatmap({ data: propData }) {
  const streakData = propData || generateMockStreakData()
  const [rangeDays, setRangeDays] = useState(30)
  const [selectedType, setSelectedType] = useState('all')
  const [hoveredCell, setHoveredCell] = useState(null)
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const cellMap = useRef({})

  const {
    currentStreak = 7,
    bestStreak = 14,
    allDays = [],
  } = streakData

  const slicedDays = allDays.slice(-rangeDays)

  const getFilteredCount = (dayObj) => {
    if (!dayObj) return 0
    if (selectedType === 'all') return dayObj.total
    return dayObj[selectedType] || 0
  }

  const filteredTotalApps = slicedDays.reduce((acc, d) => acc + d.applications, 0)
  const filteredActiveDays = slicedDays.filter(d => getFilteredCount(d) > 0).length

  const getIntensityClass = (count, isToday) => {
    let base = ''
    if (count === 0) {
      base = 'bg-surface-secondary/40 text-muted/60'
    } else if (count === 1) {
      base = 'bg-emerald-500/20 text-emerald-400 font-bold'
    } else if (count <= 3) {
      base = 'bg-emerald-500/45 text-white font-bold'
    } else if (count <= 5) {
      base = 'bg-emerald-500/75 text-white font-extrabold shadow-2xs'
    } else {
      base = 'bg-emerald-500 text-white font-extrabold shadow-2xs'
    }

    if (isToday) {
      return `${base} ring-2 ring-primary/50 ring-offset-2 ring-offset-surface`
    }
    return base
  }

  const handleCellHover = (item, idx) => {
    setHoveredCell(item)
    const cellEl = cellMap.current[idx]
    const containerEl = containerRef.current
    if (cellEl && containerEl) {
      const cr = cellEl.getBoundingClientRect()
      const pr = containerEl.getBoundingClientRect()
      setTipPos({
        x: cr.left - pr.left + cr.width / 2,
        y: cr.top - pr.top,
      })
    }
  }

  const firstDateStr = slicedDays[0]?.date
  let emptyPaddingCount = 0
  if (firstDateStr) {
    const firstDate = new Date(firstDateStr)
    const dayOfWeek = firstDate.getDay()
    emptyPaddingCount = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  }

  const paddedCells = [
    ...Array.from({ length: emptyPaddingCount }).map(() => null),
    ...slicedDays,
  ]

  const activeTypeName = TYPE_OPTIONS.find(t => t.value === selectedType)?.label || 'All Activity'

  return (
    <div ref={containerRef} className="panel rounded-2xl border border-transparent bg-surface shadow-2xs p-6 select-none mb-6 relative overflow-visible">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl p-4 bg-surface-secondary/30 flex flex-col justify-between h-[100px] border border-transparent transition-all duration-200 hover:bg-surface-secondary/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary/70">Current Streak</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
              <Flame className="w-3.5 h-3.5 fill-amber-500/20 text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground tracking-tight">🔥 {currentStreak} days</p>
        </div>

        <div className="rounded-2xl p-4 bg-surface-secondary/30 flex flex-col justify-between h-[100px] border border-transparent transition-all duration-200 hover:bg-surface-secondary/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary/70">Applications ({rangeDays}d)</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Calendar className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground tracking-tight">{filteredTotalApps}</p>
        </div>

        <div className="rounded-2xl p-4 bg-surface-secondary/30 flex flex-col justify-between h-[100px] border border-transparent transition-all duration-200 hover:bg-surface-secondary/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary/70">Active Days</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground tracking-tight">{filteredActiveDays} / {rangeDays}</p>
        </div>

        <div className="rounded-2xl p-4 bg-surface-secondary/30 flex flex-col justify-between h-[100px] border border-transparent transition-all duration-200 hover:bg-surface-secondary/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary/70">Best Streak</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
              <Award className="w-3.5 h-3.5 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground tracking-tight">{bestStreak} days</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-xs font-bold text-foreground-secondary mr-1">Activity</span>
          <div className="flex rounded-xl bg-surface-secondary p-1 flex-wrap sm:flex-nowrap gap-0.5">
            {TYPE_OPTIONS.map(opt => {
              const isActive = selectedType === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelectedType(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none ${
                    isActive
                      ? 'bg-surface text-primary shadow-2xs'
                      : 'text-foreground-secondary hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-foreground-secondary mr-1">Period</span>
          <div className="flex rounded-xl bg-surface-secondary p-1 gap-0.5">
            {RANGE_OPTIONS.map(opt => {
              const isActive = rangeDays === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setRangeDays(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none ${
                    isActive
                      ? 'bg-surface text-foreground shadow-2xs'
                      : 'text-foreground-secondary hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="relative mb-6">
        <div className="grid grid-cols-7 gap-2 sm:gap-2.5 mb-2">
          {WEEKDAYS.map((w, idx) => (
            <div key={idx} className="text-center text-[11px] font-bold text-foreground-secondary/70 uppercase tracking-wider py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
          {paddedCells.map((item, idx) => {
            if (!item) {
              return <div key={`pad-${idx}`} className="h-10 sm:h-11 rounded-xl bg-transparent" />
            }

            const count = getFilteredCount(item)
            const dayNum = item.displayDate ? item.displayDate.split(' ')[1] : ''

            return (
              <div
                key={item.date || idx}
                ref={el => { cellMap.current[idx] = el }}
                className="relative flex flex-col items-center"
                onMouseEnter={() => handleCellHover(item, idx)}
                onMouseLeave={() => setHoveredCell(null)}
              >
                <div
                  className={`w-full h-10 sm:h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-105 ${getIntensityClass(
                    count,
                    item.isToday
                  )}`}
                >
                  <span className="text-xs font-bold">{dayNum}</span>
                  {count > 0 && (
                    <span className="text-[9px] opacity-80 font-medium">{count}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {hoveredCell && (
        <div
          className="absolute z-50 pointer-events-none transition-all duration-75"
          style={{
            left: `${tipPos.x}px`,
            top: `${tipPos.y - 8}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-surface text-foreground text-xs rounded-xl px-3.5 py-2.5 shadow-2xl border border-transparent flex flex-col gap-1.5 min-w-[160px]">
            <div className="flex items-center justify-between border-b border-border/10 pb-1.5">
              <span className="font-bold">{hoveredCell.displayDate}</span>
              <span className="text-[10px] text-primary font-bold">
                {getFilteredCount(hoveredCell)} {selectedType === 'all' ? 'actions' : selectedType}
              </span>
            </div>
            <div className="space-y-0.5 text-[10px] text-foreground-secondary">
              {hoveredCell.applications > 0 && (
                <div className="flex justify-between">
                  <span>Applications</span>
                  <strong className="text-foreground font-semibold">{hoveredCell.applications}</strong>
                </div>
              )}
              {hoveredCell.followUps > 0 && (
                <div className="flex justify-between">
                  <span>Follow-ups</span>
                  <strong className="text-foreground font-semibold">{hoveredCell.followUps}</strong>
                </div>
              )}
              {hoveredCell.interviews > 0 && (
                <div className="flex justify-between">
                  <span>Interviews</span>
                  <strong className="text-foreground font-semibold">{hoveredCell.interviews}</strong>
                </div>
              )}
              {hoveredCell.recruiterCalls > 0 && (
                <div className="flex justify-between">
                  <span>Calls</span>
                  <strong className="text-foreground font-semibold">{hoveredCell.recruiterCalls}</strong>
                </div>
              )}
              {getFilteredCount(hoveredCell) === 0 && (
                <span className="text-muted italic">No activity recorded</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground-secondary pt-2">
        <div className="flex items-center gap-2">
          <span>{rangeDays}-day activity · {activeTypeName}</span>
          <span className="text-muted">•</span>
          <span className="text-muted/80">Active on {filteredActiveDays} of {rangeDays} days</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          <span className="text-muted">Less</span>
          <div className="w-3.5 h-3.5 rounded-md bg-surface-secondary/40" />
          <div className="w-3.5 h-3.5 rounded-md bg-emerald-500/20" />
          <div className="w-3.5 h-3.5 rounded-md bg-emerald-500/45" />
          <div className="w-3.5 h-3.5 rounded-md bg-emerald-500/75" />
          <div className="w-3.5 h-3.5 rounded-md bg-emerald-500" />
          <span className="text-muted">More</span>
        </div>
      </div>
    </div>
  )
}

