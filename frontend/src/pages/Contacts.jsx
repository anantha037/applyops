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
  const colors = ['bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700', 'bg-cyan-100 text-cyan-700']
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Add New Contact</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name *</label>
            <input required className="light-field text-sm" placeholder="Contact name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Company</label>
              <input className="light-field text-sm" placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Role</label>
              <input className="light-field text-sm" placeholder="e.g. Recruiter" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input type="email" className="light-field text-sm" placeholder="Email address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
              <input className="light-field text-sm" placeholder="Phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tags (comma-separated)</label>
            <input className="light-field text-sm" placeholder="e.g. Recruiter, High Priority" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
            <textarea rows={2} className="light-field text-sm resize-none" placeholder="Optional notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All Contacts')
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)

  const ITEMS_PER_PAGE = 8

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.contacts()
      setContacts(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async form => {
    await api.createContact(form)
    await load()
  }

  // Derived stats
  const stats = useMemo(() => {
    const total = contacts.length
    const active = contacts.filter(c => c.last_contacted).length
    const responded = contacts.filter(c => c.responded).length
    const responseRate = total === 0 ? 0 : Math.round((responded / total) * 100)
    const companies = new Set(contacts.map(c => c.company).filter(Boolean)).size

    return { total, active, responded, responseRate, companies }
  }, [contacts])

  // Top companies for sidebar
  const topCompanies = useMemo(() => {
    const counts = {}
    contacts.forEach(c => {
      if (c.company) counts[c.company] = (counts[c.company] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [contacts])

  // Filtering
  const filtered = useMemo(() => {
    return contacts.filter(c => {
      // Tab filter
      const cTags = c.tags ? c.tags.toLowerCase() : ''
      const cRole = c.role ? c.role.toLowerCase() : ''
      if (activeTab === 'Recruiters' && !cTags.includes('recruiter') && !cRole.includes('recruiter')) return false
      if (activeTab === 'HR Managers' && !cTags.includes('hr') && !cRole.includes('hr')) return false
      if (activeTab === 'Referrers' && !cTags.includes('refer')) return false
      if (activeTab === 'Others' && (cTags.includes('recruiter') || cRole.includes('recruiter') || cTags.includes('hr') || cRole.includes('hr') || cTags.includes('refer'))) return false
      
      // Search
      if (search) {
        const q = search.toLowerCase()
        if (!c.name.toLowerCase().includes(q) && !(c.company || '').toLowerCase().includes(q) && !(c.email || '').toLowerCase().includes(q)) {
          return false
        }
      }
      return true
    })
  }, [contacts, activeTab, search])

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [activeTab, search])

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { 'All Contacts': contacts.length, 'Recruiters': 0, 'HR Managers': 0, 'Referrers': 0, 'Others': 0 }
    contacts.forEach(c => {
      const tags = c.tags ? c.tags.toLowerCase() : ''
      const role = c.role ? c.role.toLowerCase() : ''
      
      let matched = false
      if (tags.includes('recruiter') || role.includes('recruiter')) { counts['Recruiters']++; matched = true; }
      else if (tags.includes('hr') || role.includes('hr')) { counts['HR Managers']++; matched = true; }
      else if (tags.includes('refer')) { counts['Referrers']++; matched = true; }
      
      if (!matched) counts['Others']++
    })
    return counts
  }, [contacts])

  return (
    <section className="h-full pb-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>
          <p className="mt-1 text-sm text-gray-500">Your network of recruiters and HR contacts.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input 
              className="pl-10 pr-12 py-2.5 bg-white border border-gray-200 rounded-xl text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              placeholder="Search contacts, companies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
              <span className="px-1.5 py-0.5 rounded border border-gray-200 text-[10px] text-gray-400 font-medium bg-gray-50">⌘K</span>
            </div>
          </div>
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
            All Filters
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <UserPlusIcon />
            Add Contact
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-600">{error}</p>}

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard icon={<UserPlusIcon/>} label="Total Contacts" value={stats.total} />
        <StatCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} label="Active Contacts" value={stats.active} />
        <StatCard icon={<MailIcon/>} label="Responded" value={stats.responded} />
        <StatCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>} label="Response Rate" value={`${stats.responseRate}%`} />
        <StatCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M13 14h6v7"/><path d="M9 11v.01"/><path d="M9 15v.01"/><path d="M9 19v.01"/></svg>} label="Companies Covered" value={stats.companies} />
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Tabs */}
          <div className="flex gap-6 px-6 pt-4 border-b border-gray-100 overflow-x-auto">
            {['All Contacts', 'Recruiters', 'HR Managers', 'Referrers', 'Others'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* Table Controls */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex gap-3">
              <select className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-indigo-500">
                <option>All Companies</option>
              </select>
              <select className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-indigo-500">
                <option>All Tags</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white sticky top-0 z-10 border-b border-gray-100">
                <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold w-8"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></th>
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
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-sm text-gray-500">
                      {loading ? 'Loading contacts...' : 'No contacts found.'}
                    </td>
                  </tr>
                ) : paginated.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${getAvatarColor(c.name)}`}>
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{c.name}</p>
                          <p className="text-[11px] text-gray-500">{c.role || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {c.company ? (
                          <>
                            <div className="w-6 h-6 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                              {c.company[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-700">{c.company}</span>
                          </>
                        ) : <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{c.role || '—'}</td>
                    <td className="px-4 py-4 text-gray-600">{c.email || '—'}</td>
                    <td className="px-4 py-4 text-gray-600">{c.phone || '—'}</td>
                    <td className="px-4 py-4">
                      {c.last_contacted ? (
                        <div>
                          <p className="font-medium text-gray-700">{formatDate(c.last_contacted)}</p>
                          <p className="text-[11px] text-emerald-600 font-semibold">{getDaysAgo(c.last_contacted)}</p>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      {c.tags ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {c.tags.split(',')[0]}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Send Email">
                            <MailIcon />
                          </a>
                        )}
                        <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <DotsIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-white">
            <p className="text-xs text-gray-500 font-medium">
              Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} contacts
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
                    page === i + 1 ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <QuickAction icon={<UserPlusIcon/>} title="Add New Contact" desc="Manually add a new contact" color="text-indigo-600" bg="bg-indigo-50" onClick={() => setShowAddModal(true)} />
              <QuickAction icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>} title="Import Contacts" desc="Upload CSV or Excel file" color="text-emerald-600" bg="bg-emerald-50" />
              <QuickAction icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>} title="Sync LinkedIn" desc="Import connections" color="text-sky-600" bg="bg-sky-50" />
              <QuickAction icon={<MailIcon/>} title="Invite to Connect" desc="Send connection request" color="text-blue-600" bg="bg-blue-50" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex-1">
            <h3 className="text-xs font-bold text-gray-900 mb-4">Top Companies</h3>
            <div className="space-y-4">
              {topCompanies.length === 0 ? (
                <p className="text-xs text-gray-500">No company data.</p>
              ) : topCompanies.map(([comp, count], i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                      {comp[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]" title={comp}>{comp}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded">{count}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">View all companies →</button>
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 relative overflow-hidden group">
      <div className="flex items-start gap-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500">{label}</p>
          <p className="text-2xl font-black text-gray-900 mt-0.5 tracking-tight">{value}</p>
        </div>
      </div>
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-indigo-50 to-transparent rounded-full opacity-50 pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
    </div>
  )
}

function QuickAction({ icon, title, desc, color, bg, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors text-left group">
      <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-900">{title}</p>
        <p className="text-[10px] font-medium text-gray-500">{desc}</p>
      </div>
    </button>
  )
}
