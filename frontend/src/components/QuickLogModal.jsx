import React, { useState, useEffect } from 'react'
import { X, Save, Zap, Calendar as CalendarIcon, MessageSquare, Briefcase, Mail, Phone, UserCircle, ExternalLink } from 'lucide-react'
import { api } from '../api/client'

const STAGE_OPTIONS = [
  'Saved', 'Applied', 'In Progress', 'Interviewing',
  'Offer Received', 'Rejected', 'Ghosted', 'Withdrawn'
]

const ACTION_OPTIONS = [
  'Follow Up', 'Email Sent', 'LinkedIn Message', 
  'Call Dialed', 'Interview Prep', 'Offer Negotiation'
]

export default function QuickLogModal({ isOpen, onClose, task, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [contact, setContact] = useState(null)
  const [loadingContact, setLoadingContact] = useState(false)
  
  const [form, setForm] = useState({
    action_type: 'Follow Up',
    notes: '',
    stage: 'Applied',
    next_action_due: '',
    next_action_type: 'Follow Up'
  })

  useEffect(() => {
    if (isOpen && task && !task.isEvent) {
      setForm({
        action_type: task.appDetails?.next_action_type || 'Follow Up',
        notes: '',
        stage: task.appDetails?.stage || 'Applied',
        next_action_due: '',
        next_action_type: 'Follow Up'
      })
      
      setContact(null)
      if (task.appDetails?.contact_id) {
        setLoadingContact(true)
        api.contacts()
          .then(contacts => {
            const found = contacts.find(c => c.id === task.appDetails.contact_id)
            setContact(found || null)
          })
          .catch(err => console.error("Failed to load contact", err))
          .finally(() => setLoadingContact(false))
      }
    }
  }, [isOpen, task])

  if (!isOpen || !task || task.isEvent) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.logActivity({
        application_id: task.id,
        action_type: form.action_type,
        notes: form.notes || 'Task completed from Dashboard Action Center.'
      })

      const updates = {
        stage: form.stage,
        next_action_due: form.next_action_due || null,
        next_action_type: form.next_action_due ? form.next_action_type : null,
      }

      await api.updateApplication(task.id, updates)

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to quick log task:', err)
      alert('Failed to save. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-80 duration-150"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-2xl border border-white/5 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-none select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Quick Action Center</h3>
              <p className="text-[11px] text-foreground-secondary font-medium">{task.company} • {task.taskTitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form id="quick-log-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          
          {/* Contact Panel */}
          <div className="bg-surface-secondary/50 rounded-xl p-4 border border-transparent space-y-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <UserCircle className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Point of Contact</span>
            </div>
            
            {loadingContact ? (
              <div className="flex items-center gap-2 text-xs text-foreground-secondary animate-pulse py-1">
                <div className="w-3 h-3 rounded-full bg-surface-tertiary" /> Loading...
              </div>
            ) : contact ? (
              <div className="flex flex-col gap-2.5 mt-1">
                <div>
                  <p className="font-bold text-sm text-foreground">{contact.name}</p>
                  <p className="text-foreground-secondary font-medium text-[11px]">{contact.role || 'Recruiter'}</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-0.5">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-foreground font-semibold text-[11px] transition-colors border border-transparent">
                      <Mail className="w-3.5 h-3.5 opacity-70" /> Email
                    </a>
                  )}
                  {contact.linkedin_url && (
                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-foreground font-semibold text-[11px] transition-colors border border-transparent">
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" /> LinkedIn
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-foreground font-semibold text-[11px] transition-colors border border-transparent">
                      <Phone className="w-3.5 h-3.5 opacity-70" /> Call
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-foreground-secondary py-1">No contact linked to this application.</p>
            )}
          </div>

          <div className="space-y-4 pt-1">
            {/* Outcome Notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-foreground-secondary">Outcome / Notes *</label>
                <select
                  value={form.action_type}
                  onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))}
                  className="bg-transparent border-none text-[10px] font-bold text-primary focus:outline-none cursor-pointer appearance-none text-right pr-2 hover:opacity-80 transition-opacity"
                >
                  {ACTION_OPTIONS.map(a => <option key={a} value={a} className="bg-surface">{a}</option>)}
                </select>
              </div>
              <textarea
                required
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="What happened? (e.g. Left a voicemail)"
                className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all min-h-[80px] resize-none"
                autoFocus
              />
            </div>

            {/* Grid for Stage & Next Action */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Pipeline Stage</label>
                <select
                  value={form.stage}
                  onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                  className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
                >
                  {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Next Action Due</label>
                <input
                  type="date"
                  value={form.next_action_due}
                  onChange={e => setForm(f => ({ ...f, next_action_due: e.target.value }))}
                  className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all [color-scheme:dark]"
                />
              </div>
            </div>
            
            {/* Optional: Pick Next Action Type if Date is set */}
            {form.next_action_due && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-[10px] font-semibold text-foreground-secondary uppercase tracking-wider mb-1.5">Next Action Type</label>
                <select
                  value={form.next_action_type}
                  onChange={e => setForm(f => ({ ...f, next_action_type: e.target.value }))}
                  className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
                >
                  {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border mt-2 bg-surface">
          <span className="text-[11px] font-medium text-foreground-secondary">
            {form.next_action_due ? 'Will schedule follow-up.' : 'Will clear task.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-foreground-secondary hover:bg-surface-tertiary transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="quick-log-form"
              disabled={loading}
              className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-all shadow-2xs active:scale-95 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {loading ? 'Saving...' : 'Save & Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

