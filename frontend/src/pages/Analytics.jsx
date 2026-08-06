import { useEffect, useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { api } from '../api/client'

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

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState('30d') // '7d' or '30d'

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.analyticsOverview(range)
        if (active) {
          setData(res)
          setError('')
        }
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [range])

  const chartThemeColors = useMemo(() => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.getAttribute('data-theme') === 'dark'
    return {
      grid: isDark ? '#2A3547' : '#f3f4f6',
      text: isDark ? '#8896A8' : '#9ca3af',
      tooltipBg: isDark ? '#151D2E' : '#FFFFFF',
      tooltipBorder: isDark ? '#2A3547' : '#E2E8F0',
    }
  }, [loading, data])

  if (loading && !data) {
    return <div className="h-full flex items-center justify-center text-sm font-semibold text-muted animate-pulse">Loading Analytics...</div>
  }

  if (error) {
    return <div className="h-full flex flex-col gap-4 p-6"><p className="text-danger font-bold bg-danger-light p-4 rounded-xl">{error}</p></div>
  }

  const { current, deltas, history, sources } = data
  
  const chartData = history.map(snap => ({
    date: format(parseISO(snap.date), 'd MMM'),
    Total: snap.total_applications,
  }))

  const COLORS = {
    'In Progress': '#3b82f6', // blue
    'Interviewing': '#f59e0b', // amber
    'Not Contacted': '#6366f1', // indigo
    'Applied': '#10b981', // emerald
    'Rejected': '#ef4444', // red
    'Ghosted': '#64748b', // slate
  }
  
  const statusData = [
    { name: 'In Progress', value: current.in_progress },
    { name: 'Interviewing', value: current.interviewing },
    { name: 'Not Contacted', value: current.not_contacted },
    { name: 'Rejected', value: current.rejected },
    { name: 'Ghosted', value: current.ghosted },
  ].filter(item => item.value > 0)
  
  const totalStatus = statusData.reduce((acc, curr) => acc + curr.value, 0)
  
  const SOURCE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']
  const sourceData = Object.entries(sources || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .filter(item => item.value > 0)
    
  const totalSources = sourceData.reduce((acc, curr) => acc + curr.value, 0)

  const interviewRate = current.total_applications ? Math.round((current.interviews_attended / current.total_applications) * 100) : 0
  const offerRate = current.total_applications ? Math.round((current.offer_received / current.total_applications) * 100) : 0

  const renderLegend = (props, data, total) => {
    const { payload } = props
    return (
      <ul className="space-y-2 mt-4 ml-8 text-xs font-semibold">
        {payload.map((entry, index) => {
          const item = data.find(d => d.name === entry.value)
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
          return (
            <li key={`item-${index}`} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-foreground-secondary">{entry.value}</span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="text-foreground">{item.value}</span>
                <span className="text-muted w-8">({pct}%)</span>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <section className="h-full pb-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
          <p className="mt-1 text-sm text-foreground-secondary">Track your performance and uncover insights to improve your job search.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-2 shadow-sm text-sm font-semibold text-foreground-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <select className="bg-transparent outline-none cursor-pointer text-foreground-secondary" value={range} onChange={e => setRange(e.target.value)}>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <button className="btn btn-secondary py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Report
          </button>
        </div>
      </div>
      
      {/* Visual Tab Bar */}
      <div className="flex gap-6 border-b border-border overflow-x-auto">
        {['Overview', 'Applications', 'Interviews', 'Responses', 'Sources', 'Time Analysis', 'Conversion'].map(tab => (
          <button
            key={tab}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-[3px] transition-colors whitespace-nowrap ${
              tab === 'Overview' ? 'border-primary text-primary' : 'border-transparent text-muted cursor-default'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        <StatCard 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>} 
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
          label="Interview Rate" 
          value={`${interviewRate}%`} 
        />
        <StatCard 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>} 
          label="Offer Rate" 
          value={`${offerRate}%`} 
          delta={deltas.offer_received} 
        />
        <StatCard 
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} 
          label="Avg Response Time" 
          value="—" 
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Line Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-foreground">Applications Over Time</h3>
            <div className="flex items-center gap-4 text-xs font-bold text-foreground-secondary">
              <div className="flex items-center gap-2"><span className="w-3 h-1 bg-primary rounded-full" /> This Period</div>
            </div>
          </div>
          <div className="h-[260px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartThemeColors.grid} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: chartThemeColors.text, fontWeight: 600 }} dy={10} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: chartThemeColors.text, fontWeight: 600 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', background: chartThemeColors.tooltipBg, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontSize: '12px', color: '#6366f1', fontWeight: 'bold' }}
                    labelStyle={{ fontSize: '11px', color: chartThemeColors.text, fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: chartThemeColors.tooltipBg }} activeDot={{ r: 6, fill: '#6366f1' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted font-semibold">Not enough data to display trend.</div>
            )}
          </div>
        </div>

        {/* Status Donut */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-foreground mb-2">Applications by Status</h3>
          <div className="flex items-center justify-center h-[280px]">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="35%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val, name) => [`${val} (${Math.round((val/totalStatus)*100)}%)`, name]}
                    contentStyle={{ borderRadius: '8px', border: 'none', background: chartThemeColors.tooltipBg, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#6366f1' }}
                  />
                  <Legend content={(props) => renderLegend(props, statusData, totalStatus)} layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-muted font-semibold">No status data available.</span>
            )}
          </div>
        </div>
      </div>

      {/* Second Row: Sources Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Applications by Source Donut */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-foreground mb-2">Applications by Source</h3>
          <div className="flex items-center justify-center h-[220px]">
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="35%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val, name) => [`${val} (${Math.round((val/totalSources)*100)}%)`, name]}
                    contentStyle={{ borderRadius: '8px', border: 'none', background: chartThemeColors.tooltipBg, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#6366f1' }}
                  />
                  <Legend content={(props) => renderLegend(props, sourceData, totalSources)} layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-muted font-semibold">No source data available.</span>
            )}
          </div>
        </div>
        
        <div className="card p-6 flex items-center justify-center border-dashed border-border min-h-[220px]">
           <p className="text-xs font-bold text-muted uppercase tracking-widest">More Insights Coming Soon</p>
        </div>
      </div>
    </section>
  )
}
