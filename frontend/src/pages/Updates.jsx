import { useState } from 'react'
import { 
  Sparkles, 
  Flame, 
  Send, 
  CheckCircle2, 
  CheckCheck, 
  Bell, 
  CalendarCheck, 
  FileText, 
  Clock, 
  Zap, 
  AlertCircle, 
  MessageSquare, 
  Lightbulb, 
  ArrowUpRight 
} from 'lucide-react'

const INITIAL_UPDATES = [
  {
    id: 'up_1',
    title: 'Application Streak',
    description: "You've applied to jobs for 7 consecutive days. Keep the momentum going.",
    timestamp: 'Today',
    category: 'Activity',
    unread: true,
    icon: Flame,
    iconColor: 'text-amber-500 bg-amber-500/15'
  },
  {
    id: 'up_2',
    title: 'Interview Tomorrow',
    description: 'Your Stripe technical interview is scheduled for tomorrow at 4:30 PM.',
    timestamp: 'Tomorrow',
    category: 'Notifications',
    unread: true,
    icon: CalendarCheck,
    iconColor: 'text-blue-500 bg-blue-500/15'
  },
  {
    id: 'up_3',
    title: 'Resume Tracking',
    description: 'You can now attach a tailored resume to individual applications.',
    timestamp: 'Yesterday',
    category: 'Product Updates',
    unread: true,
    icon: FileText,
    iconColor: 'text-primary bg-primary/15'
  },
  {
    id: 'up_4',
    title: 'Follow-up Due',
    description: 'Your follow-up with Linear is due today.',
    timestamp: 'Yesterday',
    category: 'Notifications',
    unread: false,
    icon: Clock,
    iconColor: 'text-rose-500 bg-rose-500/15'
  },
  {
    id: 'up_5',
    title: 'Calendar Improvements',
    description: 'Calendar filtering and scheduling have been improved.',
    timestamp: '3 days ago',
    category: 'Product Updates',
    unread: false,
    icon: Sparkles,
    iconColor: 'text-indigo-500 bg-indigo-500/15'
  },
  {
    id: 'up_6',
    title: 'Weekly Goal Reached',
    description: 'You hit your weekly target of 12 job applications.',
    timestamp: '4 days ago',
    category: 'Activity',
    unread: false,
    icon: Zap,
    iconColor: 'text-emerald-500 bg-emerald-500/15'
  }
]

export default function Updates() {
  const [updates, setUpdates] = useState(INITIAL_UPDATES)
  const [filter, setFilter] = useState('All')

  const unreadCount = updates.filter(u => u.unread).length

  const handleMarkAllRead = () => {
    setUpdates(prev => prev.map(u => ({ ...u, unread: false })))
  }

  const handleToggleRead = (id) => {
    setUpdates(prev => prev.map(u => u.id === id ? { ...u, unread: !u.unread } : u))
  }

  const filteredUpdates = updates.filter(u => {
    if (filter === 'All') return true
    return u.category === filter
  })

  const filterTabs = ['All', 'Notifications', 'Product Updates', 'Activity']

  return (
    <section className="h-full pb-10 flex flex-col gap-6 max-w-full overflow-x-hidden select-none motion-reduce:transition-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Updates
            {unreadCount > 0 && (
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                {unreadCount} new
              </span>
            )}
          </h2>
          <p className="mt-1 text-xs md:text-sm text-foreground-secondary">
            Stay informed about your activity, reminders, and ApplyOps improvements.
          </p>
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className={`self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
            unreadCount > 0
              ? 'bg-surface-secondary text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary shadow-xs cursor-pointer'
              : 'bg-surface-secondary/40 text-muted cursor-not-allowed opacity-60'
          }`}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Mark all as read</span>
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
        {filterTabs.map((tab) => {
          const isActive = filter === tab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-surface text-foreground-secondary hover:text-foreground hover:bg-surface-secondary'
              }`}
            >
              {tab}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-4">
          {filteredUpdates.length > 0 ? (
            <div className="space-y-3">
              {filteredUpdates.map((item) => {
                const IconComponent = item.icon
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleRead(item.id)}
                    className={`group relative p-4 rounded-2xl transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                      item.unread
                        ? 'bg-surface shadow-xs hover:bg-surface-secondary/70'
                        : 'bg-surface/50 opacity-85 hover:opacity-100 hover:bg-surface-secondary/40'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${item.iconColor}`}>
                      <IconComponent className="w-4.5 h-4.5" />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xs font-bold text-foreground truncate">{item.title}</h4>
                        {item.unread && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-foreground-secondary font-medium leading-relaxed mb-2">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] font-medium text-muted">
                        <span>{item.timestamp}</span>
                        <span>·</span>
                        <span className="font-semibold text-foreground-secondary">{item.category}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl p-10 bg-surface shadow-xs flex flex-col items-center justify-center text-center my-auto min-h-[260px]">
              <div className="w-10 h-10 rounded-xl bg-surface-secondary flex items-center justify-center text-muted mb-3">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">No updates here</h3>
              <p className="text-xs text-foreground-secondary">You&apos;re all caught up.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-2xl p-5 bg-surface shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Your Activity</h3>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                Active Week
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-secondary/40">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">7 Day Streak</p>
                  <p className="text-[11px] text-foreground-secondary">Consistent daily activity</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-secondary/40">
                <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">12 Applications</p>
                  <p className="text-[11px] text-foreground-secondary">Submitted this week</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-secondary/40">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">4 Follow-ups</p>
                  <p className="text-[11px] text-foreground-secondary">Completed tasks</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-surface shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Need help?</h3>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => alert('Issue report modal coming soon.')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-secondary/40 hover:bg-surface-secondary text-left transition-all duration-150 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertCircle className="w-3.5 h-3.5 text-foreground-secondary group-hover:text-rose-500 transition-colors" />
                  <span className="text-xs font-semibold text-foreground-secondary group-hover:text-foreground">Report an issue</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-foreground transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => alert('Feedback form coming soon.')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-secondary/40 hover:bg-surface-secondary text-left transition-all duration-150 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 text-foreground-secondary group-hover:text-primary transition-colors" />
                  <span className="text-xs font-semibold text-foreground-secondary group-hover:text-foreground">Send feedback</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-foreground transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => alert('Feature request form coming soon.')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-secondary/40 hover:bg-surface-secondary text-left transition-all duration-150 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Lightbulb className="w-3.5 h-3.5 text-foreground-secondary group-hover:text-amber-500 transition-colors" />
                  <span className="text-xs font-semibold text-foreground-secondary group-hover:text-foreground">Request a feature</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-foreground transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
