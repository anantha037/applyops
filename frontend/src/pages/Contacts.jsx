import { useEffect, useState, useMemo, useCallback } from 'react'
import { api } from '../api/client'
import Dropdown from '../components/ui/Dropdown'

const MailIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7.00005L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7" /><rect x="3" y="5" width="18" height="14" rx="2" /></svg>
const PhoneIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
const UserPlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>

const APPLICATION_METHOD_OPTIONS = [
  { label: 'LinkedIn Easy Apply', value: 'LinkedIn Easy Apply' },
  { label: 'Company Portal', value: 'Company Portal' },
  { label: 'Referral', value: 'Referral' },
  { label: 'Email', value: 'Email' },
  { label: 'Career Page', value: 'Career Page' },
  { label: 'Other', value: 'Other' },
]

const ACTION_STATUS_OPTIONS = [
  { label: 'Not Contacted', value: 'Not Contacted' },
  { label: 'Outreach Sent', value: 'Outreach Sent' },
  { label: 'In Conversation', value: 'In Conversation' },
  { label: 'Meeting Scheduled', value: 'Meeting Scheduled' },
  { label: 'Referral Secured', value: 'Referral Secured' },
  { label: 'Interviewing', value: 'Interviewing' },
  { label: 'Ghosted', value: 'Ghosted' },
  { label: 'Not Interested', value: 'Not Interested' },
  { label: 'Closed', value: 'Closed' }
]

/** Normalise the tags field — backend sends "" or a comma string; UI uses Array.some(). */
function tagsArr(c) {
  if (Array.isArray(c.tags)) return c.tags
  if (!c.tags) return []
  return c.tags.split(',').map(t => t.trim()).filter(Boolean)
}

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
    'bg-emerald-500/10 text-emerald-400',
    'bg-rose-500/10 text-rose-400',
    'bg-amber-500/10 text-amber-400',
    'bg-sky-500/10 text-sky-400'
  ]
  let sum = 0
  for (let i = 0; i < (name || '').length; i++) sum += name.charCodeAt(i)
  return colors[sum % colors.length]
}

