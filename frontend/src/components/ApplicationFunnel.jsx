import React, { useState } from 'react'
import Dropdown from './ui/Dropdown'

export default function ApplicationFunnel({ summary = {} }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [timeRange, setTimeRange] = useState('all')

  const funnel = summary.funnel || {}
  const totalApps = summary.total_applications || 128

  const stages = [
    { 
      id: 'applied', 
      label: 'Applied', 
      count: totalApps, 
      grad: ['#6366F1', '#4F46E5'],
      percent: 100
    },
    { 
      id: 'in_progress', 
      label: 'In Progress', 
      count: funnel['In Progress'] ?? 37, 
      grad: ['#14B8A6', '#10B981'],
      percent: Math.round(((funnel['In Progress'] ?? 37) / totalApps) * 100)
    },
    { 
      id: 'interviewing', 
      label: 'Interviewing', 
      count: funnel['Interviewing'] ?? 15, 
      grad: ['#3B82F6', '#2563EB'],
      percent: Math.round(((funnel['Interviewing'] ?? 15) / totalApps) * 100)
    },
    { 
      id: 'offer', 
      label: 'Offer Received', 
      count: funnel['Offer Received'] ?? 2, 
      grad: ['#F59E0B', '#D97706'],
      percent: Math.round(((funnel['Offer Received'] ?? 2) / totalApps) * 100)
    },
    { 
      id: 'rejected', 
      label: 'Rejected', 
      count: funnel['Rejected'] ?? 9, 
      grad: ['#F43F5E', '#E11D48'],
      percent: Math.round(((funnel['Rejected'] ?? 9) / totalApps) * 100)
    }
  ]

  // Geometry coordinates for 5 stacked flush trapezoids (no vertical gaps)
  const coords = [
    { yTop: 0,   yBot: 40,  xTL: 10, xTR: 175, xBL: 23, xBR: 162, cx: 92, cy: 22 },
    { yTop: 40,  yBot: 80,  xTL: 23, xTR: 162, xBL: 36, xBR: 149, cx: 92, cy: 62 },
    { yTop: 80,  yBot: 120, xTL: 36, xTR: 149, xBL: 48, xBR: 137, cx: 92, cy: 102 },
    { yTop: 120, yBot: 160, xTL: 48, xTR: 137, xBL: 59, xBR: 126, cx: 92, cy: 142 },
    { yTop: 160, yBot: 200, xTL: 59, xTR: 126, xBL: 69, xBR: 116, cx: 92, cy: 181 },
  ]

  const filterOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'month', label: 'This Month' },
    { value: 'week', label: 'This Week' }
  ]

  return (
    <div className="panel flex flex-col rounded-xl p-5 border border-border bg-surface h-full select-none">
      {/* Header with Custom Dropdown */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-foreground">Application Funnel</h3>
        <Dropdown 
          options={filterOptions} 
          value={timeRange} 
          onChange={setTimeRange} 
          size="sm"
        />
      </div>

      {/* Stacked Interactive Funnel Graphic */}
      <div className="flex-1 flex items-center justify-center my-auto min-h-[220px]">
        <svg viewBox="0 0 310 205" className="w-full h-full max-h-[240px] select-none">
          <defs>
            {stages.map((stage, i) => (
              <linearGradient key={stage.id} id={`funnel-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={stage.grad[0]} />
                <stop offset="100%" stopColor={stage.grad[1]} />
              </linearGradient>
            ))}
          </defs>

          {stages.map((stage, i) => {
            const c = coords[i]
            const isHovered = hoveredIndex === i
            let pathD = ''

            if (i === 0) {
              // Top slice with rounded top corners
              pathD = `M ${c.xTL + 6} ${c.yTop} L ${c.xTR - 6} ${c.yTop} Q ${c.xTR} ${c.yTop} ${c.xTR - 2} ${c.yTop + 6} L ${c.xBR} ${c.yBot} L ${c.xBL} ${c.yBot} L ${c.xTL + 2} ${c.yTop + 6} Q ${c.xTL} ${c.yTop} ${c.xTL + 6} ${c.yTop} Z`
            } else if (i === stages.length - 1) {
              // Bottom slice with rounded bottom corners
              pathD = `M ${c.xTL} ${c.yTop} L ${c.xTR} ${c.yTop} L ${c.xBR - 2} ${c.yBot - 6} Q ${c.xBR - 4} ${c.yBot} ${c.xBR - 8} ${c.yBot} L ${c.xBL + 8} ${c.yBot} Q ${c.xBL + 4} ${c.yBot} ${c.xBL + 2} ${c.yBot - 6} Z`
            } else {
              // Middle flush trapezoids
              pathD = `M ${c.xTL} ${c.yTop} L ${c.xTR} ${c.yTop} L ${c.xBR} ${c.yBot} L ${c.xBL} ${c.yBot} Z`
            }

            const labelY = c.cy + 4

            return (
              <g 
                key={stage.id} 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Colored Trapezoid Segment */}
                <path
                  d={pathD}
                  fill={`url(#funnel-grad-${i})`}
                  className="transition-all duration-200"
                  style={{
                    filter: isHovered ? 'brightness(1.2) drop-shadow(0 6px 12px rgba(0,0,0,0.35))' : 'none',
                    opacity: hoveredIndex === null || isHovered ? 1 : 0.45,
                    transform: isHovered ? 'scale(1.015)' : 'scale(1)',
                    transformOrigin: `${c.cx}px ${c.cy}px`
                  }}
                />

                {/* Number inside trapezoid */}
                <text
                  x={c.cx}
                  y={c.cy + 5}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="15"
                  fontWeight="800"
                  className="pointer-events-none drop-shadow-xs transition-opacity duration-200"
                  style={{ opacity: hoveredIndex === null || isHovered ? 1 : 0.6 }}
                >
                  {stage.count}
                </text>

                {/* Connector hairline guide line */}
                <line
                  x1={c.xTR - 5}
                  y1={c.cy}
                  x2={190}
                  y2={c.cy}
                  stroke={isHovered ? stage.grad[0] : "var(--border)"}
                  strokeWidth={isHovered ? "1.5" : "1"}
                  strokeDasharray={isHovered ? "none" : "2 2"}
                  className="transition-all duration-200"
                />

                {/* Right side Stage Name Label */}
                <text
                  x="196"
                  y={labelY}
                  fill={isHovered ? "var(--foreground)" : "var(--foreground-secondary)"}
                  fontSize="11"
                  fontWeight={isHovered ? "700" : "600"}
                  className="transition-all duration-200 pointer-events-none"
                >
                  {stage.label}
                  {isHovered && (
                    <tspan fill={stage.grad[0]} fontWeight="800" dx="6">
                      ({stage.percent}%)
                    </tspan>
                  )}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
