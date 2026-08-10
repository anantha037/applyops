import React, { useState } from 'react'
import { TrendingUp, ArrowUpRight, Calendar, Sparkles } from 'lucide-react'
import Dropdown from './ui/Dropdown'
import { useGoalContext } from '../context/GoalContext'

const MOCK_7_DAYS = [
  { day: 'Mon', date: 'Aug 1', count: 2 },
  { day: 'Tue', date: 'Aug 2', count: 4 },
  { day: 'Wed', date: 'Aug 3', count: 3 },
  { day: 'Thu', date: 'Aug 4', count: 6 },
  { day: 'Fri', date: 'Aug 5', count: 5 },
  { day: 'Sat', date: 'Aug 6', count: 2 },
  { day: 'Sun', date: 'Today', count: 4 },
]

const MOCK_14_DAYS = [
  { day: 'Jul 25', date: 'Jul 25', count: 1 },
  { day: 'Jul 26', date: 'Jul 26', count: 3 },
  { day: 'Jul 27', date: 'Jul 27', count: 2 },
  { day: 'Jul 28', date: 'Jul 28', count: 4 },
  { day: 'Jul 29', date: 'Jul 29', count: 5 },
  { day: 'Jul 30', date: 'Jul 30', count: 1 },
  { day: 'Jul 31', date: 'Jul 31', count: 3 },
  { day: 'Aug 1', date: 'Aug 1', count: 2 },
  { day: 'Aug 2', date: 'Aug 2', count: 4 },
  { day: 'Aug 3', date: 'Aug 3', count: 3 },
  { day: 'Aug 4', date: 'Aug 4', count: 6 },
  { day: 'Aug 5', date: 'Aug 5', count: 5 },
  { day: 'Aug 6', date: 'Aug 6', count: 2 },
  { day: 'Today', date: 'Today', count: 4 },
]

