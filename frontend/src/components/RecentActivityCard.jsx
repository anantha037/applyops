import React from 'react'
import { Activity, ArrowUpRight, CheckCircle2, Clock, Send, Calendar, PhoneCall, Trophy } from 'lucide-react'

const DEFAULT_ACTIVITIES = [
  {
    id: 'act_1',
    company: 'Google',
    domain: 'google.com',
    action: 'Applied for Senior Frontend Engineer',
    type: 'Applied',
    timestamp: '10m ago',
    icon: Send,
    color: 'text-blue-500 bg-blue-500/15'
  },
  {
    id: 'act_2',
    company: 'Stripe',
    domain: 'stripe.com',
    action: 'Technical Interview Scheduled',
    type: 'Interview',
    timestamp: '2h ago',
    icon: Calendar,
    color: 'text-amber-500 bg-amber-500/15'
  },
  {
    id: 'act_3',
    company: 'Amazon',
    domain: 'amazon.com',
    action: 'Recruiter Call Completed',
    type: 'Call Dialed',
    timestamp: '5h ago',
    icon: PhoneCall,
    color: 'text-emerald-500 bg-emerald-500/15'
  },
  {
    id: 'act_4',
    company: 'Vercel',
    domain: 'vercel.com',
    action: 'Follow-up Email Sent',
    type: 'Follow-up',
    timestamp: 'Yesterday',
    icon: Clock,
    color: 'text-indigo-500 bg-indigo-500/15'
  },
  {
    id: 'act_5',
    company: 'Netflix',
    domain: 'netflix.com',
    action: 'Offer Letter Received',
    type: 'Offer',
    timestamp: '2 days ago',
    icon: Trophy,
    color: 'text-rose-500 bg-rose-500/15'
  }
]

export default function RecentActivityCard({ activities: propActivities, onViewAll }) {
  const activities = propActivities || DEFAULT_ACTIVITIES
  const displayActivities = activities.slice(0, 5)

  return (
    <div className="panel flex flex-col rounded-2xl p-5 border border-border bg-surface shadow-xs h-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            Live Ops
          </span>
        </div>

        <button
          onClick={() => {
            if (onViewAll) onViewAll()
            else window.location.hash = '#/applications'
          }}
          className="text-[11px] font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-all duration-150 focus:outline-none group/link"
        >
          <span className="group-hover/link:underline">View activity log</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
        </button>
      </div>

      {/* 5 Recent Activities List */}
      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto scrollbar-none min-h-[220px]">
        {displayActivities.length > 0 ? (
          displayActivities.map((act) => {
            const IconComp = act.icon || Activity
            return (
              <div
                key={act.id}
                className="group relative flex items-center justify-between p-3 rounded-xl bg-surface-secondary/40 hover:bg-surface-secondary/90 dark:hover:bg-surface-tertiary/60 border border-transparent hover:border-border/30 hover:translate-x-1.5 transition-all duration-200 ease-out cursor-pointer shadow-2xs hover:shadow-md overflow-hidden"
              >
                {/* Left Hover Accent Indicator Line */}
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                {/* Left: Company Logo + Action Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2 pl-1">
                  {/* Company Logo Badge */}
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 overflow-hidden text-xs font-bold text-foreground shadow-2xs group-hover:scale-110 transition-transform duration-200">
                    <img
                      src={`https://logo.clearbit.com/${act.domain}`}
                      alt={act.company}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextSibling.style.display = 'flex'
                      }}
                    />
                    <span className="hidden w-full h-full items-center justify-center bg-primary/10 text-primary font-bold text-xs">
                      {act.company.charAt(0)}
                    </span>
                  </div>

                  {/* Activity Details */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {act.company}
                      </span>
                      <span className="text-[10px] font-medium text-foreground-secondary truncate">
                        • {act.action}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold text-foreground-secondary">
                        {act.timestamp}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Activity Type Pill Badge */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${act.color}`}>
                    <IconComp className="w-3 h-3 flex-shrink-0" />
                    <span>{act.type}</span>
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <Activity className="w-8 h-8 text-foreground-secondary opacity-40 mb-2" />
            <p className="text-xs font-medium text-foreground-secondary">No recent activities logged.</p>
          </div>
        )}
      </div>
    </div>
  )
}
