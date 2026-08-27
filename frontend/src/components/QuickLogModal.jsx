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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-[480px] bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Premium Gradient */}
        <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-r from-primary/10 via-surface to-surface border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shadow-inner">
              <Zap className="w-4 h-4 fill-primary/20" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground leading-tight">Quick Action Center</h2>
              <p className="text-[10px] text-foreground-secondary font-medium">{task.company} • {task.taskTitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[75vh] scrollbar-none">
          <div className="p-5 space-y-6">
            
            {/* Contact Panel */}
            <div className="bg-surface-secondary border border-border/60 rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <UserCircle className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Point of Contact</h3>
              </div>
              
              {loadingContact ? (
                <div className="flex items-center gap-2 text-xs text-foreground-secondary animate-pulse py-2">
                  <div className="w-4 h-4 rounded-full bg-border" /> Loading contact details...
                </div>
              ) : contact ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{contact.name}</span>
                    <span className="text-xs text-foreground-secondary font-medium">{contact.role || 'Recruiter'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-lg transition-colors border border-blue-500/20">
                        <Mail className="w-3.5 h-3.5" /> Email
                      </a>
                    )}
                    {contact.linkedin_url && (
                      <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-lg transition-colors border border-indigo-500/20">
                        <ExternalLink className="w-3.5 h-3.5" /> LinkedIn
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg transition-colors border border-emerald-500/20">
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-foreground-secondary italic py-1">
                  No contact linked to this application.
                </div>
              )}
            </div>

            <form id="quick-log-form" onSubmit={handleSubmit} className="space-y-5">
              
              {/* Outcome Notes */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-foreground-secondary">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" /> Outcome / Notes
                </label>
                <div className="relative">
                  <select
                    value={form.action_type}
                    onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))}
                    className="absolute top-2 right-2 bg-surface border border-border/50 text-[10px] font-bold text-primary rounded-md px-2 py-1 appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer shadow-xs z-10"
                  >
                    {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Type your notes here... (e.g. Left a voicemail)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 pt-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 min-h-[100px] resize-none shadow-inner transition-shadow placeholder:text-foreground-secondary/40"
                    autoFocus
                  />
                </div>
              </div>

              {/* Grid for Stage & Next Action */}
              <div className="grid grid-cols-2 gap-4 pt-1 border-t border-border/40">
                {/* Stage Update */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-foreground-secondary">
                    <Briefcase className="w-3.5 h-3.5 text-amber-400" /> Pipeline Stage
                  </label>
                  <select
                    value={form.stage}
                    onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 appearance-none shadow-xs"
                  >
                    {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Next Action Scheduling */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-foreground-secondary">
                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" /> Next Action Due
                  </label>
                  <input
                    type="date"
                    value={form.next_action_due}
                    onChange={e => setForm(f => ({ ...f, next_action_due: e.target.value }))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 shadow-xs [color-scheme:dark]"
                  />
                </div>
              </div>
              
              {/* Optional: Pick Next Action Type if Date is set */}
              {form.next_action_due && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider pl-1">
                    Next Action Type
                  </label>
                  <select
                    value={form.next_action_type}
                    onChange={e => setForm(f => ({ ...f, next_action_type: e.target.value }))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 appearance-none shadow-xs"
                  >
                    {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border/40 bg-surface flex items-center justify-between">
          <span className="text-[10px] font-semibold text-foreground-secondary/60">
            {form.next_action_due ? 'Will schedule follow-up event.' : 'Will clear task from Dashboard.'}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-bold text-foreground hover:bg-surface-tertiary rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="quick-log-form"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary-hover rounded-xl transition-all shadow-[0_0_15px_rgba(var(--color-primary),0.3)] hover:shadow-[0_0_25px_rgba(var(--color-primary),0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? 'Saving...' : 'Complete Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

