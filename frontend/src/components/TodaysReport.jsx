import React from 'react'

export default function TodaysReport({ report = {} }) {
  const metrics = [
    ['Calls dialed', report.calls_dialed],
    ['Calls connected', report.calls_connected],
    ['Applications sent', report.applications_sent],
    ['Interviews attended', report.interviews_attended]
  ]

  return (
    <div className="card p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary mb-4">Today’s report</p>
      
      <div className="grid grid-cols-2 gap-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="border-l-2 border-border pl-3">
            <p className="text-xl font-bold text-foreground">{value ?? '—'}</p>
            <p className="text-[11px] text-foreground-secondary mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {report.method_breakdown && Object.keys(report.method_breakdown).length > 0 && (
        <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-2 text-[10px] text-muted">
          {Object.entries(report.method_breakdown).map(([method, count]) => (
            <span key={method} className="bg-surface-secondary px-2 py-0.5 rounded">
              {method}: {count}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
