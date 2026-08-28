import React, { useState, useEffect } from 'react'
import { X, Save, Zap, Calendar as CalendarIcon, MessageSquare, Briefcase, Mail, Phone, UserCircle, ExternalLink } from 'lucide-react'
import { api } from '../api/client'
import Dropdown from './ui/Dropdown'

const STAGE_OPTIONS = [
  { label: 'Applied', value: 'Applied' },
  { label: 'Called', value: 'Called' },
  { label: 'Emailed', value: 'Emailed' },
  { label: 'Follow-up 1', value: 'Follow-up 1' },
  { label: 'Follow-up 2', value: 'Follow-up 2' },
  { label: 'Follow-up 3', value: 'Follow-up 3' },
  { label: 'Closed', value: 'Closed' }
]

const ACTION_OPTIONS = [
  { label: 'Email Sent', value: 'Email Sent' },
  { label: 'LinkedIn Message', value: 'LinkedIn Message' },
  { label: 'Call Dialed', value: 'Call Dialed' },
  { label: 'Call Connected', value: 'Call Connected' },
  { label: 'WhatsApp Sent', value: 'WhatsApp Sent' },
  { label: 'Interview Scheduled', value: 'Interview Scheduled' },
  { label: 'Interview Completed', value: 'Interview Completed' }
]

const NEXT_ACTION_TYPE_OPTIONS = [
  { label: 'Follow Up', value: 'Follow Up' },
  { label: 'Recruiter Call', value: 'Recruiter Call' },
  { label: 'Send Email', value: 'Send Email' },
  { label: 'Prepare for Interview', value: 'Prepare for Interview' },
  { label: 'Send Thank-you', value: 'Send Thank-you' },
  { label: 'Review Offer', value: 'Review Offer' },
  { label: 'Custom', value: 'Custom' }
]

export default function QuickLogModal({ isOpen, onClose, task, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [contact, setContact] = useState(null)
  const [loadingContact, setLoadingContact] = useState(false)
  
  const [form, setForm] = useState({
    action_type: 'Email Sent',
    notes: '',
    stage: 'Applied',
    next_action_due: '',
    next_action_title: ''
  })

  useEffect(() => {
    if (isOpen && task && !task.isEvent) {
      setForm({
        action_type: 'Email Sent',
        notes: '',
        stage: task.appDetails?.stage || 'Applied',
        next_action_due: '',
        next_action_title: '',
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

  const handleTypeChange = (newType) => {
    setForm(f => {
      const updates = { next_action_type: newType }
      if (newType !== 'Custom' && (!f.next_action_title || f.next_action_title === 'Follow up with recruiter' || NEXT_ACTION_TYPE_OPTIONS.some(opt => opt.label === f.next_action_title))) {
        updates.next_action_title = newType
      }
      return { ...f, ...updates }
    })
  }

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
        next_action_title: form.next_action_due ? form.next_action_title : null,
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
            {/* Grid for Action & Stage */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Action Taken *</label>
                <Dropdown
                  options={ACTION_OPTIONS}
                  value={form.action_type || 'Email Sent'}
                  onChange={val => setForm({ ...form, action_type: val })}
                  className="w-full"
                  align="left"
                  triggerClassName="bg-surface-secondary text-foreground hover:bg-surface-tertiary border border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Pipeline Stage</label>
                <Dropdown
                  options={STAGE_OPTIONS}
                  value={form.stage || 'Applied'}
                  onChange={val => setForm({ ...form, stage: val })}
                  className="w-full"
                  align="left"
                  triggerClassName="bg-surface-secondary text-foreground hover:bg-surface-tertiary border border-transparent"
                />
              </div>
            </div>

            {/* Outcome Notes */}
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Outcome / Notes *</label>
              <textarea
                required
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="What happened? (e.g. Left a voicemail)"
                className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all min-h-[80px] resize-none"
                autoFocus
              />
            </div>

            {/* Next Action Scheduling */}
            <div>
              <label className="block text-xs font-semibold text-foreground-secondary mb-1.5">Next Action Due</label>
              <input
                type="date"
                value={form.next_action_due}
                onChange={e => setForm(f => ({ ...f, next_action_due: e.target.value }))}
                className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all [color-scheme:dark]"
              />
            </div>
            
            {/* Pick Next Action Title if Date is set */}
            {form.next_action_due && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div>
                  <label className="block text-[10px] font-semibold text-foreground-secondary uppercase tracking-wider mb-1.5">Action Type</label>
                  <Dropdown
                    options={NEXT_ACTION_TYPE_OPTIONS}
                    value={form.next_action_type}
                    onChange={handleTypeChange}
                    className="w-full"
                    size="sm"
                    triggerClassName="bg-surface-secondary text-foreground hover:bg-surface-tertiary border border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-foreground-secondary uppercase tracking-wider mb-1.5">Next Action Title *</label>
                  <input
                    required
                    placeholder="e.g. Follow up email"
                    value={form.next_action_title || ''}
                    onChange={e => setForm(f => ({ ...f, next_action_title: e.target.value }))}
                    className="w-full rounded-xl border border-transparent bg-surface-secondary hover:bg-surface-tertiary px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
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

