import { useEffect, useState } from 'react'
import { api } from '../api/client'

const ACTION_TYPES = ['Call Dialed', 'Call Connected', 'Email Sent', 'WhatsApp Sent', 'Interview Completed']
const METHODS = ['LinkedIn Easy Apply', 'Company Website', 'Indeed', 'Email', 'Referral', 'Cold Call', 'Other']

const STATUS_STYLES = {
  'Not Contacted': 'bg-surface-secondary text-foreground-secondary border border-border',
  'In Progress':   'bg-info-light text-info border border-info/20',
  'Interviewing':  'bg-primary/10 text-primary border border-primary/20',
  'Offer Received':'bg-success-light text-success border border-success/20',
  'Rejected':      'bg-danger-light text-danger border border-danger/20',
  'Ghosted':       'bg-warning-light text-warning border border-warning/20',
}

const STATUS_DOT = {
  'Not Contacted': 'bg-muted',
  'In Progress':   'bg-info',
  'Interviewing':  'bg-primary',
  'Offer Received':'bg-success',
  'Rejected':      'bg-danger',
  'Ghosted':       'bg-warning',
}

function IconPhone() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.8 19.8 0 0 1 1.64 3.36 2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l1.97-1.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  )
}

function IconMore() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5v14"/>
    </svg>
  )
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  )
}

function CompanyInitial({ name }) {
  const initials = name ? name.slice(0, 2).toUpperCase() : '?'
  const hue = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
      style={{ background: `hsl(${hue},55%,45%)` }}
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
    { label: 'Total Applications', value: counts.total,        iconBg: 'bg-primary/10',  iconColor: 'text-primary',  icon: '📋' },
    { label: 'Not Contacted',      value: counts.notContacted, iconBg: 'bg-surface-secondary',   iconColor: 'text-foreground-secondary',   icon: '📭' },
    { label: 'In Progress',        value: counts.inProgress,   iconBg: 'bg-info-light',    iconColor: 'text-info',    icon: '🔄' },
    { label: 'Interviewing',       value: counts.interviewing, iconBg: 'bg-primary/10',  iconColor: 'text-primary',  icon: '🎯' },
    { label: 'Offers',             value: counts.offers,       iconBg: 'bg-success-light', iconColor: 'text-success', icon: '🏆' },
    { label: 'Rejected',           value: counts.rejected,     iconBg: 'bg-danger-light',    iconColor: 'text-danger',    icon: '✗'  },
    { label: 'Ghosted',            value: counts.ghosted,      iconBg: 'bg-warning-light',  iconColor: 'text-warning',  icon: '👻' },
  ]

  return (
    <section className="pb-10">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Applications</h2>
          <p className="mt-1 text-sm text-foreground-secondary">Track and manage all your job applications in one place.</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="btn btn-primary"
        >
          <IconPlus /> New Application
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-6 card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Add new application</h3>
            <button onClick={() => setShowAdd(false)} className="btn btn-ghost p-1">
              <IconX />
            </button>
          </div>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
            <input
              required placeholder="Company name"
              className="light-field text-sm"
              value={form.company}
              onChange={e => setForm({ ...form, company: e.target.value })}
            />
            <input
              required placeholder="Job title"
              className="light-field text-sm"
              value={form.job_title}
              onChange={e => setForm({ ...form, job_title: e.target.value })}
            />
            <select
              className="light-field text-sm cursor-pointer"
              value={form.application_method}
              onChange={e => setForm({ ...form, application_method: e.target.value })}
            >
              {METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Add application
            </button>
          </form>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-danger-light border border-danger/25 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {statCards.map(s => (
          <button
            key={s.label}
            onClick={() => setFilterStatus(s.label === 'Total Applications' ? 'All' : s.label)}
            className={`card p-4 text-left shadow-sm hover:shadow-card-hover transition-all ${
              (s.label === 'Total Applications' && filterStatus === 'All') ||
              filterStatus === s.label
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-border-secondary'
            }`}
          >
            <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm ${s.iconBg} ${s.iconColor}`}>
              {s.icon}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary">{s.label}</p>
            <p className="mt-0.5 text-2xl font-black text-foreground">{s.value}</p>
          </button>
        ))}
      </div>

      {/* Filter / sort bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
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
      <div className="card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {['Company', 'Role', 'Status', 'Stage', 'Applied On', 'Next Action', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-foreground-secondary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-muted">
                    No applications match the current filter.
                  </td>
                </tr>
              ) : visible.map(app => (
                <tr key={app.id} className="group hover:bg-surface-secondary/40 transition-colors">
                  {/* Company */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CompanyInitial name={app.company} />
                      <span className="font-semibold text-foreground">{app.company}</span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3 text-foreground-secondary">{app.job_title}</td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[app.status] ?? 'bg-surface-secondary text-foreground'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[app.status] ?? 'bg-muted'}`} />
                      {app.status}
                    </span>
                  </td>

                  {/* Stage */}
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-foreground-secondary text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      {app.stage}
                    </span>
                  </td>

                  {/* Applied on */}
                  <td className="px-4 py-3 text-xs text-foreground-secondary">{app.date_applied ?? '—'}</td>

                  {/* Next action due */}
                  <td className="px-4 py-3 text-xs">
                    {app.next_action_due
                      ? <span className="font-semibold text-warning">{app.next_action_due}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionBtn title="Log call" onClick={() => log(app, 'Call Dialed')} color="text-primary hover:bg-primary/10">
                        <IconPhone />
                      </ActionBtn>
                      <ActionBtn title="Log email" onClick={() => log(app, 'Email Sent')} color="text-info hover:bg-info/10">
                        <IconMail />
                      </ActionBtn>
                      <div className="relative">
                        <ActionBtn
                          title="More actions"
                          onClick={() => setActionMenuId(prev => prev === app.id ? null : app.id)}
                          color="text-muted hover:bg-surface-secondary"
                        >
                          <IconMore />
                        </ActionBtn>
                        {actionMenuId === app.id && (
                          <div className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-xl border border-border bg-surface py-1.5 shadow-lg">
                            {ACTION_TYPES.map(act => (
                              <button
                                key={act}
                                onClick={() => log(app, act)}
                                className="block w-full px-4 py-2 text-left text-xs text-foreground-secondary hover:bg-surface-secondary hover:text-foreground transition-colors"
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
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 text-xs text-muted">
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
        className="appearance-none light-field pr-7 text-xs font-semibold text-foreground-secondary cursor-pointer"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">
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
      className={`rounded-lg p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${color}`}
    >
      {children}
    </button>
  )
}
