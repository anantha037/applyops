import React, { useState, useEffect } from 'react'
import { X, Save, CheckCircle2, Calendar as CalendarIcon, MessageSquare, Briefcase } from 'lucide-react'
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
  const [form, setForm] = useState({
    action_type: 'Follow Up',
    notes: '',
    stage: 'Applied',
    next_action_due: '',
    next_action_type: 'Follow Up'
  })

  // Reset form when task changes
  useEffect(() => {
    if (isOpen && task && !task.isEvent) {
      setForm({
        action_type: task.appDetails?.next_action_type || 'Follow Up',
        notes: '',
        stage: task.appDetails?.stage || 'Applied',
        next_action_due: '',
        next_action_type: 'Follow Up'
      })
    }
  }, [isOpen, task])

  if (!isOpen || !task || task.isEvent) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Log the completion activity
      await api.logActivity({
        application_id: task.id,
        action_type: form.action_type,
        notes: form.notes || 'Task marked complete from Dashboard.'
      })

      // 2. Update the application
      const updates = {
        stage: form.stage,
        next_action_due: form.next_action_due || null,
        next_action_type: form.next_action_due ? form.next_action_type : null,
      }

      await api.updateApplication(task.id, updates)

      // 3. Close and trigger dashboard reload
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between bg-surface-secondary/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-foreground">Complete Task</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            
            {/* Task Context */}
            <div className="flex flex-col gap-1 mb-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <span className="text-xs font-semibold text-primary">Logging outcome for:</span>
              <span className="text-sm font-bold text-foreground">{task.company}</span>
              <span className="text-xs text-foreground-secondary">{task.taskTitle}</span>
            </div>

            {/* Outcome Notes */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground-secondary">
                <MessageSquare className="w-3.5 h-3.5" /> Outcome / Notes
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="What happened? (e.g. Left a voicemail)"
                className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 min-h-[80px] resize-none"
                autoFocus
              />
            </div>

            {/* Stage Update */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground-secondary">
                <Briefcase className="w-3.5 h-3.5" /> Update Stage
              </label>
              <select
                value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 appearance-none"
              >
                {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Next Action Scheduling */}
            <div className="pt-2 border-t border-border/40">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground-secondary mb-2">
                <CalendarIcon className="w-3.5 h-3.5" /> Schedule Next Action (Optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={form.next_action_due}
                  onChange={e => setForm(f => ({ ...f, next_action_due: e.target.value }))}
                  className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                />
                <select
                  value={form.next_action_type}
                  onChange={e => setForm(f => ({ ...f, next_action_type: e.target.value }))}
                  disabled={!form.next_action_due}
                  className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 appearance-none disabled:opacity-50"
                >
                  {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <p className="text-[10px] text-foreground-secondary mt-1.5 pl-1">
                Leave date blank to simply close the task.
              </p>
            </div>

          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border/40 bg-surface-secondary/30 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-foreground hover:bg-surface-tertiary rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-xs hover:shadow-md hover:shadow-primary/20 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {loading ? 'Saving...' : 'Save & Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