function MarkAsAppliedModal({ contact, onClose, onConfirm }) {
  const [method, setMethod] = useState('LinkedIn Easy Apply')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async e => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onConfirm(contact.id, method)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-80 duration-150" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-2xl border border-transparent shadow-2xl w-full max-w-md overflow-hidden select-none">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div>
            <h3 className="text-base font-bold text-foreground">Mark as Applied</h3>
            <p className="text-[11px] text-foreground-secondary font-medium">Confirm that you applied for a role through this contact.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-foreground-secondary hover:text-foreground hover:bg-surface-secondary/80 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          {error && <p className="text-xs text-rose-400 bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">{error}</p>}

          <div className="p-3 rounded-xl bg-surface-secondary/50 border border-transparent">
            <p className="text-xs font-bold text-foreground">{contact.name}</p>
            <p className="text-[11px] text-foreground-secondary font-medium">{contact.role || 'Contact'} {contact.company ? `· ${contact.company}` : ''}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">How did you apply? *</label>
            <Dropdown
              options={APPLICATION_METHOD_OPTIONS}
              value={method}
              onChange={setMethod}
              className="w-full"
              align="left"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-foreground-secondary hover:bg-surface-secondary/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-all shadow-2xs active:scale-95"
            >
              {submitting ? 'Confirming…' : 'Confirm Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddContactModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    company: '',
    role: '',
    email: '',
    phone: '',
    mark_applied: false,
    application_method: 'LinkedIn Easy Apply',
    tags: '',
    notes: '',
    linkedin_url: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        applied: form.mark_applied,
        application_method: form.mark_applied ? form.application_method : null
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-80 duration-150" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-2xl border border-transparent shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-none select-none">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserPlusIcon />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Add New Contact</h3>
              <p className="text-[11px] text-foreground-secondary font-medium">Create a contact or recruiter entry</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-foreground-secondary hover:text-foreground hover:bg-surface-secondary/80 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          {error && <p className="text-xs text-rose-400 bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">{error}</p>}
          
          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Name *</label>
            <input
              required
              placeholder="Contact name"
              className="w-full rounded-xl border border-transparent bg-surface-secondary/60 hover:bg-surface-secondary/80 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Company</label>
              <input
                placeholder="Company"
                className="w-full rounded-xl border border-transparent bg-surface-secondary/60 hover:bg-surface-secondary/80 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                value={form.company}
                onChange={e => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Role</label>
              <input
                placeholder="e.g. Technical Recruiter"
                className="w-full rounded-xl border border-transparent bg-surface-secondary/60 hover:bg-surface-secondary/80 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Email</label>
              <input
                type="email"
                placeholder="john@company.com"
                className="w-full rounded-xl border border-transparent bg-surface-secondary/60 hover:bg-surface-secondary/80 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Phone</label>
              <input
                placeholder="+1 (555) 000-0000"
                className="w-full rounded-xl border border-transparent bg-surface-secondary/60 hover:bg-surface-secondary/80 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-1">
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">
              Do you want to mark this contact as applied?
            </label>
            <div className="flex rounded-xl bg-surface-secondary p-1 gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setForm({ ...form, mark_applied: false })}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none flex-1 sm:flex-initial ${
                  !form.mark_applied
                    ? 'bg-surface text-primary shadow-2xs'
                    : 'text-foreground-secondary hover:text-foreground'
                }`}
              >
                Not applied
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, mark_applied: true })}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none flex-1 sm:flex-initial ${
                  form.mark_applied
                    ? 'bg-surface text-primary shadow-2xs'
                    : 'text-foreground-secondary hover:text-foreground'
                }`}
              >
                Mark as applied
              </button>
            </div>

            {form.mark_applied && (
              <div className="mt-3.5 space-y-1.5 animate-in fade-in-50 duration-150">
                <label className="block text-xs font-semibold text-foreground-secondary">How did you apply? *</label>
                <Dropdown
                  options={APPLICATION_METHOD_OPTIONS}
                  value={form.application_method}
                  onChange={val => setForm({ ...form, application_method: val })}
                  className="w-full"
                  align="left"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Tags (comma-separated)</label>
            <input
              placeholder="e.g. Recruiter, High Priority"
              className="w-full rounded-xl border border-transparent bg-surface-secondary/60 hover:bg-surface-secondary/80 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">LinkedIn Profile URL</label>
            <input
              type="url"
              placeholder="https://linkedin.com/in/..."
              className="w-full rounded-xl border border-transparent bg-surface-secondary/60 hover:bg-surface-secondary/80 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              value={form.linkedin_url}
              onChange={e => setForm({ ...form, linkedin_url: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes"
              className="w-full rounded-xl border border-transparent bg-surface-secondary/60 hover:bg-surface-secondary/80 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all resize-none"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-foreground-secondary hover:bg-surface-secondary/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-all shadow-2xs active:scale-95"
            >
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InlineLinkedinEdit({ contact, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(contact.linkedin_url || '')

  const handleSave = () => {
    setEditing(false)
    if (val !== contact.linkedin_url) {
      onSave(contact.id, val)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="url"
        className="w-24 sm:w-32 rounded bg-surface border border-primary/50 px-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') { setVal(contact.linkedin_url || ''); setEditing(false) }
        }}
      />
    )
  }

  return (
    <div className="group flex items-center gap-1.5 min-w-[80px]">
      {contact.linkedin_url ? (
        <a 
          href={contact.linkedin_url.startsWith('http') ? contact.linkedin_url : `https://${contact.linkedin_url}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-primary hover:underline truncate max-w-[100px]"
          title={contact.linkedin_url}
        >
          LinkedIn
        </a>
      ) : (
        <span className="text-muted/50 text-[10px] italic">No URL</span>
      )}
      <button 
        onClick={(e) => { e.stopPropagation(); setVal(contact.linkedin_url || ''); setEditing(true) }} 
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-foreground-secondary hover:text-primary hover:bg-surface-secondary transition-all"
        title="Edit LinkedIn URL"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      </button>
    </div>
  )
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All Contacts')
  const [appFilter, setAppFilter] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [applyTargetContact, setApplyTargetContact] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.contacts()
      setContacts(res || [])
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

  const handleConfirmMarkApplied = async (contactId, method) => {
    try {
      await api.contactsApi?.markAsApplied ? api.contactsApi.markAsApplied(contactId, { application_method: method }) : Promise.resolve()
    } catch (e) {
      setError(e.message || 'Failed to mark contact as applied')
      throw e
    }
    await load()
  }

  const handleUpdateLinkedin = async (contactId, newUrl) => {
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, linkedin_url: newUrl } : c))
    try {
      await api.updateContact(contactId, { linkedin_url: newUrl })
    } catch (e) {
      console.error('Failed to update linkedin', e)
    }
  }

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = !search || 
        [c.name, c.company, c.role, c.email].some(f => f?.toLowerCase().includes(search.toLowerCase()))
      
      if (!matchesSearch) return false

      if (appFilter === 'Applied' && !c.applied && !c.application_method && !c.application_id) return false
      if (appFilter === 'Not Applied' && (c.applied || c.application_method || c.application_id)) return false

      if (activeTab === 'Recruiters') return c.role?.toLowerCase().includes('recruiter')
      if (activeTab === 'HR Managers') return c.role?.toLowerCase().includes('hr') || c.role?.toLowerCase().includes('people')
      if (activeTab === 'Referrers') return tagsArr(c).some(t => t.toLowerCase() === 'referrer' || t.toLowerCase() === 'referral')
      if (activeTab === 'Others') {
        const isRec = c.role?.toLowerCase().includes('recruiter')
        const isHr = c.role?.toLowerCase().includes('hr') || c.role?.toLowerCase().includes('people')
        const isRef = tagsArr(c).some(t => t.toLowerCase() === 'referrer' || t.toLowerCase() === 'referral')
        return !isRec && !isHr && !isRef
      }

      return true
    })
  }, [contacts, search, activeTab, appFilter])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage])

  const totalPages = Math.ceil(filtered.length / pageSize) || 1

  const tabCounts = useMemo(() => {
    const counts = { 'All Contacts': contacts.length, Recruiters: 0, 'HR Managers': 0, Referrers: 0, Others: 0 }
    contacts.forEach(c => {
      const role = c.role?.toLowerCase() || ''
      const isRec = role.includes('recruiter')
      const isHr = role.includes('hr') || role.includes('people')
      const isRef = tagsArr(c).some(t => t.toLowerCase() === 'referrer' || t.toLowerCase() === 'referral')
      
      if (isRec) counts.Recruiters++
      if (isHr) counts['HR Managers']++
      if (isRef) counts.Referrers++
      if (!isRec && !isHr && !isRef) counts.Others++
    })
    return counts
  }, [contacts])

  const stats = useMemo(() => {
    const total = contacts.length
    const active = contacts.filter(c => c.last_contacted).length
    const responded = contacts.filter(c => c.responded === true || c.responded === 'true' || c.responded === 'Yes').length
    const responseRate = total ? Math.round((responded / total) * 100) : 0
    const companies = new Set(contacts.map(c => c.company).filter(Boolean)).size
    return { total, active, responded, responseRate, companies }
  }, [contacts])

  return (
    <section className="h-full pb-8 flex flex-col gap-6 max-w-full select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Contacts</h2>
          <p className="mt-0.5 text-xs font-medium text-foreground-secondary">
            Manage recruiters, hiring managers, and professional contacts.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-all shadow-2xs active:scale-95 self-start sm:self-auto"
        >
          <UserPlusIcon />
          <span>Add Contact</span>
        </button>
      </div>

      {error && <p className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs font-medium text-rose-400">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        <StatCard icon={<UserPlusIcon/>} label="Total Contacts" value={stats.total} />
        <StatCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} label="Active Contacts" value={stats.active} />
        <StatCard icon={<MailIcon/>} label="Responded" value={stats.responded} />
        <StatCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>} label="Response Rate" value={`${stats.responseRate}%`} />
        <StatCard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M13 14h6v7"/><path d="M9 11v.01"/><path d="M9 15v.01"/><path d="M9 19v.01"/></svg>} label="Companies Covered" value={stats.companies} />
      </div>

      <div className="panel rounded-2xl border border-transparent bg-surface p-5 shadow-2xs flex-1 flex flex-col min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex rounded-xl bg-surface-secondary p-1">
              {['All Contacts', 'Recruiters', 'Hiring Managers', 'Referrers', 'Others'].map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setCurrentPage(1) }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === tab
                      ? 'bg-surface text-primary shadow-2xs'
                      : 'text-foreground-secondary hover:text-foreground'
                  }`}
                >
                  {tab}
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === tab ? 'bg-primary/15 text-primary' : 'bg-surface-secondary text-foreground-secondary'}`}>
                    {tabCounts[tab]}
                  </span>
                </button>
              ))}
            </div>

            <Dropdown
              prefix="Application"
              options={[
                { label: 'All', value: 'All' },
                { label: 'Applied', value: 'Applied' },
                { label: 'Not Applied', value: 'Not Applied' }
              ]}
              value={appFilter}
              onChange={setAppFilter}
              align="left"
            />
          </div>

          <div className="relative w-full sm:w-72">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/60" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input 
              placeholder="Search contacts, companies, roles…" 
              className="w-full rounded-xl border border-transparent bg-surface-secondary/60 hover:bg-surface-secondary/80 pl-9 pr-3.5 py-2 text-xs text-foreground placeholder:text-muted/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all" 
              value={search} 
              onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} 
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider">
                <th className="py-2.5 px-3.5 font-bold">Contact</th>
                <th className="py-2.5 px-3.5 font-bold">Company</th>
                <th className="py-2.5 px-3.5 font-bold">Role</th>
                <th className="py-2.5 px-3.5 font-bold">Email</th>
                <th className="py-2.5 px-3.5 font-bold">Phone</th>
                <th className="py-2.5 px-3.5 font-bold">LinkedIn</th>
                <th className="py-2.5 px-3.5 font-bold">Application</th>
                <th className="py-2.5 px-3.5 font-bold">Last Action</th>
                <th className="py-2.5 px-3.5 font-bold">Last Contact</th>
                <th className="py-2.5 px-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-xs text-muted">
                    {loading ? 'Loading contacts…' : 'No contacts found. Try another search or filter.'}
                  </td>
                </tr>
              ) : paginated.map(c => {
                const isApplied = c.applied || Boolean(c.application_method) || Boolean(c.application_id)
                return (
                  <tr key={c.id} className="hover:bg-surface-secondary/40 transition-colors group rounded-xl">
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${getAvatarColor(c.name)}`}>
                          {getInitials(c.name)}
                        </div>
                        <span className="font-bold text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 text-foreground-secondary font-medium">{c.company || '—'}</td>
                    <td className="py-3.5 px-3.5 text-foreground-secondary font-medium">{c.role || '—'}</td>
                    <td className="py-3.5 px-3.5 text-foreground-secondary font-medium">{c.email || '—'}</td>
                    <td className="py-3.5 px-3.5 text-foreground-secondary font-medium">{c.phone || '—'}</td>
                    <td className="py-3.5 px-3.5 text-foreground-secondary font-medium">
                      <InlineLinkedinEdit contact={c} onSave={handleUpdateLinkedin} />
                    </td>
                    <td className="py-3.5 px-3.5">
                      {isApplied ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Applied
                          </span>
                          <span className="text-[10px] text-foreground-secondary opacity-70 font-medium pl-3">
                            {c.application_method || 'LinkedIn Easy Apply'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground-secondary opacity-50">Not applied</span>
                          <button
                            onClick={() => setApplyTargetContact(c)}
                            className="text-[11px] font-semibold text-primary hover:underline focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Mark as applied
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5">
                      <div className="flex flex-col gap-1 w-[160px]">
                        <Dropdown
                          size="sm"
                          options={ACTION_STATUS_OPTIONS}
                          value={c.last_action_status || 'Not Contacted'}
                          triggerClassName="bg-surface-secondary/60 text-foreground-secondary hover:text-foreground hover:bg-surface-secondary w-full"
                          onChange={val => {
                            const newStatus = val
                            setContacts(prev => prev.map(contact => contact.id === c.id ? { ...contact, last_action_status: newStatus } : contact))
                            api.updateContact(c.id, { last_action_status: newStatus }).catch(err => {
                              console.error(err)
                              // optionally show an error somewhere
                            })
                          }}
                          align="left"
                        />
                        {c.last_action_date && (
                          <span className="text-[10px] text-muted pl-1">
                            Updated {formatDate(c.last_action_date)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5">
                      <div className="flex flex-col">
                        <span className="text-foreground-secondary font-medium">{formatDate(c.last_contacted)}</span>
                        <span className="text-[10px] text-muted">{getDaysAgo(c.last_contacted)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.email && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(c.email)}`, '_blank', 'noopener,noreferrer')
                            }}
                            title={`Email ${c.name} via Gmail`}
                            className="p-1.5 rounded-lg text-foreground-secondary hover:text-primary hover:bg-surface-secondary transition-colors focus:outline-none"
                          >
                            <MailIcon />
                          </button>
                        )}
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            title={`Call ${c.name}`}
                            className="p-1.5 rounded-lg text-foreground-secondary hover:text-primary hover:bg-surface-secondary transition-colors"
                          >
                            <PhoneIcon />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pt-4 mt-2 border-t border-border/10 flex items-center justify-between text-xs text-foreground-secondary">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-xl bg-surface-secondary text-foreground-secondary hover:text-foreground disabled:opacity-40 font-semibold transition-colors"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-xl bg-surface-secondary text-foreground-secondary hover:text-foreground disabled:opacity-40 font-semibold transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddContactModal onClose={() => setShowAddModal(false)} onSave={handleAdd} />
      )}

      {applyTargetContact && (
        <MarkAsAppliedModal
          contact={applyTargetContact}
          onClose={() => setApplyTargetContact(null)}
          onConfirm={handleConfirmMarkApplied}
        />
      )}
    </section>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="panel rounded-2xl border border-transparent bg-surface p-4 shadow-2xs group">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground-secondary">{label}</p>
          <p className="text-xl font-extrabold text-foreground mt-0.5 tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  )
}
