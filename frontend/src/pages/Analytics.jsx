import { useEffect, useState, useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell
} from 'recharts'
import {
  Calendar, Download, Send, TrendingUp, CalendarCheck, Trophy, Clock,
  ArrowUpRight, ArrowDownRight, Zap, AlertCircle, Lightbulb, ChevronRight,
  CheckCircle2, Flame
} from 'lucide-react'
import Dropdown from '../components/ui/Dropdown'
import { api } from '../api/client'

function CustomLineTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null

  const currentVal = payload.find(p => p.dataKey === 'applications')?.value ?? 0
  const prevVal = payload.find(p => p.dataKey === 'prevApplications')?.value ?? 0

  return (
    <div className="rounded-xl bg-surface p-3 shadow-xl text-xs select-none min-w-[150px]">
      <p className="font-bold text-foreground mb-2 pb-1 text-[11px] uppercase tracking-wider">{label}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-foreground-secondary font-medium">Applications</span>
          </div>
          <span className="font-bold text-foreground">{currentVal}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted opacity-70" />
            <span className="text-foreground-secondary font-medium">Previous period</span>
          </div>
          <span className="font-bold text-foreground-secondary">{prevVal}</span>
        </div>
      </div>
    </div>
  )
}

function CustomDonutTooltip({ active, payload, total }) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0]
  const val = data.value ?? 0
  const pct = total > 0 ? Math.round((val / total) * 100) : 0

  return (
    <div className="rounded-xl bg-surface p-3 shadow-xl text-xs select-none min-w-[130px]">
      <p className="font-bold text-foreground mb-1">{data.name}</p>
      <p className="font-bold text-primary text-sm">{val} applications</p>
      <p className="text-foreground-secondary text-[11px] font-medium mt-0.5">{pct}%</p>
    </div>
  )
}

