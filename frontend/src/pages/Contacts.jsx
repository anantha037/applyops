import { useEffect, useState, useMemo, useCallback } from 'react'
import { api } from '../api/client'

// ── Icons ────────────────────────────────────────────────────────────────────
const MailIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7.00005L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7" /><rect x="3" y="5" width="18" height="14" rx="2" /></svg>
const DotsIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
const UserPlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function formatDate(isoDate) {
  if (!isoDate) return '—'
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getDaysAgo(isoDate) {
  if (!isoDate) return ''
  const diff = Math.floor((new Date() - new Date(isoDate)) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

function getAvatarColor(name) {
  const colors = [
    'bg-primary/10 text-primary',
    'bg-success-light text-success',
    'bg-danger-light text-danger',
    'bg-warning-light text-warning',
    'bg-info-light text-info'
  ]
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return colors[sum % colors.length]
}

// ── Components ───────────────────────────────────────────────────────────────

function AddContactModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', company: '', role: '', email: '', phone: '', tags: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface card shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-bold text-foreground">Add New Contact</h3>
          <button onClick={onClose} className="btn btn-ghost p-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-danger bg-danger-light rounded-lg px-3 py-2 border border-danger/20">{error}</p>}
          <div>
            <label className="block text-xs font-bold text-foreground-secondary mb-1.5 uppercase tracking-wider">Name *</label>
            <input required className="light-field text-sm" placeholder="Contact name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground-secondary mb-1.5 uppercase tracking-wider">Company</label>
              <input className="light-field text-sm" placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground-secondary mb-1.5 uppercase tracking-wider">Role</label>
              <input className="light-field text-sm" placeholder="e.g. Recruiter" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground-secondary mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" className="light-field text-sm" placeholder="Email address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground-secondary mb-1.5 uppercase tracking-wider">Phone</label>
              <input className="light-field text-sm" placeholder="Phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground-secondary mb-1.5 uppercase tracking-wider">Tags (comma-separated)</label>
            <input className="light-field text-sm" placeholder="e.g. Recruiter, High Priority" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground-secondary mb-1.5 uppercase tracking-wider">Notes</label>
            <textarea rows={2} className="light-field text-sm resize-none" placeholder="Optional notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border mt-5">
            <button type="button" onClick={onClose} className="btn btn-ghost px-4 py-2">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary px-5 py-2">
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All Contacts')
  const [showAddModal, setShowAddModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.contacts()
      setContacts(res)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (payload) => {
    const formatted = {
      ...payload,
      tags: payload.tags ? payload.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    }
    await api.createContact(formatted)
    load()
  }

  // Filter contacts
  const filtered = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = !search || 
        [c.name, c.company, c.role, c.email].some(f => f?.toLowerCase().includes(search.toLowerCase()))
      
      if (!matchesSearch) return false

      if (activeTab === 'Recruiters') return c.role?.toLowerCase().includes('recruiter')
      if (activeTab === 'HR Managers') return c.role?.toLowerCase().includes('hr') || c.role?.toLowerCase().includes('people')
      if (activeTab === 'Referrers') return c.tags?.some(t => t.toLowerCase() === 'referrer' || t.toLowerCase() === 'referral')
      if (activeTab === 'Others') {
        const isRec = c.role?.toLowerCase().includes('recruiter')
        const isHr = c.role?.toLowerCase().includes('hr') || c.role?.toLowerCase().includes('people')
        const isRef = c.tags?.some(t => t.toLowerCase() === 'referrer' || t.toLowerCase() === 'referral')
        return !isRec && !isHr && !isRef
      }

      return true
    })
  }, [contacts, search, activeTab])

  // Pagination
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage])

  const totalPages = Math.ceil(filtered.length / pageSize) || 1

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { 'All Contacts': contacts.length, Recruiters: 0, 'HR Managers': 0, Referrers: 0, Others: 0 }
    contacts.forEach(c => {
      const role = c.role?.toLowerCase() || ''
      const isRec = role.includes('recruiter')
      const isHr = role.includes('hr') || role.includes('people')
      const isRef = c.tags?.some(t => t.toLowerCase() === 'referrer' || t.toLowerCase() === 'referral')
      
      if (isRec) counts.Recruiters++
      if (isHr) counts['HR Managers']++
      if (isRef) counts.Referrers++
      if (!isRec && !isHr && !isRef) counts.Others++
    })
    return counts
  }, [contacts])

  // Computed stats
  const stats = useMemo(() => {
    const total = contacts.length
    const active = contacts.filter(c => c.last_contacted).length
    const responded = contacts.filter(c => c.responded === true || c.responded === 'true' || c.responded === 'Yes').length
    const responseRate = total ? Math.round((responded / total) * 100) : 0
    const companies = new Set(contacts.map(c => c.company).filter(Boolean)).size
    return { total, active, responded, responseRate, companies }
  }, [contacts])

  // Top companies
  const topCompanies = useMemo(() => {
    const map = {}
    contacts.forEach(c => {
      if (c.company) map[c.company] = (map[c.company] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [contacts])

  return (
    <section className="h-full pb-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Contacts</h2>
          <p className="mt-1 text-sm text-foreground-secondary">Manage recruiters, hiring managers, and professional referrers.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input 
              placeholder="Search contacts..." 
              className="light-field pl-8 py-2 text-sm" 
              value={search} 
              onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} 
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <UserPlusIcon />
            Add Contact
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-danger-light border border-danger/25 px-4 py-3 text-sm text-danger">{error}</p>}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        <StatCard icon={<UserPlusIcon/>} label="Total Contacts" value={stats.total} />
        <StatCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} label="Active Contacts" value={stats.active} />
        <StatCard icon={<MailIcon/>} label="Responded" value={stats.responded} />
        <StatCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>} label="Response Rate" value={`${stats.responseRate}%`} />
        <StatCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M13 14h6v7"/><path d="M9 11v.01"/><path d="M9 15v.01"/><path d="M9 19v.01"/></svg>} label="Companies Covered" value={stats.companies} />
      </div>

      <div className="flex flex-col gap-6 flex-1 lg:flex-row lg:items-start lg:min-h-0">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 card shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex gap-6 px-6 pt-4 border-b border-border overflow-x-auto">
            {['All Contacts', 'Recruiters', 'HR Managers', 'Referrers', 'Others'].map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setCurrentPage(1) }}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-foreground-secondary hover:text-foreground'
                }`}
              >
                {tab}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab ? 'bg-primary/10 text-primary' : 'bg-surface-secondary text-foreground-secondary'}`}>
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface sticky top-0 z-10 border-b border-border">
                <tr className="text-[11px] font-bold text-foreground-secondary uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold w-8"><input type="checkbox" className="rounded border-border text-primary focus:ring-primary/45" /></th>
                  <th className="px-4 py-4 font-bold">Contact</th>
                  <th className="px-4 py-4 font-bold">Company</th>
                  <th className="px-4 py-4 font-bold">Role</th>
                  <th className="px-4 py-4 font-bold">Email</th>
                  <th className="px-4 py-4 font-bold">Phone</th>
                  <th className="px-4 py-4 font-bold">Last Contacted</th>
                  <th className="px-4 py-4 font-bold">Tags</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-sm text-muted">
                      {loading ? 'Loading contacts...' : 'No contacts found.'}
                    </td>
                  </tr>
                ) : paginated.map(c => (
                  <tr key={c.id} className="hover:bg-surface-secondary/40 transition-colors group">
                    <td className="px-6 py-4"><input type="checkbox" className="rounded border-border text-primary focus:ring-primary/45" /></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${getAvatarColor(c.name)}`}>
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{c.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-foreground">{c.company || '—'}</td>
                    <td className="px-4 py-4 text-foreground-secondary">{c.role || '—'}</td>
                    <td className="px-4 py-4 text-foreground-secondary">{c.email || '—'}</td>
                    <td className="px-4 py-4 text-foreground-secondary">{c.phone || '—'}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-foreground-secondary">{formatDate(c.last_contacted)}</span>
                        <span className="text-[10px] text-muted">{getDaysAgo(c.last_contacted)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1.5">
                        {c.tags?.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-secondary text-foreground-secondary border border-border">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="btn btn-ghost p-1.5 text-xs">
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-surface">
              <span className="text-xs text-muted">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="btn btn-secondary py-1 px-3 text-xs"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="btn btn-secondary py-1 px-3 text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-64 lg:flex-shrink-0 flex flex-col gap-6">
          <div className="card p-5">
            <h3 className="text-xs font-bold text-foreground mb-4 uppercase tracking-wider">Quick Actions</h3>
            <div className="space-y-3">
              <QuickAction icon={<UserPlusIcon/>} title="Add New Contact" desc="Manually add a new contact" color="text-primary" bg="bg-primary/10" onClick={() => setShowAddModal(true)} />
              <QuickAction icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>} title="Import Contacts" desc="Upload CSV or Excel file" color="text-success" bg="bg-success-light" />
              <QuickAction icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>} title="Sync LinkedIn" desc="Import connections" color="text-info" bg="bg-info-light" />
            </div>
          </div>

          <div className="card p-5 flex-1">
            <h3 className="text-xs font-bold text-foreground mb-4 uppercase tracking-wider">Top Companies</h3>
            <div className="space-y-4">
              {topCompanies.length === 0 ? (
                <p className="text-xs text-muted">No company data.</p>
              ) : topCompanies.map(([comp, count], i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-surface-secondary border border-border flex items-center justify-center text-[10px] font-bold text-foreground-secondary">
                      {comp[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-foreground-secondary truncate max-w-[120px]" title={comp}>{comp}</span>
                  </div>
                  <span className="text-xs font-bold text-foreground bg-surface-secondary px-2 py-0.5 rounded">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddContactModal onClose={() => setShowAddModal(false)} onSave={handleAdd} />
      )}
    </section>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="card p-4 relative overflow-hidden group">
      <div className="flex items-start gap-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-foreground-secondary">{label}</p>
          <p className="text-2xl font-black text-foreground mt-0.5 tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon, title, desc, color, bg, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-2 hover:bg-surface-secondary rounded-xl transition-colors text-left group">
      <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-foreground">{title}</p>
        <p className="text-[10px] font-medium text-foreground-secondary">{desc}</p>
      </div>
    </button>
  )
}
