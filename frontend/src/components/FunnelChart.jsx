import React from 'react'

export default function FunnelChart({ funnel = {} }) {
  const max = Math.max(1, ...Object.values(funnel))
  
  return (
    <div className="card p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary mb-4">Pipeline signal</p>
      
      <div className="space-y-3.5">
        {Object.entries(funnel).map(([label, count]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs font-medium">
              <span className="text-foreground-secondary">{label}</span>
              <span className="text-primary font-bold">{count}</span>
            </div>
            <div className="h-2 w-full rounded bg-surface-secondary overflow-hidden">
              <div 
                className="h-full bg-primary rounded transition-all duration-500 ease-out" 
                style={{ width: `${(count / max) * 100}%` }} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
