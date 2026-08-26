import React from 'react'
import CountUp from './CountUp'

export default function ValueLoader({ 
  value, 
  loading = false, 
  duration = 800, 
  spinnerClass = "h-4 w-4 border-2" 
}) {
  return (
    <span className="relative inline-flex items-center justify-center">
      {/* Spinner Layer */}
      <span 
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${loading ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        <div className={`flex-shrink-0 animate-[spin_1.5s_linear_infinite] rounded-full border-surface-tertiary border-t-foreground-secondary ${spinnerClass}`} />
      </span>
      
      {/* Value Layer */}
      <span className={`transition-opacity duration-150 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {loading ? (
          // Render a hidden placeholder to reserve layout width based on the final expected string
          // Since we don't know the exact final string while loading, we fallback to a sensible default width or just let it snap,
          // but if value is 0 it reserves 0 width. Wait, CountUp renders 0 initially.
          <span className="invisible">0</span>
        ) : (
          <CountUp value={value} duration={duration} />
        )}
      </span>
    </span>
  )
}
