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
    'Not Contacted': '#475569',
    'In Progress': '#3b82f6',
    'Interviewing': '#8b5cf6',
    'Offer Received': '#22c55e',
    'Rejected': '#ef4444',
    'Ghosted': '#f97316'
  }

  return (
    <section className="animate-fade-in pb-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            Good morning, Aman! <span className="text-xl">👋</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">Let's crush your goals today.</p>
        </div>
        <button onClick={load} className="rounded-lg bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors">
           Refresh ↻
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400 border border-rose-500/20">{error}</p>}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard title="Applications Today" value={summary.applications_today ?? '-'} gradient="from-indigo-600/20 to-purple-600/20" iconColor="text-indigo-400" />
        <StatCard title="Response Rate" value={`${summary.response_rate ?? '-'}%`} gradient="from-emerald-600/20 to-teal-600/20" iconColor="text-emerald-400" />
        <StatCard title="Interviews" value={summary.interviews_count ?? '-'} gradient="from-blue-600/20 to-cyan-600/20" iconColor="text-blue-400" />
        <StatCard title="Offers" value={summary.offers_count ?? '-'} gradient="from-amber-600/20 to-orange-600/20" iconColor="text-amber-400" />
        <StatCard title="Ghosted" value={summary.ghosted_count ?? '-'} gradient="from-rose-600/20 to-pink-600/20" iconColor="text-rose-400" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Application Funnel */}
        <div className="panel flex flex-col rounded-xl p-5 border border-[#1b3045] bg-[#0b1828]">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-sm font-semibold text-slate-100">Application Funnel</h3>
             <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded">All Time</span>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-5 px-4">
             {Object.entries({ 
                Applied: total, 
                Contacted: total - (funnel['Not Contacted'] || 0), 
                Interviewing: funnel['Interviewing'] || 0, 
                Offers: funnel['Offer Received'] || 0 
             }).map(([k, v], i) => (
                <div key={k} className="relative w-full group">
                   <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5 z-10 relative px-1">
                      <span className="uppercase tracking-wider">{k}</span> 
                      <span className="text-white">{v}</span>
                   </div>
                   <div className="h-9 bg-[#1b3045] rounded-lg overflow-hidden mx-auto transition-all shadow-inner" style={{ width: `${100 - i * 15}%` }}>
                      <div className={`h-full ${['bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'][i]} bg-opacity-80 group-hover:bg-opacity-100 transition-colors`} style={{ width: '100%' }} />
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Applications by Status Donut */}
        <div className="panel rounded-xl p-5 border border-[#1b3045] bg-[#0b1828]">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-semibold text-slate-100">Applications by Status</h3>
             <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded">This Month</span>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6">
             <div className="relative w-36 h-36 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-xl">
                   {slices.map((slice) => {
                      const offset = 25 * Math.PI - (slice.start / 100) * (50 * Math.PI)
                      const dash = (slice.percent / 100) * (50 * Math.PI)
                      return <circle key={slice.label} cx="50" cy="50" r="25" fill="transparent" stroke={colors[slice.label] || '#475569'} strokeWidth="16" strokeDasharray={`${dash} 1000`} strokeDashoffset={offset} className="transition-all duration-1000 ease-out hover:stroke-width-18" />
                   })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-2xl font-black text-white leading-none mb-1">{total}</span>
                   <span className="text-[9px] uppercase tracking-widest text-slate-500">Total</span>
                </div>
             </div>
             <div className="flex-1 space-y-2.5">
                {slices.map(s => (
                   <div key={s.label} className="flex items-center justify-between text-xs group">
                      <div className="flex items-center gap-2.5">
                         <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[s.label] || '#475569' }} />
                         <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{s.label}</span>
                      </div>
                      <span className="font-semibold text-slate-200">{s.count} <span className="text-slate-600 ml-1 font-normal">({Math.round(s.percent)}%)</span></span>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* AI Coach Card */}
        <div className="panel relative overflow-hidden rounded-xl bg-gradient-to-b from-[#1c1844] to-[#07111f] p-5 border border-indigo-500/30">
          <div className="absolute top-0 right-0 p-4 opacity-30">
             <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="0.5" className="text-indigo-300">
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
                <h3 className="text-sm font-semibold text-white">AI Coach</h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">NEW</span>
             </div>
             <div className="mb-5 mt-2">
                <p className="text-lg font-bold text-white mb-1">Great job, Aman!</p>
                <p className="text-xs text-indigo-200/70">You applied to <strong className="text-indigo-100">{summary.applications_today || 0}</strong> companies today.</p>
             </div>
             <ul className="space-y-3 mb-6 text-xs text-slate-300 flex-1">
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
             <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)]">
                Generate Full Report <span className="ml-1">→</span>
             </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
         <div className="lg:col-span-2">
            <div className="panel rounded-xl p-5 h-full border border-[#1b3045] bg-[#0b1828]">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                     Upcoming Reminders 
                     <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold">{data.due?.length || 0}</span>
                  </h3>
                  <button className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors">View calendar</button>
               </div>
               <DueTodayList applications={data.due} onLog={log} />
            </div>
         </div>
         <div>
            <div className="panel rounded-xl p-5 h-full border border-[#1b3045] bg-[#0b1828]">
               <h3 className="text-sm font-semibold text-slate-100 mb-4">Quick Actions</h3>
               <div className="grid grid-cols-2 gap-3">
                  <button className="flex flex-col items-center justify-center gap-3 rounded-xl bg-[#07111f] border border-[#1b3045] p-5 hover:border-indigo-500/50 hover:bg-[#0c1828] transition-all group">
                     <span className="text-2xl text-indigo-400 group-hover:scale-110 transition-transform">+</span>
                     <span className="text-[11px] font-medium text-slate-300">Add Application</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-3 rounded-xl bg-[#07111f] border border-[#1b3045] p-5 hover:border-emerald-500/50 hover:bg-[#0c1828] transition-all group">
                     <span className="text-2xl text-emerald-400 group-hover:scale-110 transition-transform">📅</span>
                     <span className="text-[11px] font-medium text-slate-300">Schedule</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-3 rounded-xl bg-[#07111f] border border-[#1b3045] p-5 hover:border-blue-500/50 hover:bg-[#0c1828] transition-all group">
                     <span className="text-2xl text-blue-400 group-hover:scale-110 transition-transform">📊</span>
                     <span className="text-[11px] font-medium text-slate-300">View Analytics</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-3 rounded-xl bg-[#07111f] border border-[#1b3045] p-5 hover:border-amber-500/50 hover:bg-[#0c1828] transition-all group">
                     <span className="text-2xl text-amber-400 group-hover:scale-110 transition-transform">📥</span>
                     <span className="text-[11px] font-medium text-slate-300">Export Report</span>
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
    <div className={`panel relative overflow-hidden rounded-xl p-5 bg-[#0b1828] border border-[#1b3045]`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40`}></div>
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/5 blur-2xl"></div>
      <div className="relative z-10 flex items-center justify-between mb-3">
         <h3 className="text-xs font-semibold text-slate-400">{title}</h3>
         <div className={`h-7 w-7 rounded-lg flex items-center justify-center bg-[#07111f] border border-[#1b3045] ${iconColor}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
         </div>
      </div>
      <p className="relative z-10 text-3xl font-black text-white">{value}</p>
    </div>
  )
}
