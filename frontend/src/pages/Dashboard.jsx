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
import QuickLogModal from '../components/QuickLogModal'
import CountUp from '../components/ui/CountUp'
import ValueLoader from '../components/ui/ValueLoader'
import { Send, TrendingUp, CalendarCheck, Trophy, Ghost, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function Dashboard() {
  const [data, setData] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [quickLogTask, setQuickLogTask] = useState(null)

  const load = () => {
    setLoading(true)
    const d = new Date()
    const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    
    Promise.all([
      api.summary(), 
      api.dueToday(), 
      api.report(), 
      activityApi.getStreak(), 
      api.me(),
      api.calendarEvents(todayStr, todayStr).catch(() => []),
      activityApi.getRecentActivity().catch(() => [])
    ])
      .then(([summary, due, report, streak, me, events, rawRecent]) => {
        const recentActivities = (rawRecent || []).map(act => {
          let color = 'bg-surface-tertiary text-foreground-secondary'
          let type = act.action_type || 'Update'
          
          if (type.includes('Applied') || type === 'Application Submitted') {
            color = 'bg-primary/15 text-primary'
            type = 'Applied'
          } else if (type.includes('Interview')) {
            color = 'bg-blue-500/15 text-blue-400'
            type = 'Interview'
          } else if (type.includes('Call')) {
            color = 'bg-emerald-500/15 text-emerald-400'
            type = 'Call'
          } else if (type.includes('Email') || type.includes('Message')) {
            color = 'bg-amber-500/15 text-amber-400'
            type = 'Message'
          } else if (type.includes('Follow')) {
            color = 'bg-purple-500/15 text-purple-400'
            type = 'Follow Up'
          }

          const d = new Date(act.timestamp)
          const timeStr = isNaN(d.getTime()) ? act.timestamp : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

          return {
            id: act.id,
            domain: (act.company || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
            company: act.company || 'Unknown',
            action: act.notes ? `${act.action_type} - ${act.notes}` : act.action_type,
            timestamp: timeStr,
            color,
            type
          }
        })

        setData({ summary, due, report, streak, me, events, recentActivities })
        setError('')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { 
    load() 
    
    const onRefresh = (e) => {
      if (e.detail === 'dashboard') load()
    }
    window.addEventListener('app:refresh_view', onRefresh)
    return () => window.removeEventListener('app:refresh_view', onRefresh)
  }, [])

  const summary = data.summary || {}

  const SkeletonCard = ({ className = '' }) => (
    <div className={`panel rounded-2xl bg-surface-secondary border border-border/50 animate-pulse ${className}`} />
  )

  const getPriority = (dateStr, type, stage) => {
    const d = new Date()
    const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    
    if (dateStr && dateStr < todayStr) return 'high'
    
    const highTypes = ['Review Offer', 'Prepare for Interview', 'Recruiter Call', 'Interview', 'Application Deadline']
    if (highTypes.includes(type)) return 'high'
    
    if (stage === 'Interviewing' || stage === 'Offer Received') return 'high'
    if (type === 'Send Thank-you' || type === 'Send Email') return 'medium'
    if (!dateStr || dateStr === todayStr) return 'medium'
    
    return 'low'
  }

  const getUnifiedTasks = () => {
    if (!data.due && !data.events) return []
    const tasks = []
    
    if (data.due) {
      data.due.forEach(app => {
        tasks.push({
          id: app.id,
          isEvent: false,
          company: app.company,
          taskTitle: `${app.next_action_title || app.next_action_type || 'Follow-up'}: ${app.job_title}`,
          dueDate: app.next_action_due,
          time: null,
          priority: getPriority(app.next_action_due, app.next_action_type, app.stage),
          completed: false,
          domain: `${app.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          appDetails: app
        })
      })
    }
    
    if (data.events) {
      data.events.forEach(ev => {
        if (ev.source === 'Auto' && ev.event_type !== 'Interview') return;
        const evDate = ev.date || (ev.start ? String(ev.start).split('T')[0] : '')
        const type = ev.event_type || ev.type || 'Event'
        tasks.push({
          id: `cal_${ev.id}`,
          originalId: ev.id,
          isEvent: true,
          company: type,
          taskTitle: ev.title,
          dueDate: evDate,
          time: ev.time || (ev.start && String(ev.start).includes('T') ? String(ev.start).split('T')[1].slice(0, 5) : null),
          priority: getPriority(evDate, type, ''),
          completed: false,
          domain: 'calendar',
          eventDetails: ev
        })
      })
    }
    
    const weight = { high: 0, medium: 1, low: 2 }
    tasks.sort((a, b) => weight[a.priority] - weight[b.priority])
    return tasks
  }

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
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-foreground-secondary border border-border hover:bg-surface-tertiary hover:text-foreground transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shadow-xs active:scale-95 disabled:opacity-50"
        >
          <span>Refresh</span>
          <span className={`text-xs ${loading ? 'animate-spin' : ''}`}>↻</span>
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
          loading={loading}
        />
        <StatCard 
          title="Response Rate" 
          value={error ? '—' : `${summary.response_rate ?? 0}%`} 
          icon={TrendingUp}
          gradient="from-emerald-600/20 via-teal-500/10 to-transparent" 
          iconColor="text-emerald-400 bg-emerald-500/15"
          loading={loading}
        />
        <StatCard 
          title="Interviews" 
          value={error ? '—' : (summary.interviews_count ?? 0)} 
          icon={CalendarCheck}
          gradient="from-blue-600/20 via-indigo-500/10 to-transparent" 
          iconColor="text-blue-400 bg-blue-500/15"
          loading={loading}
        />
        <StatCard 
          title="Offers" 
          value={error ? '—' : (summary.offers_count ?? 0)} 
          icon={Trophy}
          gradient="from-amber-600/20 via-orange-500/10 to-transparent" 
          iconColor="text-amber-400 bg-amber-500/15"
          loading={loading}
        />
        <StatCard 
          title="Ghosted" 
          value={error ? '—' : (summary.ghosted_count ?? 0)} 
          icon={Ghost}
          gradient="from-rose-600/20 via-pink-500/10 to-transparent" 
          iconColor="text-rose-400 bg-rose-500/15"
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ApplicationFunnel summary={summary} loading={loading} />
        <ApplicationsByStatus summary={summary} loading={loading} />
        <PriorityTasksCard
          loading={loading}
          tasks={getUnifiedTasks()}
          onCompleteTask={setQuickLogTask}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <DailyProgressCard loading={loading} />
          <RecentActivityCard loading={loading} activities={data.recentActivities || []} />
        </div>
        <div className="flex flex-col gap-6">
          <CallsProgressCard summary={summary} loading={loading} />
          <div className="panel rounded-2xl p-5 border border-border bg-surface shadow-xs flex flex-col justify-between">
            <h3 className="text-sm font-bold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3 flex-1">
              <button 
                onClick={() => window.location.hash = '#/applications'} 
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl bg-surface-secondary border border-transparent hover:border-primary/40 hover:bg-surface-secondary p-4 transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <span className="text-2xl text-primary group-hover:scale-110 transition-transform">+</span>
                <span className="text-[11px] font-semibold text-foreground-secondary group-hover:text-foreground">Add Application</span>
              </button>
              <button 
                onClick={() => window.location.hash = '#/calendar'} 
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl bg-surface-secondary border border-transparent hover:border-emerald-500/40 hover:bg-surface-secondary p-4 transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <span className="text-2xl text-emerald-400 group-hover:scale-110 transition-transform">📅</span>
                <span className="text-[11px] font-semibold text-foreground-secondary group-hover:text-foreground">Schedule</span>
              </button>
              <button 
                onClick={() => window.location.hash = '#/analytics'} 
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl bg-surface-secondary border border-transparent hover:border-blue-500/40 hover:bg-surface-secondary p-4 transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <span className="text-2xl text-blue-400 group-hover:scale-110 transition-transform">📊</span>
                <span className="text-[11px] font-semibold text-foreground-secondary group-hover:text-foreground">View Analytics</span>
              </button>
              <button 
                onClick={() => window.open(`${baseUrl}/reports/export?type=full`, '_blank')} 
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl bg-surface-secondary border border-transparent hover:border-amber-500/40 hover:bg-surface-secondary p-4 transition-all group focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <span className="text-2xl text-amber-400 group-hover:scale-110 transition-transform">📥</span>
                <span className="text-[11px] font-semibold text-foreground-secondary group-hover:text-foreground">Export Report</span>
              </button>
            </div>
          </div>
          <ApplicationStreakCard data={data.streak} loading={loading} />
          <MiniCalendarCard onViewFullCalendar={() => window.location.hash = '#/calendar'} loading={loading} />
        </div>
      </div>

      <QuickLogModal 
        isOpen={!!quickLogTask} 
        task={quickLogTask} 
        onClose={() => setQuickLogTask(null)} 
        onSuccess={() => {
          setQuickLogTask(null)
          load()
        }} 
      />
    </section>
  )
}

function StatCard({ title, value, icon: Icon, gradient, iconColor, badge, badgePositive, loading }) {
   return (
     <div className="group relative overflow-hidden rounded-2xl p-4 bg-surface-secondary hover:bg-surface-tertiary shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between h-[124px]">
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
       <div className="relative z-10 my-0.5 min-h-[2.25rem] flex items-center">
         <span className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight leading-none group-hover:translate-x-0.5 transition-transform duration-200 block">
           <ValueLoader loading={loading} value={value} spinnerClass="h-6 w-6 border-2" />
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
