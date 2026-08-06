import { useEffect, useState } from 'react'
import { api, baseUrl } from '../api/client'
import { format, subDays } from 'date-fns'

// ── Icons ────────────────────────────────────────────────────────────────────
const DocumentIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
const ActivityIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
const DatabaseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>

// ── Components ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, delta }) {
  const isPositive = delta > 0
  const isNegative = delta < 0
  
  return (
    <div className="card p-5 relative overflow-hidden group">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <p className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider">{label}</p>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-black text-foreground tracking-tight">{value}</p>
      </div>
      {delta !== undefined && delta !== null && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
          <span className={`flex items-center gap-1 ${isPositive ? 'text-success' : isNegative ? 'text-danger' : 'text-foreground-secondary'}`}>
            {isPositive && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m18 15-6-6-6 6"/></svg>}
            {isNegative && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>}
            {Math.abs(delta)}%
          </span>
          <span className="text-muted font-medium">vs last period</span>
        </div>
      )}
    </div>
  )
}

const TEMPLATES = [
  { id: 'applications', icon: <DocumentIcon/>, title: 'Application Summary', desc: 'Overview of all applications and statuses', color: 'text-primary', bg: 'bg-primary/10' },
  { id: 'activity', icon: <ActivityIcon/>, title: 'Activity Report', desc: 'Detailed log of all outreach and interviews', color: 'text-success', bg: 'bg-success-light' },
  { id: 'full', icon: <DatabaseIcon/>, title: 'Full Export (Joined)', desc: 'Comprehensive data joining apps and activity', color: 'text-info', bg: 'bg-info-light' },
]

export default function Reports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [activeTemplate, setActiveTemplate] = useState('applications')
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await api.analyticsOverview('30d')
        if (active) setData(res)
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const handleExport = () => {
    const params = new URLSearchParams({ type: activeTemplate })
    if (startDate) params.set('start', startDate)
    if (endDate) params.set('end', endDate)
    window.open(`${baseUrl}/reports/export?${params.toString()}`, '_blank')
  }

  if (loading && !data) {
    return <div className="h-full flex items-center justify-center text-sm font-semibold text-muted animate-pulse">Loading Reports...</div>
  }

  if (error) {
    return <div className="h-full flex flex-col gap-4 p-6"><p className="text-danger font-bold bg-danger-light p-4 rounded-xl">{error}</p></div>
  }

  const { current, deltas } = data
  const template = TEMPLATES.find(t => t.id === activeTemplate)

  return (
    <section className="h-full pb-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports</h2>
          <p className="mt-1 text-sm text-foreground-secondary">Generate and export detailed insights about your job search.</p>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        <StatCard 
          icon={<DocumentIcon/>} 
          label="Total Applications" 
          value={current.total_applications} 
          delta={deltas.total_applications} 
        />
        <StatCard 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>} 
          label="Response Rate" 
          value={`${current.response_rate}%`} 
          delta={deltas.response_rate} 
        />
        <StatCard 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} 
          label="Interviews" 
          value={current.interviews_attended} 
          delta={deltas.interviews_attended}
        />
        <StatCard 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>} 
          label="Offers" 
          value={current.offer_received} 
          delta={deltas.offer_received} 
        />
        <StatCard 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} 
          label="Avg Response Time" 
          value="—" 
        />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:min-h-[400px]">
        {/* Left Sidebar: Templates */}
        <div className="w-full lg:w-64 lg:flex-shrink-0 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-foreground px-1">Report Templates</h3>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTemplate(t.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all border text-left group ${
                  activeTemplate === t.id 
                    ? 'bg-surface border-primary ring-2 ring-primary/20 shadow-sm' 
                    : 'bg-transparent border-transparent hover:bg-surface hover:border-border'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  activeTemplate === t.id ? t.bg + ' ' + t.color : 'bg-surface-secondary text-muted group-hover:bg-surface-tertiary group-hover:text-foreground-secondary'
                }`}>
                  {t.icon}
                </div>
                <div>
                  <p className={`text-sm font-bold ${activeTemplate === t.id ? 'text-foreground' : 'text-foreground-secondary group-hover:text-foreground'}`}>{t.title}</p>
                  <p className={`text-[11px] mt-0.5 leading-snug ${activeTemplate === t.id ? 'text-foreground-secondary' : 'text-muted'}`}>{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Panel */}
        <div className="flex-1 card p-6 sm:p-8 flex flex-col">
          <div className="flex items-start justify-between border-b border-border pb-6 mb-8">
            <div>
              <h3 className="text-xl font-bold text-foreground">{template.title}</h3>
              <p className="mt-1 text-sm text-foreground-secondary">{template.desc}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${template.bg} ${template.color}`}>
              {template.icon}
            </div>
          </div>
          
          <div className="max-w-md space-y-6">
            <h4 className="text-sm font-bold text-foreground">Configuration</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground-secondary uppercase tracking-wider mb-2">Start Date</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full light-field text-sm font-semibold text-foreground-secondary cursor-pointer" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground-secondary uppercase tracking-wider mb-2">End Date</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full light-field text-sm font-semibold text-foreground-secondary cursor-pointer" 
                />
              </div>
            </div>

            <div className="bg-surface-secondary rounded-xl p-4 border border-border mt-6">
              <p className="text-xs text-foreground-secondary leading-relaxed">
                Clicking Export will generate a CSV file containing your requested data. Ensure you select a valid date range. Blank dates will export all available data.
              </p>
            </div>

            <button 
              onClick={handleExport}
              className="btn btn-primary w-full mt-4 py-3"
            >
              <DownloadIcon />
              Download CSV Report
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
