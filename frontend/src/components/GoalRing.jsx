import React from 'react'

export default function GoalRing({ count = 0, goal = 0 }) {
  const pct = goal ? Math.min(100, Math.round((count / goal) * 100)) : 0
  
  return (
    <div className="card flex items-center gap-5 p-5">
      <div className="relative h-16 w-16 flex-shrink-0 flex items-center justify-center">
        {/* SVG Circular Progress Ring */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-border"
            strokeWidth="3.5"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="text-primary transition-all duration-500 ease-out"
            strokeDasharray={`${pct}, 100`}
            strokeWidth="3.5"
            strokeLinecap="round"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <span className="absolute text-sm font-bold text-foreground">{pct}%</span>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary">Today’s outreach</p>
        <p className="mt-1 text-2xl font-black text-foreground">
          {count}
          <span className="text-muted font-normal text-sm ml-1">/ {goal || '—'}</span>
        </p>
      </div>
    </div>
  )
}
