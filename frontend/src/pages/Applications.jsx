import { useEffect, useState } from 'react'
import { api } from '../api/client'

const ACTION_TYPES = ['Call Dialed', 'Call Connected', 'Email Sent', 'WhatsApp Sent', 'Interview Completed']
const METHODS = ['LinkedIn Easy Apply', 'Company Website', 'Indeed', 'Email', 'Referral', 'Cold Call', 'Other']

const STATUS_STYLES = {
  'Not Contacted': 'bg-slate-100 text-slate-500 border border-slate-200',
  'In Progress':   'bg-blue-50   text-blue-600  border border-blue-200',
  'Interviewing':  'bg-violet-50 text-violet-600 border border-violet-200',
  'Offer Received':'bg-emerald-50 text-emerald-600 border border-emerald-200',
  'Rejected':      'bg-rose-50   text-rose-500   border border-rose-200',
  'Ghosted':       'bg-orange-50 text-orange-500  border border-orange-200',
}

const STATUS_DOT = {
  'Not Contacted': 'bg-slate-400',
  'In Progress':   'bg-blue-500',
  'Interviewing':  'bg-violet-500',
  'Offer Received':'bg-emerald-500',
  'Rejected':      'bg-rose-500',
  'Ghosted':       'bg-orange-500',
}

function IconPhone() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.8 19.8 0 0 1 1.64 3.36 2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l1.97-1.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  )
}

function IconMore() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5v14"/>
    </svg>
  )
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  )
}

function CompanyInitial({ name }) {
  const initials = name ? name.slice(0, 2).toUpperCase() : '?'
  const hue = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
      style={{ background: `hsl(${hue},60%,50%)` }}
    >
      {initials}
    </div>
  )
}

const EMPTY_FORM = { company: '', job_title: '', application_method: 'LinkedIn Easy Apply' }

