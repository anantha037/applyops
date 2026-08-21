import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Dropdown from '../components/ui/Dropdown'
import ManageResumesModal from '../components/ManageResumesModal'
import {
  Plus, X, Search, Check, AlertCircle, Calendar, Sparkles,
  Briefcase, Send, Clock, CalendarCheck, Trophy, XCircle, Ghost, ChevronDown, ChevronUp,
  FileText, Eye, Download, Edit, Trash2
} from 'lucide-react'


const METHODS = ['Company Website', 'LinkedIn', 'Referral', 'Wellfound', 'Indeed', 'Naukri', 'Other']
const METHOD_DROPDOWN_OPTIONS = METHODS.map(m => ({ label: m, value: m }))

const ACTION_TYPE_OPTIONS = [
  { label: 'Follow Up', value: 'Follow Up' },
  { label: 'Recruiter Call', value: 'Recruiter Call' },
  { label: 'Send Email', value: 'Send Email' },
  { label: 'Prepare for Interview', value: 'Prepare for Interview' },
  { label: 'Send Thank-you', value: 'Send Thank-you' },
  { label: 'Review Offer', value: 'Review Offer' },
  { label: 'Custom', value: 'Custom' }
]

const TIME_OPTIONS = [
  { label: '09:00 AM', value: '09:00 AM' },
  { label: '10:00 AM', value: '10:00 AM' },
  { label: '11:00 AM', value: '11:00 AM' },
  { label: '01:00 PM', value: '01:00 PM' },
  { label: '02:00 PM', value: '02:00 PM' },
  { label: '03:00 PM', value: '03:00 PM' },
  { label: '04:00 PM', value: '04:00 PM' },
  { label: '05:00 PM', value: '05:00 PM' }
]

const STATUS_TRIGGER_CLASSES = {
  'In Progress':   'bg-info/10 text-info hover:bg-info/20',
  'Interviewing':  'bg-primary/10 text-primary hover:bg-primary/20',
  'Offer Received':'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
  'Rejected':      'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20',
  'Ghosted':       'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
}

const STATUS_DROPDOWN_OPTIONS = [
  { label: 'Not Contacted', value: 'Not Contacted', dotColor: 'bg-slate-400' },
  { label: 'In Progress',   value: 'In Progress',   dotColor: 'bg-info' },
  { label: 'Interviewing',  value: 'Interviewing',  dotColor: 'bg-primary' },
  { label: 'Offer Received',value: 'Offer Received',dotColor: 'bg-emerald-400' },
  { label: 'Rejected',      value: 'Rejected',      dotColor: 'bg-rose-400' },
  { label: 'Ghosted',       value: 'Ghosted',       dotColor: 'bg-amber-400' }
]

const STAGE_DROPDOWN_OPTIONS = [
  { label: 'Applied', value: 'Applied' },
  { label: 'Called', value: 'Called' },
  { label: 'Emailed', value: 'Emailed' },
  { label: 'Follow-up 1', value: 'Follow-up 1' },
  { label: 'Follow-up 2', value: 'Follow-up 2' },
  { label: 'Follow-up 3', value: 'Follow-up 3' },
  { label: 'Closed', value: 'Closed' }
]

