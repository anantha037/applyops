import { useEffect, useState, useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell
} from 'recharts'
import {
  Calendar, Download, Send, TrendingUp, CalendarCheck, Trophy, Clock,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import Dropdown from '../components/ui/Dropdown'
import { api } from '../api/client'

function CustomLineTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null

  const currentVal = payload.find(p => p.dataKey === 'applications')?.value ?? 0
  const prevVal = payload.find(p => p.dataKey === 'prevApplications')?.value ?? 0

  return (
    <div className="rounded-xl bg-surface border border-border p-3 shadow-xl text-xs select-none min-w-[150px]">
      <p className="font-bold text-foreground mb-2.5 pb-1.5 border-b border-border">{label}</p>
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
    <div className="rounded-xl bg-surface border border-border p-3 shadow-xl text-xs select-none min-w-[130px]">
      <p className="font-bold text-foreground mb-1">{data.name}</p>
      <p className="font-bold text-primary text-sm">{val} applications</p>
      <p className="text-foreground-secondary text-[11px] font-medium mt-0.5">{pct}%</p>
    </div>
  )
}

function KpiCard({ title, value, comparison, isPositive, context, icon: Icon }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl p-4 md:p-5 bg-surface border border-border/80 hover:bg-surface-secondary/70 hover:-translate-y-[2px] shadow-xs hover:shadow-md transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between select-none">
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
        {comparison && (
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
      grid: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0',
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
        <p className="text-danger font-bold bg-danger-light p-4 rounded-xl border border-danger/20">
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
        <div className="lg:col-span-7 rounded-2xl p-5 md:p-6 bg-surface border border-border shadow-xs flex flex-col justify-between">
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

        <div className="lg:col-span-5 rounded-2xl p-5 md:p-6 bg-surface border border-border shadow-xs flex flex-col justify-between">
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
      </div>
    </section>
  )
}