export default function Applications() {
  const [apps, setApps] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterStage, setFilterStage] = useState('All')
  const [search, setSearch] = useState('')
  const [actionMenuId, setActionMenuId] = useState(null)

  const load = () => api.applications().then(setApps).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const submit = e => {
    e.preventDefault()
    api.createApplication(form)
      .then(() => { setForm(EMPTY_FORM); setShowAdd(false); load() })
      .catch(e => setError(e.message))
  }

  const log = (app, actionType) => {
    api.logActivity({ application_id: app.id, company: app.company, action_type: actionType })
      .then(() => { setActionMenuId(null); load() })
      .catch(e => setError(e.message))
  }

  const statuses = ['All', ...Array.from(new Set(apps.map(a => a.status)))]
  const stages   = ['All', ...Array.from(new Set(apps.map(a => a.stage)))]

  const visible = apps.filter(a => {
    const matchStatus = filterStatus === 'All' || a.status === filterStatus
    const matchStage  = filterStage  === 'All' || a.stage  === filterStage
    const matchSearch = !search || [a.company, a.job_title].some(f => f?.toLowerCase().includes(search.toLowerCase()))
    return matchStatus && matchStage && matchSearch
  })

  // Stat counts
  const counts = {
    total:        apps.length,
    notContacted: apps.filter(a => a.status === 'Not Contacted').length,
    inProgress:   apps.filter(a => a.status === 'In Progress').length,
    interviewing: apps.filter(a => a.status === 'Interviewing').length,
    offers:       apps.filter(a => a.status === 'Offer Received').length,
    rejected:     apps.filter(a => a.status === 'Rejected').length,
    ghosted:      apps.filter(a => a.status === 'Ghosted').length,
  }

  const statCards = [
    { label: 'Total Applications', value: counts.total,        iconBg: 'bg-indigo-100',  iconColor: 'text-indigo-600',  icon: '📋' },
    { label: 'Not Contacted',      value: counts.notContacted, iconBg: 'bg-slate-100',   iconColor: 'text-slate-500',   icon: '📭' },
    { label: 'In Progress',        value: counts.inProgress,   iconBg: 'bg-blue-100',    iconColor: 'text-blue-600',    icon: '🔄' },
    { label: 'Interviewing',       value: counts.interviewing, iconBg: 'bg-violet-100',  iconColor: 'text-violet-600',  icon: '🎯' },
    { label: 'Offers',             value: counts.offers,       iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', icon: '🏆' },
    { label: 'Rejected',           value: counts.rejected,     iconBg: 'bg-rose-100',    iconColor: 'text-rose-500',    icon: '✗'  },
    { label: 'Ghosted',            value: counts.ghosted,      iconBg: 'bg-orange-100',  iconColor: 'text-orange-500',  icon: '👻' },
  ]

  return (
    <section className="pb-10">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Applications</h2>
          <p className="mt-1 text-sm text-gray-500">Track and manage all your job applications in one place.</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <IconPlus /> New Application
        </button>
      </div>

      {/* Add form — slides in */}
      {showAdd && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Add new application</h3>
            <button onClick={() => setShowAdd(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <IconX />
            </button>
          </div>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
            <input
              required placeholder="Company name"
              className="light-field"
              value={form.company}
              onChange={e => setForm({ ...form, company: e.target.value })}
            />
            <input
              required placeholder="Job title"
              className="light-field"
              value={form.job_title}
              onChange={e => setForm({ ...form, job_title: e.target.value })}
            />
            <select
              className="light-field"
              value={form.application_method}
              onChange={e => setForm({ ...form, application_method: e.target.value })}
            >
              {METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Add application
            </button>
          </form>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-600">{error}</p>
      )}

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {statCards.map(s => (
          <button
            key={s.label}
            onClick={() => setFilterStatus(s.label === 'Total Applications' ? 'All' : s.label)}
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm hover:shadow-md transition-all ${
              (s.label === 'Total Applications' && filterStatus === 'All') ||
              filterStatus === s.label
                ? 'border-indigo-300 ring-2 ring-indigo-100'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm ${s.iconBg}`}>
              {s.icon}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
            <p className="mt-0.5 text-2xl font-black text-gray-900">{s.value}</p>
          </button>
        ))}
      </div>

      {/* Filter / sort bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            placeholder="Search companies, roles…"
            className="light-field pl-8 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={statuses} />
        <FilterSelect label="Stage"  value={filterStage}  onChange={setFilterStage}  options={stages}   />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              {['Company', 'Role', 'Status', 'Stage', 'Applied On', 'Next Action', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-sm text-gray-400">
                  No applications match the current filter.
                </td>
              </tr>
            ) : visible.map(app => (
              <tr key={app.id} className="group hover:bg-indigo-50/30 transition-colors">
                {/* Company */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CompanyInitial name={app.company} />
                    <span className="font-semibold text-gray-900">{app.company}</span>
                  </div>
                </td>

                {/* Role */}
                <td className="px-4 py-3 text-gray-600">{app.job_title}</td>

                {/* Status badge */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[app.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[app.status] ?? 'bg-gray-400'}`} />
                    {app.status}
                  </span>
                </td>

                {/* Stage */}
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    {app.stage}
                  </span>
                </td>

                {/* Applied on */}
                <td className="px-4 py-3 text-xs text-gray-500">{app.date_applied ?? '—'}</td>

                {/* Next action due */}
                <td className="px-4 py-3 text-xs">
                  {app.next_action_due
                    ? <span className="font-medium text-orange-500">{app.next_action_due}</span>
                    : <span className="text-gray-300">—</span>
                  }
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionBtn title="Log call" onClick={() => log(app, 'Call Dialed')} color="text-indigo-500 hover:bg-indigo-50">
                      <IconPhone />
                    </ActionBtn>
                    <ActionBtn title="Log email" onClick={() => log(app, 'Email Sent')} color="text-blue-500 hover:bg-blue-50">
                      <IconMail />
                    </ActionBtn>
                    <div className="relative">
                      <ActionBtn
                        title="More actions"
                        onClick={() => setActionMenuId(prev => prev === app.id ? null : app.id)}
                        color="text-gray-400 hover:bg-gray-100"
                      >
                        <IconMore />
                      </ActionBtn>
                      {actionMenuId === app.id && (
                        <div className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg">
                          {ACTION_TYPES.map(act => (
                            <button
                              key={act}
                              onClick={() => log(app, act)}
                              className="block w-full px-4 py-2 text-left text-xs text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                            >
                              {act}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400">
          Showing {visible.length} of {apps.length} applications
        </div>
      </div>
    </section>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        className="appearance-none light-field pr-7 text-xs font-medium text-gray-700 cursor-pointer"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
        <IconChevronDown />
      </div>
    </div>
  )
}

function ActionBtn({ title, onClick, color, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition-colors ${color}`}
    >
      {children}
    </button>
  )
}