export default function DailyProgressCard({ data: propData }) {
  const { weeklyGoal, weeklyApplications, weeklyProgress } = useGoalContext()
  const [timeframe, setTimeframe] = useState('7d')
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const dataset = propData || (timeframe === '7d' ? MOCK_7_DAYS : MOCK_14_DAYS)
  
  const timeframeOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '14d', label: 'Last 14 Days' },
  ]

  const maxVal = Math.max(...dataset.map(d => d.count), 7)
  const todayCount = dataset[dataset.length - 1]?.count || 0
  const yesterdayCount = dataset[dataset.length - 2]?.count || 0
  const totalApps = dataset.reduce((acc, curr) => acc + curr.count, 0)
  const dailyAvg = (totalApps / dataset.length).toFixed(1)
  
  const dayChangePct = yesterdayCount > 0 
    ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
    : 100

  // SVG Chart Geometry
  const width = 500
  const height = 140
  const paddingX = 24
  const paddingTop = 20
  const paddingBottom = 24

  const usableWidth = width - paddingX * 2
  const usableHeight = height - paddingTop - paddingBottom

  const points = dataset.map((d, index) => {
    const x = paddingX + (index / (dataset.length - 1)) * usableWidth
    const y = height - paddingBottom - (d.count / maxVal) * usableHeight
    return { x, y, ...d }
  })

  // Generate Smooth Cubic Bezier Path
  const getSmoothPath = (pts) => {
    if (pts.length < 2) return ''
    let d = `M ${pts[0].x},${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i]
      const p1 = pts[i + 1]
      const cpX = (p0.x + p1.x) / 2
      d += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`
    }
    return d
  }

  const linePath = getSmoothPath(points)
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x},${height - paddingBottom} L ${points[0].x},${height - paddingBottom} Z`
    : ''

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1]

  return (
    <div className="panel rounded-2xl p-5 border border-border bg-surface shadow-xs h-full flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground">Daily Progress</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
            Active Pace
          </span>
        </div>

        <Dropdown 
          options={timeframeOptions} 
          value={timeframe} 
          onChange={setTimeframe} 
          size="sm"
        />
      </div>

      {/* Main Chart Area */}
      {dataset.length > 0 ? (
        <div className="relative w-full my-1">
          {/* Tooltip Hover Overlay */}
          {activePoint && (
            <div 
              className="absolute pointer-events-none z-20 transition-all duration-150 transform -translate-x-1/2 -translate-y-full mb-2"
              style={{ left: `${(activePoint.x / width) * 100}%`, top: `${(activePoint.y / height) * 100}%` }}
            >
              <div className="bg-foreground text-background text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md flex items-center gap-1.5 whitespace-nowrap">
                <span>{activePoint.date}:</span>
                <span className="text-primary font-extrabold">{activePoint.count} apps</span>
              </div>
            </div>
          )}

          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-[140px] overflow-visible"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area Fill */}
            <path d={areaPath} fill="url(#chartAreaGradient)" />

            {/* Smooth Curve Line */}
            <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />

            {/* Data Points & Interactive Hover Vertical Column Guides */}
            {points.map((pt, idx) => (
              <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(idx)}>
                {/* Invisible Hit Slop Bar */}
                <rect 
                  x={pt.x - 15} 
                  y={0} 
                  width={30} 
                  height={height} 
                  fill="transparent" 
                />
                
                {/* Active Guide Vertical Line */}
                {hoveredIndex === idx && (
                  <line 
                    x1={pt.x} 
                    y1={paddingTop} 
                    x2={pt.x} 
                    y2={height - paddingBottom} 
                    stroke="var(--primary)" 
                    strokeOpacity="0.3" 
                    strokeDasharray="2 2" 
                  />
                )}

                {/* Point Outer Ring & Inner Dot */}
                <circle 
                  cx={pt.x} 
                  cy={pt.y} 
                  r={hoveredIndex === idx ? "6" : "3.5"} 
                  className="fill-surface stroke-primary transition-all duration-150"
                  strokeWidth={hoveredIndex === idx ? "3" : "2"} 
                />
              </g>
            ))}

            {/* X-Axis Labels */}
            {points.map((pt, idx) => (
              <text
                key={`lbl-${idx}`}
                x={pt.x}
                y={height - 6}
                textAnchor="middle"
                className={`text-[9px] font-semibold transition-colors ${
                  hoveredIndex === idx ? 'fill-primary font-bold' : 'fill-muted'
                }`}
              >
                {pt.day}
              </text>
            ))}
          </svg>
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="w-10 h-10 rounded-2xl bg-surface-secondary text-foreground-secondary flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-foreground">No activity yet.</h4>
          <p className="text-[11px] text-foreground-secondary mt-0.5">Start applying to see your progress.</p>
        </div>
      )}

      {/* Bottom Summary Metrics Row — Completely Borderless Clean Spacing */}
      <div className="mt-4 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Metric 1: Today */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-foreground-secondary uppercase tracking-wider">Today</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-foreground">{todayCount}</span>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
              ▲ +{dayChangePct}%
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-foreground-secondary uppercase tracking-wider">Weekly Goal</span>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-foreground">{weeklyApplications} / {weeklyGoal}</span>
            <div className="flex-1 h-1.5 bg-surface-tertiary rounded-full overflow-hidden" title={`${weeklyProgress}% complete`}>
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(100, weeklyProgress)}%` }} />
            </div>
          </div>
        </div>

        {/* Metric 3: Daily Average */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-foreground-secondary uppercase tracking-wider">Daily Avg</span>
          <span className="text-base font-extrabold text-foreground">{dailyAvg} <span className="text-[10px] font-medium text-foreground-secondary">/day</span></span>
        </div>

        {/* Metric 4: vs Last Week */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-foreground-secondary uppercase tracking-wider">vs Last Week</span>
          <span className="text-base font-extrabold text-emerald-500 flex items-center gap-1">
            ▲ +18% <span className="text-[10px] font-medium text-foreground-secondary">pace</span>
          </span>
        </div>
      </div>
    </div>
  )
}
