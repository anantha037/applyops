import React from 'react'

export default function DataSkeleton({ className = "h-4 w-8" }) {
  return (
    <span className={`inline-block bg-foreground-secondary/20 rounded animate-pulse align-middle ${className}`} />
  )
}
