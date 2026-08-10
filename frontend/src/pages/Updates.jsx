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
  AlertCircle, 
  MessageSquare, 
  Lightbulb, 
  ArrowRight,
  ArrowUpRight,
  ShieldAlert
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
    iconColor: 'text-amber-500 bg-amber-500/15',
    actionText: 'View Activity',
    actionHref: '#/analytics'
  },
  {
    id: 'up_2',
    title: 'Interview Tomorrow',
    description: 'Your Stripe technical interview is scheduled for tomorrow at 4:30 PM.',
    timestamp: 'Tomorrow',
    category: 'Notifications',
    unread: true,
    priority: 'high',
    icon: CalendarCheck,
    iconColor: 'text-blue-500 bg-blue-500/15',
    actionText: 'View Calendar',
    actionHref: '#/calendar'
  },
  {
    id: 'up_3',
    title: 'Follow-up Due',
    description: 'Your follow-up with Linear is due today.',
    timestamp: 'Today',
    category: 'Notifications',
    unread: true,
    priority: 'high',
    icon: Clock,
    iconColor: 'text-rose-500 bg-rose-500/15',
    actionText: 'View Application',
    actionHref: '#/applications'
  },
  {
    id: 'up_4',
    title: 'Application Submitted',
    description: 'Applied for Design Systems Architect role at Vercel.',
    timestamp: 'Yesterday',
    category: 'Activity',
    unread: false,
    icon: Send,
    iconColor: 'text-emerald-500 bg-emerald-500/15',
    actionText: 'View Application',
    actionHref: '#/applications'
  },
  {
    id: 'up_5',
    title: 'Resume Tracking',
    description: 'Tailored resume attached to 3 active applications.',
    timestamp: 'Yesterday',
    category: 'Product Updates',
    unread: false,
    icon: FileText,
    iconColor: 'text-primary bg-primary/15',
    actionText: 'View Applications',
    actionHref: '#/applications'
  },
  {
    id: 'up_6',
    title: 'Calendar Improvements',
    description: 'Calendar filtering and scheduling have been improved.',
    timestamp: '3 days ago',
    category: 'Product Updates',
    unread: false,
    icon: Sparkles,
    iconColor: 'text-indigo-500 bg-indigo-500/15'
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

  const navigateTo = (href) => {
    if (href) window.location.hash = href
  }

  const attentionItems = updates.filter(u => u.priority === 'high')

  const filteredUpdates = updates.filter(u => {
    if (filter === 'All') return true
    return u.category === filter
  })

  const countForCategory = (catName) => {
    if (catName === 'All') return updates.length
    return updates.filter(u => u.category === catName).length
  }

  const filterTabs = [
    { label: 'All', value: 'All' },
    { label: 'Notifications', value: 'Notifications' },
    { label: 'Activity', value: 'Activity' },
    { label: 'Product Updates', value: 'Product Updates' }
  ]

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
            Stay on top of your applications, reminders, and important activity.
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
          <span>{unreadCount > 0 ? 'Mark all as read' : 'All read'}</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 p-1 bg-surface-secondary/50 rounded-xl w-fit overflow-x-auto scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.value
          const count = countForCategory(tab.value)
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-surface-secondary/70'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-surface-secondary text-muted'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {filter === 'All' && attentionItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Needs attention</h3>
              </div>

              <div className="space-y-2">
                {attentionItems.map((item) => (
                  <div
                    key={`attention-${item.id}`}
                    className="p-3.5 rounded-xl bg-surface hover:bg-surface-secondary/70 transition-all duration-150 flex items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconColor}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                        <p className="text-[11px] text-foreground-secondary truncate">{item.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigateTo(item.actionHref)
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover whitespace-nowrap group flex-shrink-0 cursor-pointer"
                    >
                      <span>{item.actionText}</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Recent updates</h3>
              <span className="text-[11px] text-muted font-medium">{filteredUpdates.length} items</span>
            </div>

            {filteredUpdates.length > 0 ? (
              <div className="space-y-2">
                {filteredUpdates.map((item) => {
                  const IconComponent = item.icon
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleRead(item.id)}
                      className={`group relative p-3.5 md:p-4 rounded-xl transition-all duration-150 cursor-pointer flex items-start gap-3.5 ${
                        item.unread
                          ? 'bg-surface shadow-xs hover:bg-surface-secondary/80'
                          : 'bg-surface/40 opacity-80 hover:opacity-100 hover:bg-surface-secondary/50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-150 group-hover:scale-105 ${item.iconColor}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          {item.unread && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                          <h4 className={`text-xs font-bold truncate ${item.unread ? 'text-foreground' : 'text-foreground-secondary'}`}>
                            {item.title}
                          </h4>
                        </div>

                        <p className="text-xs text-foreground-secondary font-medium leading-relaxed mb-1.5">
                          {item.description}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] font-medium text-muted">
                          <span>{item.timestamp}</span>
                          <span>·</span>
                          <span className="font-semibold text-foreground-secondary">{item.category}</span>
                        </div>
                      </div>

                      {item.actionText && item.actionHref && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigateTo(item.actionHref)
                          }}
                          className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-foreground-secondary hover:text-primary transition-colors whitespace-nowrap self-center group/btn flex-shrink-0 cursor-pointer"
                        >
                          <span>{item.actionText}</span>
                          <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl p-8 bg-surface shadow-xs flex flex-col items-center justify-center text-center min-h-[220px]">
                <div className="w-9 h-9 rounded-xl bg-surface-secondary flex items-center justify-center text-muted mb-2">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground mb-0.5">You&apos;re all caught up.</h3>
                <p className="text-[11px] text-foreground-secondary font-medium">No updates in this category.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-2xl p-5 bg-surface shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Your Activity</h3>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                Active this week
              </span>
            </div>

            <div className="space-y-2 pt-0.5">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-secondary/40">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                  🔥
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">7 days</p>
                  <p className="text-[11px] text-foreground-secondary font-medium">Application streak</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-secondary/40">
                <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0 font-bold text-xs">
                  ↗
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">12</p>
                  <p className="text-[11px] text-foreground-secondary font-medium">Applications this week</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-secondary/40">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                  ✓
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">4</p>
                  <p className="text-[11px] text-foreground-secondary font-medium">Follow-ups completed</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('#/analytics')}
              className="w-full pt-2 flex items-center justify-between text-xs font-semibold text-primary hover:text-primary-hover transition-colors group cursor-pointer"
            >
              <span>View activity</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="rounded-2xl p-5 bg-surface shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Need help?</h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => alert('Issue report modal coming soon.')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-secondary text-left transition-colors duration-150 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertCircle className="w-3.5 h-3.5 text-foreground-secondary group-hover:text-rose-500 transition-colors" />
                  <span className="text-xs font-medium text-foreground-secondary group-hover:text-foreground">Report an issue</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-foreground transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => alert('Feedback form coming soon.')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-secondary text-left transition-colors duration-150 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 text-foreground-secondary group-hover:text-primary transition-colors" />
                  <span className="text-xs font-medium text-foreground-secondary group-hover:text-foreground">Send feedback</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-foreground transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => alert('Feature request form coming soon.')}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-surface-secondary text-left transition-colors duration-150 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Lightbulb className="w-3.5 h-3.5 text-foreground-secondary group-hover:text-amber-500 transition-colors" />
                  <span className="text-xs font-medium text-foreground-secondary group-hover:text-foreground">Request a feature</span>
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
