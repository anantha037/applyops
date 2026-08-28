import { useState, useEffect } from 'react'

export default function CountUp({ value, duration = 800 }) {
  const [displayValue, setDisplayValue] = useState(0)
  
  useEffect(() => {
    if (value === '—' || value == null) return
    const isPercent = typeof value === 'string' && value.endsWith('%')
    const numericValue = parseInt(String(value).replace(/[^0-9]/g, '')) || 0
    let startTimestamp = null
    let animationFrameId
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3) // Cubic ease-out
      setDisplayValue(Math.floor(easeOut * numericValue))
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step)
      }
    }
    
    animationFrameId = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(animationFrameId)
  }, [value, duration])

  if (value === '—' || value == null) return '—'
  const isPercent = typeof value === 'string' && value.endsWith('%')
  return isPercent ? `${displayValue}%` : displayValue
}
