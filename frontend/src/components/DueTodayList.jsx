import React from 'react'

export default function DueTodayList({ applications = [], onLog }) {
  return (
    <div className="space-y-3">
      {applications.length ? (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden bg-surface-secondary">
          {applications.map((app) => (
            <div 
              key={app.id} 
              className="flex items-center justify-between p-3.5 bg-surface hover:bg-surface-secondary/50 transition-colors"
            >
              <div>
                <p className="font-semibold text-sm text-foreground">{app.company}</p>
                <p className="text-xs text-foreground-secondary mt-0.5">
                  {app.job_title} <span className="text-muted">·</span> {app.stage}
                </p>
              </div>
              <button 
                onClick={() => onLog(app)} 
                className="btn btn-secondary px-3 py-1.5 text-xs"
              >
                Log outreach
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border border-dashed border-border rounded-lg bg-surface">
          <p className="text-sm text-foreground-secondary">No reminders due today.</p>
        </div>
      )}
    </div>
  )
}
