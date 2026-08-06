import { useEffect, useState } from 'react'
import { api } from '../api/client'
import DueTodayList from '../components/DueTodayList'

export default function Dashboard() {
  const [data, setData] = useState({})
  const [error, setError] = useState('')

  const load = () => Promise.all([api.summary(), api.dueToday(), api.report()])
    .then(([summary, due, report]) => setData({ summary, due, report }))
    .catch(e => setError(e.message))

  useEffect(() => { load() }, [])

  const log = app => api.logActivity({ application_id: app.id, company: app.company, action_type: 'Call Dialed' })
    .then(load).catch(e => setError(e.message))

  const summary = data.summary || {}
  const funnel = summary.funnel || {}
  
  // Donut chart logic
  const total = Object.values(funnel).reduce((a, b) => a + b, 0) || 1
  let cumulative = 0
  const slices = Object.entries(funnel).map(([label, count]) => {
    const percent = count / total * 100
    const start = cumulative
    cumulative += percent
    return { label, count, percent, start }
  })
  
  const colors = {
    'Not Contacted': '#64748B', // Muted
    'In Progress': '#3B82F6', // Blue
    'Interviewing': '#6366F1', // Primary
    'Offer Received': '#22C55E', // Green
    'Rejected': '#EF4444', // Red
    'Ghosted': '#F97316' // Orange
  }

  const funnelStages = [
    { 
      key: 'Applied', 
      label: 'Applications Sent', 
      count: total, 
      color: 'bg-primary'
    },
    { 
      key: 'Contacted', 
      label: 'Responses Received', 
      count: Math.max(0, total - (funnel['Not Contacted'] || 0)), 
      color: 'bg-info'
    },
    { 
      key: 'Interviewing', 
      label: 'Interviews Attended', 
      count: funnel['Interviewing'] || 0, 
      color: 'bg-warning'
    },
    { 
      key: 'Offers', 
      label: 'Offers Received', 
      count: funnel['Offer Received'] || 0, 
      color: 'bg-success'
    }
  ]

  return (
    <section className="animate-fade-in pb-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Good morning, Aman! <span className="text-xl">👋</span>
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">Let's crush your goals today.</p>
        </div>
        <button onClick={load} className="rounded-lg bg-surface-secondary px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40">
           Refresh ↻
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400 border border-rose-500/20">{error}</p>}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard title="Applications Today" value={summary.applications_today ?? '-'} gradient="from-primary/10 to-indigo-600/10" iconColor="text-primary" />
        <StatCard title="Response Rate" value={`${summary.response_rate ?? '-'}%`} gradient="from-emerald-600/10 to-teal-600/10" iconColor="text-emerald-400" />
        <StatCard title="Interviews" value={summary.interviews_count ?? '-'} gradient="from-blue-600/10 to-cyan-600/10" iconColor="text-blue-400" />
        <StatCard title="Offers" value={summary.offers_count ?? '-'} gradient="from-amber-600/10 to-orange-600/10" iconColor="text-amber-400" />
        <StatCard title="Ghosted" value={summary.ghosted_count ?? '-'} gradient="from-rose-600/10 to-pink-600/10" iconColor="text-rose-400" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Application Funnel */}
        <div className="panel flex flex-col rounded-xl p-5 border border-border bg-surface">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Application Funnel</h3>
              <p className="text-[11px] text-foreground-secondary mt-0.5">Pipeline conversion rates</p>
            </div>
            <span className="text-[10px] font-bold text-foreground-secondary bg-surface-secondary px-2 py-1 rounded">All Time</span>
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-2 py-1">
            {funnelStages.map((stage, i) => {
              const maxCount = total || 1
              const pct = Math.round((stage.count / maxCount) * 100)
              const prevCount = i > 0 ? funnelStages[i - 1].count : null
              const passRate = prevCount && prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : null

              return (
                <div key={stage.key} className="group p-2.5 rounded-lg bg-surface-secondary/40 hover:bg-surface-secondary/80 border border-border/50 transition-all">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${stage.color} flex-shrink-0`} />
                      <span className="font-semibold text-foreground">{stage.label}</span>
                      {passRate !== null && (
                        <span className="text-[10px] text-muted font-medium ml-1">
                          ({passRate}% conv.)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{stage.count}</span>
                      <span className="text-[10px] font-semibold text-muted w-9 text-right">{pct}%</span>
                    </div>
                  </div>

                  {/* Contiguous Progress Fill Bar */}
                  <div className="h-2 w-full bg-border/40 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${stage.color} rounded-full transition-all duration-500 ease-out`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Applications by Status Donut */}
        <div className="panel rounded-xl p-5 border border-border bg-surface">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-semibold text-foreground">Applications by Status</h3>
             <span className="text-[10px] text-foreground-secondary bg-surface-secondary px-2 py-1 rounded">This Month</span>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6">
             <div className="relative w-36 h-36 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-xl">
                   {slices.map((slice) => {
                      const offset = 25 * Math.PI - (slice.start / 100) * (50 * Math.PI)
                      const dash = (slice.percent / 100) * (50 * Math.PI)
                      return <circle key={slice.label} cx="50" cy="50" r="25" fill="transparent" stroke={colors[slice.label] || '#64748B'} strokeWidth="16" strokeDasharray={`${dash} 1000`} strokeDashoffset={offset} className="transition-all duration-1000 ease-out hover:stroke-width-18" />
                   })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-2xl font-black text-foreground leading-none mb-1">{total}</span>
                   <span className="text-[9px] uppercase tracking-widest text-muted">Total</span>
                </div>
             </div>
             <div className="flex-1 space-y-2.5">
                {slices.map(s => (
                   <div key={s.label} className="flex items-center justify-between text-xs group">
                      <div className="flex items-center gap-2.5">
                         <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[s.label] || '#64748B' }} />
                         <span className="text-foreground-secondary group-hover:text-foreground transition-colors">{s.label}</span>
                      </div>
                      <span className="font-semibold text-foreground">{s.count} <span className="text-muted ml-1 font-normal">({Math.round(s.percent)}%)</span></span>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* AI Coach Card */}
        <div className="panel relative overflow-hidden rounded-xl bg-gradient-to-b from-primary/15 to-background p-5 border border-primary/20">
          <div className="absolute top-0 right-0 p-4 opacity-15">
             <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="0.5" className="text-primary">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
                <path d="M12 2a10 10 0 1 0 10 10H12V2Z" />
                <path d="M12 6v6l4 2" />
             </svg>
          </div>
          <div className="relative z-10 flex h-full flex-col">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">AI Coach</h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary border border-primary/30">NEW</span>
             </div>
             <div className="mb-5 mt-2">
                <p className="text-lg font-bold text-foreground mb-1">Great job, Aman!</p>
                <p className="text-xs text-foreground-secondary">You applied to <strong className="text-foreground">{summary.applications_today || 0}</strong> companies today.</p>
             </div>
             <ul className="space-y-3 mb-6 text-xs text-foreground-secondary flex-1">
                <li className="flex items-start gap-2.5">
                   <div className="mt-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">✓</div> 
                   Follow up with {data.due?.length || 0} companies today
                </li>
                <li className="flex items-start gap-2.5">
                   <div className="mt-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">↗</div> 
                   Your response rate is {summary.response_rate || 0}%
                </li>
                <li className="flex items-start gap-2.5">
                   <div className="mt-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">★</div> 
                   Keep pushing to hit your daily goals!
                </li>
             </ul>
             <button className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-[11px] font-bold rounded-lg transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)] focus:outline-none focus:ring-2 focus:ring-primary/40">
                Generate Full Report <span className="ml-1">→</span>
             </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
         <div className="lg:col-span-2">
            <div className="panel rounded-xl p-5 h-full border border-border bg-surface">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                     Upcoming Reminders 
                     <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold">{data.due?.length || 0}</span>
                  </h3>
                  <button className="text-[11px] font-medium text-primary hover:text-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40">View calendar</button>
               </div>
               <DueTodayList applications={data.due} onLog={log} />
            </div>
         </div>
         <div>
            <div className="panel rounded-xl p-5 h-full border border-border bg-surface">
               <h3 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h3>
               <div className="grid grid-cols-2 gap-3">
                  <button className="flex flex-col items-center justify-center gap-3 rounded-xl bg-background border border-border p-5 hover:border-primary/50 hover:bg-surface-secondary transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40">
                     <span className="text-2xl text-primary group-hover:scale-110 transition-transform">+</span>
                     <span className="text-[11px] font-medium text-foreground-secondary">Add Application</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-3 rounded-xl bg-background border border-border p-5 hover:border-emerald-500/50 hover:bg-surface-secondary transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40">
                     <span className="text-2xl text-emerald-400 group-hover:scale-110 transition-transform">📅</span>
                     <span className="text-[11px] font-medium text-foreground-secondary">Schedule</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-3 rounded-xl bg-background border border-border p-5 hover:border-blue-500/50 hover:bg-surface-secondary transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40">
                     <span className="text-2xl text-blue-400 group-hover:scale-110 transition-transform">📊</span>
                     <span className="text-[11px] font-medium text-foreground-secondary">View Analytics</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-3 rounded-xl bg-background border border-border p-5 hover:border-amber-500/50 hover:bg-surface-secondary transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40">
                     <span className="text-2xl text-amber-400 group-hover:scale-110 transition-transform">📥</span>
                     <span className="text-[11px] font-medium text-foreground-secondary">Export Report</span>
                  </button>
               </div>
            </div>
         </div>
      </div>
    </section>
  )
}

function StatCard({ title, value, gradient, iconColor }) {
  return (
    <div className="panel relative overflow-hidden rounded-xl p-5 bg-surface border border-border">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40`}></div>
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/5 blur-2xl"></div>
      <div className="relative z-10 flex items-center justify-between mb-3">
         <h3 className="text-xs font-semibold text-foreground-secondary">{title}</h3>
         <div className={`h-7 w-7 rounded-lg flex items-center justify-center bg-background border border-border ${iconColor}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
         </div>
      </div>
      <p className="relative z-10 text-3xl font-black text-foreground">{value}</p>
    </div>
  )
}
