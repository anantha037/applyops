import { useEffect, useState } from 'react'
import { api } from '../api/client'

function SectionCard({ title, description, icon, children }) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
      <div className="flex items-start gap-4 border-b border-border px-6 py-5">
        <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary text-lg">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-text-primary">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="flex-1">
        <label className="block text-sm font-medium text-text-primary">{label}</label>
        {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
      </div>
      <div className="sm:w-64 flex-shrink-0">{children}</div>
    </div>
  )
}

function LightInput({ type = 'text', ...props }) {
  return (
    <input
      type={type}
      className="light-field text-sm"
      {...props}
    />
  )
}

export default function Settings() {
  const [settings, setSettings] = useState({
    daily_goal: 0,
    working_hours_start: '',
    working_hours_end: '',
  })
  const [message, setMessage]   = useState('')
  const [isError, setIsError]   = useState(false)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    api.settings().then(setSettings).catch(e => { setMessage(e.message); setIsError(true) })
  }, [])

  const save = e => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    api.updateSettings(settings)
      .then(s => { setSettings(s); setMessage('Settings saved to Google Sheet.'); setIsError(false) })
      .catch(e => { setMessage(e.message); setIsError(true) })
      .finally(() => setSaving(false))
  }

  return (
    <section className="max-w-3xl pb-10">
      {/* Page header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary">Settings</h2>
        <p className="mt-1 text-sm text-text-secondary">Configure your daily goals, working hours, and notification preferences.</p>
      </div>

      <form onSubmit={save} className="space-y-4">
        {/* Goal & schedule */}
        <SectionCard
          title="Daily Goal & Schedule"
          description="Set your application target and the hours you're actively job hunting."
          icon="🎯"
        >
          <div className="space-y-5">
            <FieldRow
              label="Daily application goal"
              hint="The number of applications you aim to submit each day."
            >
              <LightInput
                type="number"
                min="0"
                value={settings.daily_goal}
                onChange={e => setSettings({ ...settings, daily_goal: +e.target.value })}
              />
            </FieldRow>

            <div className="border-t border-border/40" />

            <FieldRow
              label="Working hours start"
              hint="When your daily call / outreach window opens (e.g. 09:00)."
            >
              <LightInput
                placeholder="09:00"
                value={settings.working_hours_start}
                onChange={e => setSettings({ ...settings, working_hours_start: e.target.value })}
              />
            </FieldRow>

            <div className="border-t border-border/40" />

            <FieldRow
              label="Working hours end"
              hint="When your daily window closes and the coaching message triggers (e.g. 21:00)."
            >
              <LightInput
                placeholder="21:00"
                value={settings.working_hours_end}
                onChange={e => setSettings({ ...settings, working_hours_end: e.target.value })}
              />
            </FieldRow>
          </div>
        </SectionCard>

        {/* Info card — read-only context */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-xs text-primary flex items-start gap-3">
          <span className="text-base">ℹ️</span>
          <span>
            Telegram and Groq settings are configured via <code className="font-mono bg-primary/10 px-1 py-0.5 rounded">.env</code> — edit that file and restart the backend to change notification credentials.
          </span>
        </div>

        {/* Save row */}
        <div className="flex items-center justify-between">
          <div>
            {message && (
              <p className={`text-sm font-medium ${isError ? 'text-rose-500' : 'text-emerald-500'}`}>
                {isError ? '✗ ' : '✓ '}{message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Saving…
              </>
            ) : 'Save settings'}
          </button>
        </div>
      </form>
    </section>
  )
}
