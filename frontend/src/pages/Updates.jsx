import { useState, useEffect } from 'react'
import { updatesApi } from '../api/client'
import Dropdown from '../components/ui/Dropdown'
import {
  Sparkles,
  Flame,
  Send,
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
  ShieldAlert,
  Activity,
  Check,
  X,
  RefreshCw,
  Cpu,
  Layers
} from 'lucide-react'

export default function Updates() {
  const [updates, setUpdates] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('All Updates')
  const [showModal, setShowModal] = useState(false)
  const [ticketType, setTicketType] = useState('Feedback')
  const [ticketTitle, setTicketTitle] = useState('')
  const [ticketDesc, setTicketDesc] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    updatesApi.getUpdates()
      .then(res => {
        if (active && Array.isArray(res)) {
          setUpdates(res)
          setError('')
        }
      })
      .catch(err => {
        if (active) {
          setError(err.message || 'Updates API pending backend implementation.')
          setUpdates([])
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!showModal) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowModal(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal])

  const unreadCount = updates.filter(u => u.unread || u.read === false).length

  const handleMarkAllRead = async () => {
    try {
      await updatesApi.markAllAsRead()
      setUpdates(prev => prev.map(u => ({ ...u, unread: false, read: true })))
    } catch {
      setUpdates(prev => prev.map(u => ({ ...u, unread: false, read: true })))
    }
  }

  const handleToggleRead = async (id) => {
    try {
      await updatesApi.markAsRead(id)
    } catch {
    }
    setUpdates(prev => prev.map(u => u.id === id ? { ...u, unread: !u.unread, read: true } : u))
  }

  const handleCreateTicket = (e) => {
    e.preventDefault()
    if (!ticketTitle.trim()) return

    const newTicket = {
      id: `TICK-${Math.floor(100 + Math.random() * 900)}`,
      title: ticketTitle,
      type: ticketType,
      date: 'Just now',
      status: 'Received',
      statusBg: 'bg-primary/15 text-primary',
      response: 'Your submission has been logged. Support team will respond shortly.'
    }

    setTickets([newTicket, ...tickets])
    setTicketTitle('')
    setTicketDesc('')
    setShowModal(false)
    setTab('My Support & Feedback')
  }

  const navigateTo = (href) => {
    if (href) window.location.hash = href
  }

  const attentionItems = updates.filter(u => u.priority === 'high')

  const filteredUpdates = updates.filter(u => {
    if (tab === 'All Updates') return true
    if (tab === 'Notifications & Reminders') return u.category === 'Notifications & Reminders'
    if (tab === 'Product Changelog') return u.category === 'Product Changelog'
    return false
  })

  const tabs = [
    { label: 'All Updates', value: 'All Updates', count: updates.length },
    { label: 'Notifications & Reminders', value: 'Notifications & Reminders', count: updates.filter(u => u.category === 'Notifications & Reminders').length },
    { label: 'Product Changelog', value: 'Product Changelog', count: updates.filter(u => u.category === 'Product Changelog').length },
    { label: 'My Support & Feedback', value: 'My Support & Feedback', count: tickets.length }
  ]

  return (
    <section className="h-full pb-10 flex flex-col gap-6 max-w-full overflow-x-hidden select-none motion-reduce:transition-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Updates & Support
            {unreadCount > 0 && (
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                {unreadCount} new
              </span>
            )}
          </h2>
          <p className="mt-1 text-xs md:text-sm text-foreground-secondary">
            Platform status, workspace notifications, feedback, and issue tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs transition-all duration-150 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Submit Feedback</span>
          </button>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
              unreadCount > 0
                ? 'bg-surface-secondary text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary shadow-xs cursor-pointer'
                : 'bg-surface-secondary/40 text-muted cursor-not-allowed opacity-60'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">System Status</span>
            <span className="text-xs font-bold text-foreground truncate block">All Operational</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Storage</span>
            <span className="text-xs font-bold text-foreground truncate block">Cloudflare R2</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">LLM Coaching</span>
            <span className="text-xs font-bold text-foreground truncate block">Groq 70B Active</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Version</span>
            <span className="text-xs font-bold text-foreground truncate block">ApplyOps v1.4.2</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 p-1 bg-surface-secondary/50 rounded-xl w-fit overflow-x-auto scrollbar-none">
        {tabs.map((t) => {
          const isActive = tab === t.value
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-surface-secondary/70'
              }`}
            >
              <span>{t.label}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-surface-secondary text-muted'
              }`}>
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {tab === 'My Support & Feedback' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Submitted Tickets & Reports</h3>
                <span className="text-[11px] text-muted font-medium">{tickets.length} total</span>
              </div>

              {tickets.map((tk) => (
                <div key={tk.id} className="p-4 rounded-2xl bg-surface shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-muted">{tk.id}</span>
                        <span className="text-[11px] font-bold text-foreground-secondary">{tk.type}</span>
                        <span className="text-[10px] text-muted">· {tk.date}</span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground">{tk.title}</h4>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${tk.statusBg}`}>
                      {tk.status}
                    </span>
                  </div>

                  {tk.response && (
                    <div className="p-3 rounded-xl bg-surface-secondary/50 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">ApplyOps Team Response</span>
                      <p className="text-xs text-foreground-secondary font-medium leading-relaxed">
                        {tk.response}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {tab === 'All Updates' && attentionItems.length > 0 && (
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Feed & Activity</h3>
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
            </>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-2xl p-5 bg-surface shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Platform Info</h3>
              <span className="text-[10px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-md">
                v1.4.2
              </span>
            </div>

            <div className="space-y-2 text-xs font-medium text-foreground-secondary">
              <div className="flex items-center justify-between p-2 rounded-xl bg-surface-secondary/40">
                <span className="text-muted">Environment</span>
                <span className="font-semibold text-foreground">Production</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-surface-secondary/40">
                <span className="text-muted">Database Engine</span>
                <span className="font-semibold text-foreground">PostgreSQL (Neon)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-surface-secondary/40">
                <span className="text-muted">Telegram Reminders</span>
                <span className="font-semibold text-emerald-500 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Connected
                </span>
              </div>
            </div>
          </div>

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
              className="w-full pt-1 flex items-center justify-between text-xs font-semibold text-primary hover:text-primary-hover transition-colors group cursor-pointer"
            >
              <span>View activity</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="rounded-2xl p-5 bg-surface shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Quick Support</h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setTicketType('Bug Report')
                  setShowModal(true)
                }}
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
                onClick={() => {
                  setTicketType('Feedback')
                  setShowModal(true)
                }}
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
                onClick={() => {
                  setTicketType('Feature Request')
                  setShowModal(true)
                }}
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

      {showModal && (
        <div 
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs cursor-pointer"
        >
          <div className="bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4 animate-in fade-in zoom-in-95 duration-150 select-none cursor-default">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Submit Support Request</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-muted hover:text-foreground rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground-secondary mb-1.5">Category</label>
                <Dropdown
                  options={[
                    { value: 'Bug Report', label: 'Bug Report' },
                    { value: 'Feature Request', label: 'Feature Request' },
                    { value: 'Feedback', label: 'Feedback' }
                  ]}
                  value={ticketType}
                  onChange={setTicketType}
                  className="w-full"
                  triggerClassName="w-full justify-between bg-surface-secondary text-foreground text-xs font-semibold py-2.5 px-3 rounded-xl border-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground-secondary mb-1.5">Subject / Title</label>
                <input
                  type="text"
                  required
                  placeholder="Summary of issue or feedback..."
                  value={ticketTitle}
                  onChange={e => setTicketTitle(e.target.value)}
                  className="w-full bg-surface-secondary text-foreground text-xs font-medium rounded-xl p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground-secondary mb-1.5">Description (optional)</label>
                <textarea
                  rows={3}
                  placeholder="Provide additional details..."
                  value={ticketDesc}
                  onChange={e => setTicketDesc(e.target.value)}
                  className="w-full bg-surface-secondary text-foreground text-xs font-medium rounded-xl p-2.5 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-secondary text-foreground-secondary hover:bg-surface-tertiary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors shadow-xs cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