function getFutureDateStr(daysAhead) {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().split('T')[0]
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[dt.getMonth()]} ${dt.getDate()}`
  } catch {
    return dateStr
  }
}

function ApplicationStatusIcon({ status }) {
  switch (status) {
    case 'In Progress':
      return (
        <div className="w-8 h-8 rounded-xl bg-info/10 text-info flex items-center justify-center flex-shrink-0">
          <Send className="w-4 h-4" />
        </div>
      )
    case 'Interviewing':
      return (
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <CalendarCheck className="w-4 h-4" />
        </div>
      )
    case 'Offer Received':
      return (
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-4 h-4" />
        </div>
      )
    case 'Rejected':
      return (
        <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0">
          <XCircle className="w-4 h-4" />
        </div>
      )
    case 'Ghosted':
    default:
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
          <Clock className="w-4 h-4" />
        </div>
      )
  }
}

function NextActionCell({ action, onClick }) {
  if (!action || (!action.date && !action.title)) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-xs text-foreground-secondary/60 hover:text-primary transition-colors flex items-center gap-1 group/btn"
      >
        <span className="text-muted/60">—</span>
        <span className="hidden group-hover/btn:inline text-[11px] font-semibold text-primary ml-1">+ Set action</span>
      </button>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = action.date && action.date < today && !action.completed
  const isToday = action.date && action.date === today && !action.completed
  const isCompleted = action.completed

  let statusBadge = null
  if (isCompleted) {
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-[11px]">
        <Check className="w-3.5 h-3.5" />
        Completed
      </span>
    )
  } else if (isOverdue) {
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 font-bold text-[11px]">
        <AlertCircle className="w-3.5 h-3.5" />
        Overdue · {formatDateDisplay(action.date)}
      </span>
    )
  } else if (isToday) {
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-[11px]">
        <Clock className="w-3.5 h-3.5" />
        Today {action.time ? `· ${action.time}` : ''}
      </span>
    )
  } else {
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-secondary text-foreground-secondary hover:text-foreground font-semibold text-[11px] transition-colors">
        <Calendar className="w-3.5 h-3.5 opacity-70" />
        {formatDateDisplay(action.date)} {action.time ? `· ${action.time}` : ''}
      </span>
    )
  }

  return (
    <div onClick={onClick} className="inline-block cursor-pointer hover:opacity-90 transition-opacity">
      {statusBadge}
    </div>
  )
}

function ViewResumeModal({ resume, onClose, onDownload }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (resume && resume.id) {
      setLoading(true)
      api.getResumeUrl(resume.id)
        .then(data => setUrl(data.url))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [resume])

  if (!resume) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-80 duration-150" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Resume Preview</h3>
              <p className="text-xs text-foreground-secondary font-medium truncate max-w-md" title={resume.fileName || resume.filename}>{resume.fileName || resume.filename}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 bg-background relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 text-foreground-secondary">
              <AlertCircle className="w-8 h-8 text-red-500/70" />
              <p className="text-sm font-medium">Failed to load preview: {error}</p>
            </div>
          )}
          {url && (
            <iframe 
              src={`${url}#toolbar=0`} 
              className="w-full h-full border-0"
              title="Resume PDF Preview"
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover transition-all shadow-2xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function EditNextActionModal({ app, onClose, onSave, onRemove }) {
  if (!app) return null

  const existing = app.next_action || {
    id: `act_${Date.now()}`,
    type: 'Follow Up',
    title: 'Follow up with recruiter',
    date: app.next_action_due || getFutureDateStr(2),
    time: '10:00 AM',
    completed: false
  }

  const [form, setForm] = useState({
    type: existing.type || 'Follow Up',
    title: existing.title || 'Follow up with recruiter',
    date: existing.date || getFutureDateStr(2),
    time: existing.time || '10:00 AM',
    completed: existing.completed || false
  })

  const submit = e => {
    e.preventDefault()
    onSave(app.id, {
      ...existing,
      ...form,
      title: form.title || form.type
    })
    onClose()
  }

  const handleTypeChange = (newType) => {
    let suggestedTitle = form.title
    if (!form.title || form.title === form.type || form.title === 'Follow up with recruiter') {
      if (newType === 'Follow Up') suggestedTitle = 'Follow up with recruiter'
      else if (newType === 'Recruiter Call') suggestedTitle = 'Recruiter introductory call'
      else if (newType === 'Send Email') suggestedTitle = 'Send status check email'
      else if (newType === 'Prepare for Interview') suggestedTitle = 'Prepare for interview'
      else if (newType === 'Send Thank-you') suggestedTitle = 'Send thank-you email'
      else if (newType === 'Review Offer') suggestedTitle = 'Review offer details'
    }
    setForm({ ...form, type: newType, title: suggestedTitle })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-80 duration-150" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-2xl border border-white/5 shadow-2xl w-full max-w-md overflow-hidden select-none">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Edit Next Action</h3>
              <p className="text-[11px] text-foreground-secondary font-medium">{app.company} · {app.job_title}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Action Type</label>
            <Dropdown
              options={ACTION_TYPE_OPTIONS}
              value={form.type}
              onChange={handleTypeChange}
              className="w-full"
              triggerClassName="bg-surface-secondary text-foreground hover:bg-surface-tertiary border border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Action Title</label>
            <input
              required
              placeholder="e.g. Follow up with recruiter"
              className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Date</label>
              <input
                type="date"
                required
                className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all [color-scheme:dark]"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Time</label>
              <Dropdown
                options={TIME_OPTIONS}
                value={form.time || '10:00 AM'}
                onChange={val => setForm({ ...form, time: val })}
                className="w-full"
                triggerClassName="bg-surface-secondary text-foreground hover:bg-surface-tertiary border border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="chk_completed"
              checked={form.completed}
              onChange={e => setForm({ ...form, completed: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-primary/25 bg-surface-secondary border-transparent"
            />
            <label htmlFor="chk_completed" className="text-xs font-semibold text-foreground cursor-pointer">
              Mark action as completed
            </label>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            {app.next_action ? (
              <button
                type="button"
                onClick={() => { onRemove(app.id); onClose() }}
                className="text-xs font-semibold text-rose-400 hover:underline focus:outline-none"
              >
                Remove Action
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-foreground-secondary hover:bg-surface-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-all shadow-2xs active:scale-95"
              >
                Save Action
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function StatusSuggestionModal({ prompt, onClose, onAccept, onKeep, onRemove, onCustomize }) {
  if (!prompt) return null

  const { app, newStatus, suggestedAction, isRejectedPrompt, isOfferPrompt } = prompt

  if (isRejectedPrompt || isOfferPrompt) {
    const isOffer = isOfferPrompt
    const Icon = isOffer ? Trophy : XCircle
    const iconStyle = isOffer ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
    const title = isOffer ? 'Application Marked as Offer Received' : 'Application Marked as Rejected'
    const desc = isOffer
      ? 'This application is marked as Offer Received. The Next Action time has been automatically removed and action marked as Completed.'
      : 'This application is marked as Rejected. The Next Action time has been automatically removed and action marked as Completed.'
    const removeBtnStyle = isOffer
      ? 'bg-emerald-500 hover:bg-emerald-600'
      : 'bg-rose-500 hover:bg-rose-600'

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-80 duration-150" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="bg-surface rounded-2xl border border-white/5 shadow-2xl w-full max-w-md p-6 select-none">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconStyle}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{title}</h3>
              <p className="text-xs text-foreground-secondary">{app.company} · {app.job_title}</p>
            </div>
          </div>

          <p className="text-xs text-foreground-secondary leading-relaxed mb-5">
            {desc} Would you like to keep the completed status or remove the reminder entirely?
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
            <button
              onClick={() => { onKeep(); onClose() }}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-foreground-secondary hover:bg-surface-tertiary transition-colors"
            >
              Keep Completed
            </button>
            <button
              onClick={() => { onRemove(); onClose() }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all shadow-2xs active:scale-95 ${removeBtnStyle}`}
            >
              Remove Reminder
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-80 duration-150" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-2xl border border-white/5 shadow-2xl w-full max-w-md p-6 select-none">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Status Updated to {newStatus}</h3>
            <p className="text-xs text-foreground-secondary">{app.company} · {app.job_title}</p>
          </div>
        </div>

        <div className="bg-surface-secondary rounded-xl p-3.5 my-4 border border-transparent space-y-1 text-xs">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Suggested Next Action</span>
          <p className="font-bold text-foreground">{suggestedAction?.title}</p>
          <p className="text-foreground-secondary font-medium text-[11px]">
            Scheduled for {formatDateDisplay(suggestedAction?.date)} · {suggestedAction?.time}
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => { onAccept(suggestedAction); onClose() }}
            className="w-full rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Use Suggested Action</span>
          </button>
          
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => { onKeep(); onClose() }}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-foreground-secondary bg-surface-secondary hover:bg-surface-secondary transition-colors"
            >
              Keep Current Action
            </button>
            <button
              onClick={() => { onCustomize(suggestedAction); onClose() }}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              Customize
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PostCreateBanner({ info, onDismiss, onEdit }) {
  if (!info) return null

  return (
    <div className="mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center justify-between text-xs text-emerald-400 animate-in fade-in-50 duration-200">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <p className="font-bold text-foreground">Application Created: {info.company} ({info.job_title})</p>
          <p className="text-[11px] text-foreground-secondary mt-0.5">
            Next action scheduled: <strong className="text-foreground">{info.next_action?.title}</strong> on {formatDateDisplay(info.next_action?.date)} at {info.next_action?.time}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-bold hover:bg-primary-hover transition-all"
        >
          Edit Action
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 text-foreground-secondary hover:text-foreground rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function ApplicationModal({ isEdit, isOpen, onClose, onSubmit, form, setForm, resumes = [], onUploadResume, onManageResumes }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-80 duration-150"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-2xl border border-white/5 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-none select-none">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{isEdit ? 'Edit Application' : 'New Application'}</h3>
              <p className="text-[11px] text-foreground-secondary font-medium">{isEdit ? 'Update existing application details' : 'Add a new job application to your tracking pipeline'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Company Name *</label>
            <input
              required
              placeholder="e.g. Stripe, Linear, Vercel"
              className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              value={form.company}
              onChange={e => setForm({ ...form, company: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Job Title / Role *</label>
            <input
              required
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              value={form.job_title}
              onChange={e => setForm({ ...form, job_title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Date Applied *</label>
              <input
                type="date"
                required
                className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all [color-scheme:dark]"
                value={form.date_applied || ''}
                onChange={e => setForm({ ...form, date_applied: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Location (Optional)</label>
              <input
                placeholder="e.g. San Francisco, Remote, NYC"
                className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Application Method</label>
            <div className="w-full">
              <Dropdown
                options={METHOD_DROPDOWN_OPTIONS}
                value={form.application_method}
                onChange={val => setForm({ ...form, application_method: val })}
                className="w-full"
                align="left"
                triggerClassName="bg-surface-secondary text-foreground hover:bg-surface-tertiary border border-transparent"
              />
            </div>
            {form.application_method === 'Other' && (
              <input
                placeholder="Please specify..."
                className="w-full mt-2 rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                value={form.application_method_other || ''}
                onChange={e => setForm({ ...form, application_method_other: e.target.value })}
              />
            )}
          </div>

          <div className="pt-2 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                <span>Contact Details (Optional)</span>
              </label>
              <input
                type="checkbox"
                checked={form.has_contact}
                onChange={e => setForm({ ...form, has_contact: e.target.checked })}
                className="w-4 h-4 rounded text-primary focus:ring-primary/25 bg-surface-secondary border-transparent"
              />
            </div>

            {form.has_contact && (
              <div className="space-y-3 p-3.5 rounded-xl bg-surface-secondary border border-transparent">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground-secondary mb-1">Name</label>
                    <input
                      placeholder="e.g. Jane Doe"
                      className="w-full rounded-lg border border-transparent bg-surface-secondary px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      value={form.contact_name}
                      onChange={e => setForm({ ...form, contact_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground-secondary mb-1">Role</label>
                    <input
                      placeholder="e.g. Recruiter"
                      className="w-full rounded-lg border border-transparent bg-surface-secondary px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      value={form.contact_role}
                      onChange={e => setForm({ ...form, contact_role: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground-secondary mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="jane@example.com"
                      className="w-full rounded-lg border border-transparent bg-surface-secondary px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      value={form.contact_email}
                      onChange={e => setForm({ ...form, contact_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground-secondary mb-1">Phone</label>
                    <input
                      placeholder="+1234567890"
                      className="w-full rounded-lg border border-transparent bg-surface-secondary px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      value={form.contact_phone}
                      onChange={e => setForm({ ...form, contact_phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground-secondary mb-1">LinkedIn Profile</label>
                  <input
                    placeholder="https://linkedin.com/in/..."
                    className="w-full rounded-lg border border-transparent bg-surface-secondary px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.contact_linkedin}
                    onChange={e => setForm({ ...form, contact_linkedin: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Resume (Optional)</span>
              </label>
            </div>
            
            <div className="space-y-3 p-3.5 rounded-xl bg-surface-secondary border border-transparent">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-foreground-secondary">Select existing resume</label>
                  <button type="button" onClick={onManageResumes} className="text-[10px] font-bold text-primary hover:text-primary-hover">Manage Resumes</button>
                </div>
                <Dropdown
                  options={[{label: 'None', value: ''}, ...resumes.map(r => ({ label: `${r.filename} (Uploaded: ${r.uploaded_at ? r.uploaded_at.split('T')[0] : 'Unknown'})`, value: r.id }))]}
                  value={form.resume_id}
                  onChange={val => setForm({ ...form, resume_id: val })}
                  className="w-full"
                  triggerClassName="bg-surface-secondary text-foreground hover:bg-surface-tertiary border border-transparent"
                />
              </div>
              
              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-foreground-secondary mb-1">Or upload new resume PDF</label>
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      onUploadResume(e.target.files[0])
                      e.target.value = null
                    }
                  }}
                  className="w-full text-xs text-foreground-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Next Action Reminder</span>
              </label>
              <input
                type="checkbox"
                checked={form.enable_next_action}
                onChange={e => setForm({ ...form, enable_next_action: e.target.checked })}
                className="w-4 h-4 rounded text-primary focus:ring-primary/25 bg-surface-secondary border-transparent"
              />
            </div>

            {form.enable_next_action && (
              <div className="space-y-3 p-3.5 rounded-xl bg-surface-secondary border border-transparent">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground-secondary mb-1">Action Type</label>
                  <Dropdown
                    options={ACTION_TYPE_OPTIONS}
                    value={form.next_action_type}
                    onChange={val => {
                      let title = form.next_action_title
                      if (val === 'Follow Up') title = 'Follow up with recruiter'
                      else if (val === 'Prepare for Interview') title = 'Prepare for interview'
                      else if (val === 'Review Offer') title = 'Review offer details'
                      setForm({ ...form, next_action_type: val, next_action_title: title })
                    }}
                    className="w-full"
                    size="sm"
                    triggerClassName="bg-surface-secondary text-foreground hover:bg-surface-tertiary border border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground-secondary mb-1">Title</label>
                  <input
                    placeholder="e.g. Follow up with recruiter"
                    className="w-full rounded-lg border border-transparent bg-surface-secondary px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.next_action_title}
                    onChange={e => setForm({ ...form, next_action_title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground-secondary mb-1">Date</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-transparent bg-surface-secondary px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
                      value={form.next_action_date}
                      onChange={e => setForm({ ...form, next_action_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground-secondary mb-1">Time</label>
                    <Dropdown
                      options={TIME_OPTIONS}
                      value={form.next_action_time}
                      onChange={val => setForm({ ...form, next_action_time: val })}
                      className="w-full"
                      size="sm"
                      triggerClassName="bg-surface-secondary text-foreground hover:bg-surface-tertiary border border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-foreground-secondary hover:bg-surface-tertiary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-all shadow-2xs active:scale-95"
            >
              Create Application
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  date_applied: new Date().toISOString().split('T')[0],
  company: '',
  job_title: '',
  location: '',
  application_method: 'LinkedIn',
  application_method_other: '',
  has_contact: false,
  contact_name: '',
  contact_role: '',
  contact_email: '',
  contact_phone: '',
  contact_linkedin: '',
  resume_id: '',
  enable_next_action: true,
  next_action_type: 'Follow Up',
  next_action_title: 'Follow up with recruiter',
  next_action_date: getFutureDateStr(2),
  next_action_time: '10:00 AM'
}
const INITIAL_LIMIT = 5

export default function Applications() {
  const [apps, setApps] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editApp, setEditApp] = useState(null)
  const [deleteAppId, setDeleteAppId] = useState(null)
  const [previewResume, setPreviewResume] = useState(null)
  const [editActionApp, setEditActionApp] = useState(null)
  const [statusPrompt, setStatusPrompt] = useState(null)
  const [createdBannerInfo, setCreatedBannerInfo] = useState(null)

  const [filterStatus, setFilterStatus] = useState('All')
  const [filterStage, setFilterStage] = useState('All')
  const [search, setSearch] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [showManageResumes, setShowManageResumes] = useState(false)
  
  const [resumes, setResumes] = useState([])

  const load = () => {
    setLoading(true)
    Promise.all([
      api.applications(),
      api.listResumes().catch(e => {
        console.error("Failed to load resumes", e)
        return []
      })
    ])
    .then(([fetchedApps, fetchedResumes]) => {
      setResumes(fetchedResumes)
      const appsWithResumes = fetchedApps.map(app => {
        if (app.resume_id) {
          const resObj = fetchedResumes.find(r => r.id === app.resume_id)
          if (resObj) {
            app.resume = {
              id: resObj.id,
              fileName: resObj.filename,
              fileSize: '—'
            }
          }
        }
        return app
      })
      setApps(appsWithResumes)
      
      // Handle cross-page navigation actions
      const pendingActionStr = sessionStorage.getItem('applyops_pending_action')
      if (pendingActionStr) {
        sessionStorage.removeItem('applyops_pending_action')
        try {
          const pendingAction = JSON.parse(pendingActionStr)
          if (pendingAction.type === 'edit_app') {
            const targetApp = appsWithResumes.find(a => a.id === pendingAction.appId)
            if (targetApp) {
              setEditApp(targetApp)
              setForm({
                ...EMPTY_FORM,
                ...targetApp,
                has_contact: !!(targetApp.contact_name || targetApp.contact_email || targetApp.contact_phone || targetApp.contact_linkedin)
              })
              setShowAddModal(true)
            }
          } else if (pendingAction.type === 'new_from_contact') {
            const contact = pendingAction.contact
            setEditApp(null)
            setForm({
              ...EMPTY_FORM,
              has_contact: true,
              contact_name: contact.name || '',
              contact_role: contact.role || '',
              contact_email: contact.email || '',
              contact_phone: contact.phone || '',
              contact_linkedin: contact.linkedin_url || ''
            })
            setShowAddModal(true)
          }
        } catch (err) {
          console.error('Failed to parse pending action', err)
        }
      }
    })
    .catch(e => setError(e.message))
    .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleEditClick = (app) => {
    setEditApp(app)
    setForm({
      ...EMPTY_FORM,
      ...app,
      has_contact: !!(app.contact_name || app.contact_email || app.contact_phone || app.contact_linkedin)
    })
    setShowAddModal(true)
  }

  const handleUploadResume = async (file) => {
    try {
      const result = await api.uploadResume(file)
      setResumes(prev => [...prev, result])
      setForm(prev => ({ ...prev, resume_id: result.id }))
    } catch (e) {
      if (e.status === 409 && e.existing_resume) {
        if (window.confirm(`${e.message}\n\nWould you like to use this existing resume instead?`)) {
          setForm(prev => ({ ...prev, resume_id: e.existing_resume.id }))
        }
      } else {
        setError(e.message)
      }
    }
  }

  const handleResumeDeleted = (id) => {
    if (form.resume_id === id) {
      setForm(prev => ({ ...prev, resume_id: '' }))
    }
  }

  const submit = e => {
    e.preventDefault()
    
    const isDuplicate = apps.find(a => 
      a.company?.trim().toLowerCase() === form.company?.trim().toLowerCase() && 
      a.job_title?.trim().toLowerCase() === form.job_title?.trim().toLowerCase()
    )

    if (!editApp && isDuplicate) {
      if (!window.confirm(`You already have an existing application for '${isDuplicate.job_title}' at '${isDuplicate.company}' (Applied on ${isDuplicate.date_applied || 'an unknown date'}).\n\nAre you sure you want to create a new, separate application track for this?`)) {
        return
      }
    }

    const nextActionObj = form.enable_next_action ? {
      id: `act_${Date.now()}`,
      type: form.next_action_type,
      title: form.next_action_title || 'Follow up with recruiter',
      date: form.next_action_date || getFutureDateStr(2),
      time: form.next_action_time || '10:00 AM',
      completed: false,
      calendarEventId: `evt_app_${Date.now()}`
    } : null

    const payload = {
      date_applied: form.date_applied,
      company: form.company,
      job_title: form.job_title,
      location: form.location,
      application_method: form.application_method === 'Other' ? form.application_method_other : form.application_method,
      next_action: nextActionObj,
      next_action_due: nextActionObj?.date || null,
      ...(form.has_contact ? {
        contact_name: form.contact_name,
        contact_role: form.contact_role,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        contact_linkedin: form.contact_linkedin
      } : {}),
      ...(form.resume_id ? { resume_id: form.resume_id } : {})
    }

    if (editApp) {
      api.updateApplication(editApp.id, payload)
        .then(() => {
          setForm(EMPTY_FORM)
          setShowAddModal(false)
          setEditApp(null)
          load()
        })
        .catch(e => setError(e.message))
    } else {
      api.createApplication(payload)
        .then(newApp => {
          setForm({
            ...EMPTY_FORM,
            next_action_date: getFutureDateStr(2)
          })
          setShowAddModal(false)
          if (nextActionObj) {
            setCreatedBannerInfo({
              company: newApp.company,
              job_title: newApp.job_title,
              next_action: nextActionObj,
              appId: newApp.id
            })
          }
          load()
        })
        .catch(e => setError(e.message))
    }
  }

  const saveNextAction = (appId, actionObj) => {
    const updates = {
      next_action: actionObj,
      next_action_due: actionObj?.date || null
    }
    setApps(prev => prev.map(a => a.id === appId ? { ...a, ...updates } : a))
    api.updateApplication(appId, updates).catch(e => setError(e.message))
  }

  const removeNextAction = (appId) => {
    const updates = {
      next_action: null,
      next_action_due: null
    }
    setApps(prev => prev.map(a => a.id === appId ? { ...a, ...updates } : a))
    api.updateApplication(appId, updates).catch(e => setError(e.message))
  }

  const updateAppStatus = (appId, newStatus) => {
    const targetApp = apps.find(a => a.id === appId)
    if (!targetApp) return

    const updates = { status: newStatus }
    if (newStatus === 'Offer Received') {
      updates.stage = 'Closed'
      if (targetApp.next_action) {
        updates.next_action = { ...targetApp.next_action, time: null, completed: true }
      }
    } else if (newStatus === 'Rejected') {
      updates.stage = 'Closed'
      if (targetApp.next_action) {
        updates.next_action = { ...targetApp.next_action, time: null, completed: true }
      }
    }

    setApps(prev => prev.map(a => a.id === appId ? { ...a, ...updates } : a))
    api.updateApplication(appId, updates).catch(e => setError(e.message))

    if (newStatus === 'Interviewing' && targetApp.status !== 'Interviewing') {
      setStatusPrompt({
        app: targetApp,
        newStatus: 'Interviewing',
        suggestedAction: {
          id: `act_${Date.now()}`,
          type: 'Prepare for Interview',
          title: 'Prepare for interview',
          date: getFutureDateStr(1),
          time: '10:00 AM',
          completed: false,
          calendarEventId: `evt_app_${targetApp.id}`
        }
      })
    } else if (newStatus === 'Offer Received' && targetApp.status !== 'Offer Received') {
      setStatusPrompt({
        app: targetApp,
        newStatus: 'Offer Received',
        isOfferPrompt: true
      })
    } else if (newStatus === 'Ghosted' && targetApp.status !== 'Ghosted') {
      setStatusPrompt({
        app: targetApp,
        newStatus: 'Ghosted',
        suggestedAction: {
          id: `act_${Date.now()}`,
          type: 'Custom',
          title: 'Final follow-up',
          date: getFutureDateStr(3),
          time: '10:00 AM',
          completed: false,
          calendarEventId: `evt_app_${targetApp.id}`
        }
      })
    } else if (newStatus === 'Rejected' && targetApp.status !== 'Rejected') {
      setStatusPrompt({
        app: targetApp,
        newStatus: 'Rejected',
        isRejectedPrompt: true
      })
    }
  }

  const updateAppRemarks = (appId, newRemarks) => {
    setApps(prev => prev.map(a => a.id === appId ? { ...a, remarks: newRemarks } : a))
    api.updateApplication(appId, { remarks: newRemarks }).catch(e => setError(e.message))
  }

  const updateAppLocation = (appId, newLocation) => {
    setApps(prev => prev.map(a => a.id === appId ? { ...a, location: newLocation } : a))
    api.updateApplication(appId, { location: newLocation }).catch(e => setError(e.message))
  }

  const updateAppStage = (appId, newStage) => {
    const updates = { stage: newStage }
    setApps(prev => prev.map(a => a.id === appId ? { ...a, ...updates } : a))
    api.updateApplication(appId, updates).catch(e => setError(e.message))
  }

  const handleDownloadResume = async (res) => {
    try {
      const data = await api.getResumeUrl(res.id)
      if (data && data.url) {
        window.open(data.url, '_blank')
      }
    } catch (e) {
      console.error(e)
      setError("Failed to open resume URL")
    }
  }

  const statuses = ['All', ...Array.from(new Set(apps.map(a => a.status)))]
  const stages = ['All', ...Array.from(new Set(apps.map(a => a.stage)))]

  const statusDropdownOptions = statuses.map(s => ({ label: s, value: s }))
  const stageDropdownOptions = stages.map(s => ({ label: s, value: s }))

  const filtered = apps.filter(a => {
    const matchStatus = filterStatus === 'All' || a.status === filterStatus
    const matchStage = filterStage === 'All' || a.stage === filterStage
    const matchSearch = !search || [a.company, a.job_title].some(f => f?.toLowerCase().includes(search.toLowerCase()))
    return matchStatus && matchStage && matchSearch
  })

  const visible = isExpanded ? filtered : filtered.slice(0, INITIAL_LIMIT)
  const hasMore = filtered.length > INITIAL_LIMIT

  const counts = {
    total: apps.length,
    inProgress: apps.filter(a => a.status === 'In Progress').length,
    interviewing: apps.filter(a => a.status === 'Interviewing').length,
    offer: apps.filter(a => a.status === 'Offer Received').length,
    rejected: apps.filter(a => a.status === 'Rejected').length,
    ghosted: apps.filter(a => a.status === 'Ghosted').length,
  }

  const statCards = [
    { label: 'Total Tracked', statusValue: 'All', value: counts.total, iconBg: 'bg-primary/10', iconColor: 'text-primary', Icon: Briefcase },
    { label: 'In Progress', statusValue: 'In Progress', value: counts.inProgress, iconBg: 'bg-info-light', iconColor: 'text-info', Icon: Send },
    { label: 'Interviewing', statusValue: 'Interviewing', value: counts.interviewing, iconBg: 'bg-primary/10', iconColor: 'text-primary', Icon: CalendarCheck },
    { label: 'Offer Received', statusValue: 'Offer Received', value: counts.offer, iconBg: 'bg-success-light', iconColor: 'text-success', Icon: Trophy },
    { label: 'Rejected', statusValue: 'Rejected', value: counts.rejected, iconBg: 'bg-danger-light', iconColor: 'text-danger', Icon: XCircle },
    { label: 'Ghosted', statusValue: 'Ghosted', value: counts.ghosted, iconBg: 'bg-warning-light', iconColor: 'text-warning', Icon: Ghost },
  ]

  const isFiltered = filterStatus !== 'All' || filterStage !== 'All' || search !== ''
  const clearFilters = () => {
    setFilterStatus('All')
    setFilterStage('All')
    setSearch('')
  }

  return (
    <section className="animate-fade-in pb-10 select-none max-w-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Job Applications</h2>
          <p className="mt-0.5 text-xs font-medium text-foreground-secondary">
            Track, update, and manage all your active application processes.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-all shadow-2xs active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      <PostCreateBanner
        info={createdBannerInfo}
        onDismiss={() => setCreatedBannerInfo(null)}
        onEdit={() => {
          const app = apps.find(a => a.id === createdBannerInfo.appId)
          if (app) setEditActionApp(app)
          setCreatedBannerInfo(null)
        }}
      />


      {deleteAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-80 duration-150" onClick={(e) => e.target === e.currentTarget && setDeleteAppId(null)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden select-none border border-transparent">
            <div className="p-6">
              <h3 className="text-base font-bold text-foreground mb-2">Delete Application</h3>
              <p className="text-xs text-foreground-secondary mb-6">Are you sure you want to delete this application? All related calendar events and activity logs will also be permanently deleted.</p>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setDeleteAppId(null)} className="px-4 py-2 text-xs font-semibold text-foreground-secondary hover:bg-surface-tertiary rounded-xl transition-colors">Cancel</button>
                <button onClick={handleDeleteConfirm} className="px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors shadow-2xs">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ApplicationModal
        isEdit={!!editApp}
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditApp(null)
        }}
        onSubmit={submit}
        form={form}
        setForm={setForm}
        resumes={resumes}
        onUploadResume={handleUploadResume}
        onManageResumes={() => setShowManageResumes(true)}
      />

      <ManageResumesModal
        isOpen={showManageResumes}
        onClose={() => setShowManageResumes(false)}
        resumes={resumes}
        setResumes={setResumes}
        onResumeDeleted={handleResumeDeleted}
      />

      {editActionApp && (
        <EditNextActionModal
          app={editActionApp}
          onClose={() => setEditActionApp(null)}
          onSave={saveNextAction}
          onRemove={removeNextAction}
        />
      )}

      {statusPrompt && (
        <StatusSuggestionModal
          prompt={statusPrompt}
          onClose={() => setStatusPrompt(null)}
          onAccept={(action, customizedObj) => {
            if (action === 'customize') {
              setEditActionApp({
                ...statusPrompt.app,
                next_action: customizedObj
              })
            } else {
              saveNextAction(statusPrompt.app.id, action)
            }
          }}
          onKeep={() => {}}
          onRemove={() => removeNextAction(statusPrompt.app.id)}
          onCustomize={(actionObj) => {
            setEditActionApp({
              ...statusPrompt.app,
              next_action: actionObj
            })
          }}
        />
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-rose-500/10 p-3 text-xs font-medium text-rose-400 border border-rose-500/20">{error}</p>
      )}

      {!loading && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((s, i) => {
            const CardIcon = s.Icon
            const isFilterActive = s.statusValue === 'All' ? filterStatus === 'All' : filterStatus === s.statusValue
            return (
              <button
                key={i}
                onClick={() => setFilterStatus(s.statusValue)}
                className={`panel text-left p-3.5 rounded-2xl border border-transparent shadow-2xs flex flex-col justify-between transition-all active:scale-95 focus:outline-none ${isFilterActive
                    ? 'ring-2 ring-primary/40 bg-surface'
                    : 'bg-surface-secondary hover:bg-surface-tertiary hover:-translate-y-0.5'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary/80 truncate max-w-[90px]">
                    {s.label}
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${s.iconBg} ${s.iconColor}`}>
                    <CardIcon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-foreground tracking-tight">{s.value}</p>
              </button>
            )
          })}
        </div>
      )}

      <div className="mb-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            placeholder="Search companies, job titles…"
            className="w-full rounded-xl border border-transparent bg-surface-secondary text-foreground placeholder:text-muted px-3 py-2.5 pl-9 pr-8 text-xs focus:bg-surface-tertiary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Dropdown
            prefix="Status"
            options={statusDropdownOptions}
            value={filterStatus}
            onChange={setFilterStatus}
            align="right"
          />

          <Dropdown
            prefix="Stage"
            options={stageDropdownOptions}
            value={filterStage}
            onChange={setFilterStage}
            align="right"
          />

          {isFiltered && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-primary hover:underline px-2 py-1 whitespace-nowrap focus:outline-none"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="panel rounded-2xl border border-transparent bg-surface shadow-2xs">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-foreground-secondary">
                <th className="px-5 py-3.5 font-extrabold">Company</th>
                <th className="px-5 py-3.5 font-extrabold">Role</th>
                <th className="px-5 py-3.5 font-extrabold">Location</th>
                <th className="px-5 py-3.5 font-extrabold">Status</th>
                <th className="px-5 py-3.5 font-extrabold">Stage</th>
                <th className="px-5 py-3.5 font-extrabold">Applied On</th>
                <th className="px-5 py-3.5 font-extrabold">Next Action</th>
                <th className="px-5 py-3.5 font-extrabold">Remarks</th>
                <th className="px-5 py-3.5 font-extrabold">Resume</th>
                  <th className="px-5 py-3.5 font-extrabold text-right">Actions</th>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditClick(app)} className="p-1.5 text-foreground-secondary hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors" title="Edit Application">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteAppId(app.id)} className="p-1.5 text-foreground-secondary hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete Application">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4"><div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditClick(app)} className="p-1.5 text-foreground-secondary hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors" title="Edit Application"><Edit className="w-4 h-4" /></button><button onClick={() => setDeleteAppId(app.id)} className="p-1.5 text-foreground-secondary hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete Application"><Trash2 className="w-4 h-4" /></button></div></td>
                    </tr>

            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-surface-secondary" />
                        <div className="h-3 w-24 rounded bg-surface-secondary" />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-32 rounded bg-surface-secondary" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-20 rounded bg-surface-secondary" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 w-20 rounded-full bg-surface-secondary" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-16 rounded bg-surface-secondary" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-20 rounded bg-surface-secondary" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-24 rounded bg-surface-secondary" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 w-16 rounded bg-surface-secondary" />
                    </td>
                    <td className="px-5 py-4"><div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditClick(app)} className="p-1.5 text-foreground-secondary hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors" title="Edit Application"><Edit className="w-4 h-4" /></button><button onClick={() => setDeleteAppId(app.id)} className="p-1.5 text-foreground-secondary hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete Application"><Trash2 className="w-4 h-4" /></button></div></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-xs text-muted">
                    No applications match the current filter parameters.
                  </td>
                  <td className="px-5 py-4"><div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditClick(app)} className="p-1.5 text-foreground-secondary hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors" title="Edit Application"><Edit className="w-4 h-4" /></button><button onClick={() => setDeleteAppId(app.id)} className="p-1.5 text-foreground-secondary hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete Application"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ) : (
                visible.map(app => {
                  const res = app.resume
                  return (
                    <tr key={app.id} className="group hover:bg-surface-tertiary transition-colors duration-150">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ApplicationStatusIcon status={app.status} />
                          <span className="font-bold text-foreground text-xs">{app.company}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">{app.job_title}</span>
                          {app.application_method && (
                            <span className="text-[10px] text-foreground-secondary/70">{app.application_method}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <input
                          className="bg-transparent text-xs font-medium text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 w-full max-w-[120px] transition-all hover:bg-surface-tertiary"
                          placeholder="Add location..."
                          defaultValue={app.location || ''}
                          onBlur={e => {
                            if (e.target.value !== (app.location || '')) {
                              updateAppLocation(app.id, e.target.value)
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') e.target.blur()
                          }}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <Dropdown
                          size="sm"
                          options={STATUS_DROPDOWN_OPTIONS}
                          value={app.status}
                          triggerClassName={STATUS_TRIGGER_CLASSES[app.status] || 'bg-surface-secondary text-foreground-secondary'}
                          onChange={val => updateAppStatus(app.id, val)}
                          align="left"
                        />
                      </td>

                      <td className="px-5 py-4">
                        <Dropdown
                          size="sm"
                          options={STAGE_DROPDOWN_OPTIONS}
                          value={app.stage}
                          triggerClassName="bg-surface-secondary text-foreground-secondary hover:text-foreground hover:bg-surface-secondary"
                          onChange={val => updateAppStage(app.id, val)}
                          align="left"
                        />
                      </td>

                      <td className="px-5 py-4 text-foreground-secondary font-medium">{app.date_applied ?? '—'}</td>

                      <td className="px-5 py-4">
                        <NextActionCell
                          action={app.next_action || (app.next_action_due ? { date: app.next_action_due, title: 'Follow up' } : null)}
                          onClick={() => setEditActionApp(app)}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <input
                          className="bg-transparent text-xs font-medium text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 w-full max-w-[150px] transition-all hover:bg-surface-tertiary"
                          placeholder="Add remarks..."
                          defaultValue={app.remarks || ''}
                          onBlur={e => {
                            if (e.target.value !== (app.remarks || '')) {
                              updateAppRemarks(app.id, e.target.value)
                            }
                          }}
                        />
                      </td>

                      <td className="px-5 py-4">
                        {res ? (
                          <div className="flex flex-col gap-1 max-w-[140px]">
                            <div className="flex items-center gap-1.5 min-w-0" title={res.fileName}>
                              <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <span className="font-semibold text-foreground text-xs truncate">
                                {res.fileName.replace(/\.pdf$/i, '')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 pl-5 text-[11px] font-medium whitespace-nowrap">
                              <button
                                onClick={() => setPreviewResume(res)}
                                className="text-primary hover:underline focus:outline-none flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>
                              <span className="text-foreground-secondary/40">•</span>
                              <button
                                onClick={() => handleDownloadResume(res)}
                                className="text-foreground-secondary hover:text-foreground focus:outline-none flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-foreground-secondary/50">No resume</span>
                        )}
                      </td>
                      <td className="px-5 py-4"><div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditClick(app)} className="p-1.5 text-foreground-secondary hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors" title="Edit Application"><Edit className="w-4 h-4" /></button><button onClick={() => setDeleteAppId(app.id)} className="p-1.5 text-foreground-secondary hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete Application"><Trash2 className="w-4 h-4" /></button></div></td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-5 flex flex-col items-center justify-center gap-3 text-xs text-foreground-secondary">
          {hasMore && (
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              className="px-5 py-2.5 bg-surface-secondary hover:bg-primary hover:text-white text-[11px] font-bold text-foreground rounded-xl transition-all shadow-2xs active:scale-95 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/25"
            >
              {isExpanded ? (
                <>
                  <span>Show Less</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Show More Applications ({filtered.length - INITIAL_LIMIT} remaining)</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
          <span className="text-[10px] text-muted font-semibold tracking-wide">Showing {visible.length} of {filtered.length} applications</span>
        </div>
      </div>

      {previewResume && (
        <ViewResumeModal resume={previewResume} onClose={() => setPreviewResume(null)} onDownload={() => handleDownloadResume(previewResume)} />
      )}
    </section>
  )
}
