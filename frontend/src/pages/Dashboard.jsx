import { useEffect, useState } from 'react'
import { api, baseUrl, activityApi } from '../api/client'
import ApplicationFunnel from '../components/ApplicationFunnel'
import ApplicationsByStatus from '../components/ApplicationsByStatus'
import PriorityTasksCard from '../components/PriorityTasksCard'
import DailyProgressCard from '../components/DailyProgressCard'
import CallsProgressCard from '../components/CallsProgressCard'
import RecentActivityCard from '../components/RecentActivityCard'
import MiniCalendarCard from '../components/MiniCalendarCard'
import ApplicationStreakCard from '../components/ApplicationStreakCard'
import { Send, TrendingUp, CalendarCheck, Trophy, Ghost, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function Dashboard() {
  const [data, setData] = useState({})
  const [error, setError] = useState('')

  const load = () => Promise.all([api.summary(), api.dueToday(), api.report(), activityApi.getStreak(), api.me()])
    .then(([summary, due, report, streak, me]) => setData({ summary, due, report, streak, me }))
    .catch(e => setError(e.message))

  useEffect(() => { 
    load() 
    
    const onRefresh = (e) => {
      if (e.detail === 'dashboard') load()
    }
    window.addEventListener('app:refresh_view', onRefresh)
    return () => window.removeEventListener('app:refresh_view', onRefresh)
  }, [])

  const summary = data.summary || {}

  return (
    <section className="animate-fade-in pb-10 select-none max-w-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Good morning, {data.me?.name?.split(' ')[0] || 'there'}! <span className="text-lg animate-bounce">👋</span>
          </h2>
          <p className="mt-0.5 text-xs font-medium text-foreground-secondary">
            Here is your job search ops overview for today.
          </p>
        </div>
        <button 
          onClick={load} 
          className="self-start sm:self-auto flex items-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-foreground-secondary border border-border hover:bg-surface-tertiary hover:text-foreground transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shadow-xs active:scale-95"
        >
          <span>Refresh</span>
          <span className="text-xs">↻</span>
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-rose-500/10 p-3 text-xs font-medium text-rose-400 border border-rose-500/20">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 lg:gap-4 mb-6">
        <StatCard 
          title="Applications Today" 
          value={error ? '—' : (summary.applications_today ?? 0)} 
          icon={Send}
          gradient="from-indigo-600/20 via-primary/10 to-transparent" 
          iconColor="text-primary bg-primary/15"
        />
        <StatCard 
          title="Response Rate" 
          value={error ? '—' : `${summary.response_rate ?? 0}%`} 
          icon={TrendingUp}
          gradient="from-emerald-600/20 via-teal-500/10 to-transparent" 
          iconColor="text-emerald-400 bg-emerald-500/15"
        />
        <StatCard 
          title="Interviews" 
          value={error ? '—' : (summary.interviews_count ?? 0)} 
          icon={CalendarCheck}
          gradient="from-blue-600/20 via-indigo-500/10 to-transparent" 
          iconColor="text-blue-400 bg-blue-500/15"
        />
        <StatCard 
          title="Offers" 
          value={error ? '—' : (summary.offers_count ?? 0)} 
          icon={Trophy}
          gradient="from-amber-600/20 via-orange-500/10 to-transparent" 
          iconColor="text-amber-400 bg-amber-500/15"
        />
        <StatCard 
          title="Ghosted" 
          value={error ? '—' : (summary.ghosted_count ?? 0)} 
          icon={Ghost}
          gradient="from-rose-600/20 via-pink-500/10 to-transparent" 
          iconColor="text-rose-400 bg-rose-500/15"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ApplicationFunnel summary={summary} />
        <ApplicationsByStatus summary={summary} />
        <PriorityTasksCard 
          tasks={data.due?.map(app => ({
            id: app.id,
            company: app.company,
            taskTitle: `Follow-up: ${app.job_title}`,
            dueDate: app.next_action_due,
            priority: 'high',
            completed: false,
            domain: `${app.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
            appDetails: app
          })) || []}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <DailyProgressCard />
          <RecentActivityCard />
        </div>
        <div className="flex flex-col gap-6">
          <CallsProgressCard summary={summary} />
          <div className="panel rounded-2xl p-5 border border-border bg-surface shadow-xs flex flex-col justify-between">
            <h3 className="text-sm font-bold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3 flex-1">
              <button 
                onClick={() => window.location.hash = '#/applications'} 
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl bg-surface-secondary/40 border border-transparent hover:border-primary/40 hover:bg-surface-secondary p-4 transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <span className="text-2xl text-primary group-hover:scale-110 transition-transform">+</span>
                <span className="text-[11px] font-semibold text-foreground-secondary group-hover:text-foreground">Add Application</span>
              </button>
              <button 
                onClick={() => window.location.hash = '#/calendar'} 
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl bg-surface-secondary/40 border border-transparent hover:border-emerald-500/40 hover:bg-surface-secondary p-4 transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <span className="text-2xl text-emerald-400 group-hover:scale-110 transition-transform">📅</span>
                <span className="text-[11px] font-semibold text-foreground-secondary group-hover:text-foreground">Schedule</span>
              </button>
              <button 
                onClick={() => window.location.hash = '#/analytics'} 
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl bg-surface-secondary/40 border border-transparent hover:border-blue-500/40 hover:bg-surface-secondary p-4 transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <span className="text-2xl text-blue-400 group-hover:scale-110 transition-transform">📊</span>
                <span className="text-[11px] font-semibold text-foreground-secondary group-hover:text-foreground">View Analytics</span>
              </button>
              <button 
                onClick={() => window.open(`${baseUrl}/reports/export?type=full`, '_blank')} 
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl bg-surface-secondary/40 border border-transparent hover:border-amber-500/40 hover:bg-surface-secondary p-4 transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <span className="text-2xl text-amber-400 group-hover:scale-110 transition-transform">📥</span>
                <span className="text-[11px] font-semibold text-foreground-secondary group-hover:text-foreground">Export Report</span>
              </button>
            </div>
          </div>
          <ApplicationStreakCard data={data.streak} />
          <MiniCalendarCard onViewFullCalendar={() => window.location.hash = '#/calendar'} />
        </div>
      </div>
    </section>
  )
}

 function StatCard({ title, value, icon: Icon, gradient, iconColor, badge, badgePositive }) {
   return (
     <div className="group relative overflow-hidden rounded-2xl p-4 bg-surface-secondary/40 hover:bg-surface-secondary/80 shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between h-[124px]">
       {/* Ambient Subtle Radial Gradient Overlay */}
       <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-25 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none`} />
       
       {/* Tier 1: Title + Icon Badge with Micro-Motion */}
       <div className="relative z-10 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-secondary group-hover:text-foreground transition-colors truncate">
            {title}
          </span>
          {Icon && (
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 flex-shrink-0 ${iconColor}`}>
               <Icon className="w-3.5 h-3.5" />
            </div>
          )}
       </div>

       {/* Tier 2: Large Prominent Metric Number */}
       <div className="relative z-10 my-0.5">
         <span className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight leading-none group-hover:translate-x-0.5 transition-transform duration-200 block">
           {value}
         </span>
       </div>

       {/* Tier 3: Styled Trend Badge Pill */}
       <div className="relative z-10 flex items-center">
         {badge && (
           <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all duration-200 group-hover:scale-105 ${
             badgePositive 
               ? 'bg-emerald-500/15 text-emerald-400' 
               : 'bg-rose-500/15 text-rose-400'
           }`}>
             {badgePositive ? (
               <ArrowUpRight className="w-3 h-3 flex-shrink-0 text-emerald-400" />
             ) : (
               <ArrowDownRight className="w-3 h-3 flex-shrink-0 text-rose-400" />
             )}
             <span className="truncate">{badge}</span>
           </div>
         )}
       </div>
     </div>
   )
 }
