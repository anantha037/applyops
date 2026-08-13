import React from 'react'
import { PhoneOutgoing } from 'lucide-react'

export default function CallsProgressCard({ summary = {} }) {
  const goal = summary.calls_goal || 0
  const today = summary.calls_today || 0
  const progress = goal > 0 ? Math.min(100, Math.round((today / goal) * 100)) : 0

  if (goal === 0 && today === 0) {
    return null // Only show if they have a goal or have made calls
  }

  return (
    <div className="panel rounded-2xl p-5 border border-border bg-surface shadow-xs flex flex-col justify-between select-none">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center flex-shrink-0">
          <PhoneOutgoing className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Daily Calls</h3>
          <p className="text-[10px] font-semibold text-foreground-secondary uppercase tracking-wider">Today's Target</p>
        </div>
      </div>
      
      <div className="flex flex-col gap-1 mt-1">
        <div className="flex items-end justify-between">
          <span className="text-3xl font-extrabold text-foreground leading-none">{today}</span>
          <span className="text-sm font-bold text-foreground-secondary mb-0.5">/ {goal > 0 ? goal : '—'}</span>
        </div>
        
        {goal > 0 ? (
          <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden mt-2" title={`${progress}% complete`}>
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        ) : (
          <p className="text-[10px] text-foreground-secondary font-medium mt-2">No daily goal set.</p>
        )}
      </div>
    </div>
  )
}
