import React, { useState } from 'react'
import Dropdown from './ui/Dropdown'

export default function ApplicationsByStatus({ summary = {} }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [timeRange, setTimeRange] = useState('month')

  const funnel = summary.funnel || {}

  const defaultStatusData = [
    { label: 'Not Contacted', count: funnel['Not Contacted'] ?? 12, color: '#64748B' },
    { label: 'In Progress',   count: funnel['In Progress'] ?? 37,   color: '#2563EB' },
    { label: 'Interviewing',  count: funnel['Interviewing'] ?? 16,  color: '#8B5CF6' },
    { label: 'Offer Received',count: funnel['Offer Received'] ?? 2, color: '#10B981' },
    { label: 'Rejected',      count: funnel['Rejected'] ?? 9,       color: '#EF4444' },
    { label: 'Ghosted',       count: funnel['Ghosted'] ?? 23,      color: '#F97316' },
    { label: 'Closed',        count: funnel['Closed'] ?? 30,       color: '#0D9488' },
  ]

  const total = defaultStatusData.reduce((acc, item) => acc + item.count, 0) || 1

  // Compute percentage and cumulative offsets for SVG circle strokes
  const radius = 32
  const circumference = 2 * Math.PI * radius // ~201.06
  let accumulatedPercent = 0

  const segments = defaultStatusData.map((item, index) => {
    const percent = item.count / total
    const percentInt = Math.round(percent * 100)
    const strokeDasharray = `${(percent * circumference).toFixed(2)} ${circumference.toFixed(2)}`
    const strokeDashoffset = -1 * (accumulatedPercent * circumference)
    accumulatedPercent += percent

    return {
      ...item,
      index,
      percent: percentInt,
      strokeDasharray,
      strokeDashoffset
    }
  })

  const activeItem = hoveredIndex !== null ? segments[hoveredIndex] : null

  const filterOptions = [
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
    { value: 'week', label: 'This Week' }
  ]

  return (
    <div className="panel flex flex-col rounded-xl p-5 border border-border bg-surface h-full select-none">
      {/* Card Header with Reusable Dropdown */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground">Applications by Status</h3>
        <Dropdown 
          options={filterOptions} 
          value={timeRange} 
          onChange={setTimeRange} 
          size="sm"
        />
      </div>

      {/* Main Content Area: Donut Chart + Legend Grid */}
      <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-6 my-auto pt-2">
        {/* Donut Chart Container */}
        <div className="relative w-44 h-44 flex-shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {/* Background track circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="var(--border)"
              strokeWidth="14"
              opacity="0.3"
            />

            {/* Interactive Donut Segments */}
            {segments.map((seg) => {
              const isHovered = hoveredIndex === seg.index
              return (
                <circle
                  key={seg.label}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered ? 17 : 14}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  className="transition-all duration-200 ease-out cursor-pointer"
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 6px ${seg.color}80)` : 'none',
                    opacity: hoveredIndex === null || isHovered ? 1 : 0.45
                  }}
                  onMouseEnter={() => setHoveredIndex(seg.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              )
            })}
          </svg>

          {/* Center Dynamic Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-200">
            <span className="text-2xl font-extrabold text-foreground tracking-tight leading-none">
              {activeItem ? activeItem.count : total}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary mt-1 max-w-[80px] truncate">
              {activeItem ? activeItem.label : 'Total'}
            </span>
          </div>
        </div>

        {/* Status Legend List */}
        <div className="flex-1 w-full space-y-1.5">
          {segments.map((seg) => {
            const isHovered = hoveredIndex === seg.index
            return (
              <div
                key={seg.label}
                onMouseEnter={() => setHoveredIndex(seg.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-150 ${
                  isHovered 
                    ? 'bg-surface-secondary text-foreground scale-[1.02] shadow-xs' 
                    : 'text-foreground-secondary hover:text-foreground hover:bg-surface-secondary/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    className="w-3 h-3 rounded-md flex-shrink-0 transition-transform duration-200"
                    style={{ 
                      backgroundColor: seg.color,
                      transform: isHovered ? 'scale(1.2)' : 'scale(1)'
                    }} 
                  />
                  <span className="truncate font-medium">{seg.label}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-foreground flex-shrink-0 ml-2">
                  <span>{seg.count}</span>
                  <span className="text-[11px] text-foreground-secondary font-normal">({seg.percent}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