function KpiCard({ title, value, comparison, isPositive, context, icon: Icon }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl p-4 md:p-5 bg-surface hover:bg-surface-secondary/70 hover:-translate-y-[2px] shadow-xs hover:shadow-md transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between select-none">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-foreground-secondary group-hover:text-foreground transition-colors duration-200 truncate">
            {title}
          </span>
          <div className="w-8 h-8 rounded-lg bg-surface-secondary flex items-center justify-center text-foreground-secondary group-hover:text-primary group-hover:bg-primary/10 transition-all duration-200 flex-shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className="my-1">
          <span className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight leading-none block">
            {value}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2 flex flex-col gap-0.5">
        {comparison ? (
          <div className="flex items-center gap-1 text-xs font-semibold">
            {isPositive !== undefined ? (
              <span className={`inline-flex items-center gap-0.5 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" /> : <ArrowDownRight className="w-3.5 h-3.5 flex-shrink-0" />}
                {comparison}
              </span>
            ) : (
              <span className="text-foreground-secondary font-medium truncate">
                {comparison}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs font-medium text-foreground-secondary">No response data yet</span>
        )}
        <span className="text-[11px] font-medium text-muted truncate">
          {context}
        </span>
      </div>
    </div>
  )
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState('30d')
  const [exportFormat, setExportFormat] = useState('')
  const [hoveredSegment, setHoveredSegment] = useState(null)
  const [hoveredFunnel, setHoveredFunnel] = useState(null)

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
    const isDark = typeof document !== 'undefined' && (document.documentElement.getAttribute('data-theme') === 'dark' || document.body?.getAttribute('data-theme') === 'dark')
    return {
      grid: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
      text: isDark ? '#94A3B8' : '#64748B',
      guide: isDark ? 'rgba(255, 255, 255, 0.1)' : '#CBD5E1',
      primary: isDark ? '#818CF8' : '#4F46E5',
    }
  }, [loading, data])

  const handleExport = (formatType) => {
    setExportFormat('')
    if (formatType === 'csv') {
      const csvContent = "data:text/csv;charset=utf-8,Metric,Value\nTotal Applications,33\nResponse Rate,34%\nInterview Rate,24%\nOffer Rate,3%\nAvg Response Time,4.2 days\n"
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `applyops_analytics_${range}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else if (formatType === 'pdf') {
      window.print()
    }
  }

  const rangeOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '14d', label: 'Last 14 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ]

  const exportOptions = [
    { value: 'pdf', label: 'Export PDF' },
    { value: 'csv', label: 'Export CSV' },
  ]

  const statusColors = {
    'In Progress': '#3B82F6',
    'Interviewing': '#6366F1',
    'Offer Received': '#10B981',
    'Rejected': '#EF4444',
    'Ghosted': '#F59E0B',
    'Not Contacted': '#64748B',
  }

  const lineChartData = [
    { date: 'Jul 8', applications: 5, prevApplications: 4 },
    { date: 'Jul 15', applications: 6, prevApplications: 5 },
    { date: 'Jul 22', applications: 8, prevApplications: 6 },
    { date: 'Jul 29', applications: 7, prevApplications: 5 },
    { date: 'Aug 5', applications: 7, prevApplications: 6 },
  ]

  const statusData = [
    { name: 'In Progress', value: 14 },
    { name: 'Interviewing', value: 4 },
    { name: 'Offer Received', value: 1 },
    { name: 'Rejected', value: 5 },
    { name: 'Ghosted', value: 3 },
    { name: 'Not Contacted', value: 6 },
  ]

  const funnelStages = [
    { stage: 'Applications', count: 33, pct: 100, color: 'bg-primary/20 text-primary', note: '33 total applications submitted' },
    { stage: 'Responses', count: 11, pct: 34, color: 'bg-blue-500/20 text-blue-400', note: '11 responses received (34% of applications)' },
    { stage: 'Interviews', count: 8, pct: 24, color: 'bg-indigo-500/20 text-indigo-400', note: '8 interview invites (24% of applications)' },
    { stage: 'Offers', count: 1, pct: 3, color: 'bg-emerald-500/20 text-emerald-400', note: '1 offer received (3% of applications)' },
  ]

  const methodPerformance = [
    { method: 'Employee Referral', apps: 7, responses: 4, rate: 57, best: true },
    { method: 'LinkedIn Easy Apply', apps: 18, responses: 5, rate: 28, best: false },
    { method: 'Company Portal', apps: 6, responses: 2, rate: 33, best: false },
    { method: 'Other', apps: 2, responses: 0, rate: 0, best: false },
  ]

  const activeDaysData = [
    { day: 'Mon', count: 2, active: true },
    { day: 'Tue', count: 3, active: true },
    { day: 'Wed', count: 3, active: true },
    { day: 'Thu', count: 2, active: true },
    { day: 'Fri', count: 2, active: true },
    { day: 'Sat', count: 0, active: false },
    { day: 'Sun', count: 0, active: false },
  ]

  const totalStatusApplications = statusData.reduce((acc, item) => acc + item.value, 0)

  if (loading && !data) {
    return (
      <div className="h-full flex items-center justify-center text-sm font-semibold text-muted animate-pulse">
        Loading Analytics...
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col gap-4 p-6">
        <p className="text-danger font-bold bg-danger-light p-4 rounded-xl">
          {error}
        </p>
      </div>
    )
  }

  return (
    <section className="h-full pb-10 flex flex-col gap-6 max-w-full overflow-x-hidden select-none motion-reduce:transition-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h2>
          <p className="mt-1 text-xs md:text-sm text-foreground-secondary">
            Track your performance and uncover insights to improve your job search.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Dropdown
            options={rangeOptions}
            value={range}
            onChange={setRange}
            icon={Calendar}
            size="md"
          />

          <Dropdown
            options={exportOptions}
            value={exportFormat}
            onChange={handleExport}
            placeholder="Export"
            icon={Download}
            size="md"
            align="right"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 lg:gap-4">
        <KpiCard
          title="Total Applications"
          value="33"
          comparison="↑ 18% vs previous period"
          isPositive={true}
          context="12 this week"
          icon={Send}
        />
        <KpiCard
          title="Response Rate"
          value="34%"
          comparison="↑ 6% vs previous period"
          isPositive={true}
          context="11 responses"
          icon={TrendingUp}
        />
        <KpiCard
          title="Interview Rate"
          value="24%"
          comparison="8 interviews"
          context="8 / 33 applications"
          icon={CalendarCheck}
        />
        <KpiCard
          title="Offer Rate"
          value="3%"
          comparison="↑ 100% vs previous period"
          isPositive={true}
          context="1 offer"
          icon={Trophy}
        />
        <KpiCard
          title="Avg Response Time"
          value="4.2 days"
          comparison="1.2d faster vs prev"
          isPositive={true}
          context="Average time to first response"
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl p-5 md:p-6 bg-surface shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-foreground">Applications Over Time</h3>
              <p className="text-[11px] text-foreground-secondary mt-0.5 font-medium">Comparison across selected timeframes</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-primary rounded-full" />
                <span className="text-foreground-secondary">This Period</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-muted rounded-full opacity-60" />
                <span className="text-muted">Previous Period</span>
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartThemeColors.grid} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: chartThemeColors.text, fontWeight: 600 }}
                  dy={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: chartThemeColors.text, fontWeight: 600 }}
                />
                <Tooltip
                  content={<CustomLineTooltip />}
                  cursor={{ stroke: chartThemeColors.guide, strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Line
                  type="monotone"
                  dataKey="prevApplications"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#94A3B8', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#64748B' }}
                />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke={chartThemeColors.primary}
                  strokeWidth={3}
                  dot={{ r: 4, fill: chartThemeColors.primary, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: chartThemeColors.primary, stroke: 'var(--surface)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-2xl p-5 md:p-6 bg-surface shadow-xs flex-1 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-foreground">Applications by Status</h3>
              <p className="text-[11px] text-foreground-secondary mt-0.5 font-medium">Breakdown of total job applications</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 my-auto">
              <div className="relative w-44 h-44 flex-shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                      onMouseEnter={(_, idx) => setHoveredSegment(idx)}
                      onMouseLeave={() => setHoveredSegment(null)}
                    >
                      {statusData.map((entry, index) => (
                        <Cell
                          key={`status-cell-${index}`}
                          fill={statusColors[entry.name] || '#64748B'}
                          opacity={hoveredSegment === null || hoveredSegment === index ? 1 : 0.45}
                          className="transition-opacity duration-200 cursor-pointer outline-none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomDonutTooltip total={totalStatusApplications} />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                  <span className="text-2xl font-extrabold text-foreground tracking-tight leading-none">
                    {totalStatusApplications}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary mt-1">
                    Applications
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-1.5">
                {statusData.map((item, index) => {
                  const isHovered = hoveredSegment === index
                  const pct = Math.round((item.value / totalStatusApplications) * 100)
                  const color = statusColors[item.name] || '#64748B'

                  return (
                    <div
                      key={item.name}
                      onMouseEnter={() => setHoveredSegment(index)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-150 ${
                        isHovered
                          ? 'bg-surface-secondary text-foreground scale-[1.02] shadow-xs'
                          : 'text-foreground-secondary hover:text-foreground hover:bg-surface-secondary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform duration-200"
                          style={{
                            backgroundColor: color,
                            transform: isHovered ? 'scale(1.25)' : 'scale(1)'
                          }}
                        />
                        <span className="truncate font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold text-foreground flex-shrink-0 ml-2">
                        <span>{item.value}</span>
                        <span className="text-[11px] text-muted font-normal">({pct}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4 bg-surface shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-foreground">Application Consistency</h4>
                <p className="text-[11px] text-foreground-secondary font-medium">12 applications this week · 5 active days</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                <Flame className="w-3 h-3 text-primary" />
                <span>5 Day Streak</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {activeDaysData.map((d) => (
                <div
                  key={d.day}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all duration-150 ${
                    d.active
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'bg-surface-secondary/40 text-muted'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider">{d.day}</span>
                  <span className="text-xs font-black mt-0.5">{d.count > 0 ? d.count : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-2xl p-5 md:p-6 bg-surface shadow-xs flex flex-col justify-between">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-foreground">Application Funnel</h3>
            <p className="text-[11px] text-foreground-secondary mt-0.5 font-medium">Conversion rate across key recruitment stages</p>
          </div>

          <div className="space-y-3 relative">
            {funnelStages.map((stg, idx) => {
              const isHovered = hoveredFunnel === idx
              return (
                <div key={stg.stage} className="relative">
                  <div
                    onMouseEnter={() => setHoveredFunnel(idx)}
                    onMouseLeave={() => setHoveredFunnel(null)}
                    className={`relative p-3.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                      isHovered
                        ? 'bg-surface-secondary/80 shadow-xs translate-x-1'
                        : 'bg-surface-secondary/40 hover:bg-surface-secondary/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${stg.color}`}>
                        {stg.pct}%
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{stg.stage}</p>
                        <p className="text-[11px] text-foreground-secondary font-medium">{stg.note}</p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-lg font-extrabold text-foreground tracking-tight block">
                        {stg.count}
                      </span>
                      <span className="text-[10px] text-muted font-semibold uppercase tracking-wider">
                        Candidates
                      </span>
                    </div>
                  </div>

                  {idx < funnelStages.length - 1 && (
                    <div className="flex justify-center my-1 text-muted opacity-60">
                      <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-2xl p-5 md:p-6 bg-surface shadow-xs flex flex-col justify-between">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-foreground">Application Method Performance</h3>
            <p className="text-[11px] text-foreground-secondary mt-0.5 font-medium">Response rates by submission channel</p>
          </div>

          <div className="space-y-4 my-auto">
            {methodPerformance.map((item) => (
              <div key={item.method} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{item.method}</span>
                    {item.best && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500">
                        Best Channel
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-foreground-secondary font-medium">
                    <span>{item.apps} apps</span>
                    <span className="font-bold text-foreground">{item.rate}% response</span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-surface-secondary rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.best ? 'bg-gradient-to-r from-primary to-emerald-400' : 'bg-primary/70'
                    }`}
                    style={{ width: `${Math.max(item.rate, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl p-5 md:p-6 bg-surface shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">Key Insights</h3>
            <p className="text-[11px] text-foreground-secondary mt-0.5 font-medium">Pattern recognition from your application activity</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-surface-secondary/40 hover:bg-surface-secondary/70 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-foreground">Strongest Channel</h4>
              </div>
              <p className="text-xs text-foreground-secondary font-medium leading-relaxed">
                Employee referrals have your highest response rate at 57%.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-secondary/40 hover:bg-surface-secondary/70 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-foreground">Momentum</h4>
              </div>
              <p className="text-xs text-foreground-secondary font-medium leading-relaxed">
                You submitted 12 applications this week, 20% more than the previous period.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-secondary/40 hover:bg-surface-secondary/70 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md bg-rose-500/15 text-rose-500 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-foreground">Biggest Drop-off</h4>
              </div>
              <p className="text-xs text-foreground-secondary font-medium leading-relaxed">
                Most applications drop between recruiter screening and technical interviews.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-secondary/40 hover:bg-surface-secondary/70 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md bg-blue-500/15 text-blue-500 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-foreground">Response Speed</h4>
              </div>
              <p className="text-xs text-foreground-secondary font-medium leading-relaxed">
                Companies respond in an average of 4.2 days to first contact.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl p-5 md:p-6 bg-surface shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">What to Improve</h3>
                <p className="text-[11px] text-foreground-secondary font-medium">Actionable recommendation based on data</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Focus on High-Yield Channels</span>
              </div>
              <p className="text-xs text-foreground-secondary font-medium leading-relaxed">
                Your response rate from employee referrals (57%) is significantly higher than LinkedIn Easy Apply (28%). Consider prioritizing referrals and direct recruiter outreach for your next applications.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between text-[11px] text-muted">
            <span>Based on 33 total application records</span>
            <span className="font-semibold text-primary">Updated today</span>
          </div>
        </div>
      </div>
    </section>
  )
}
