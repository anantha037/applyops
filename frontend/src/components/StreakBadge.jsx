import React from 'react'

export default function StreakBadge({ days = 0 }) {
  return (
    <div className="card p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary">Goal streak</p>
      <p className="mt-2 text-3xl font-black text-warning">
        {days}
        <span className="ml-1 text-sm font-medium text-muted">days</span>
      </p>
    </div>
  )
}
