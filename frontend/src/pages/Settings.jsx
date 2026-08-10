import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useGoalContext } from '../context/GoalContext'
import { 
  Target, 
  Clock, 
  Bell, 
  Bot, 
  Check, 
  Sparkles, 
  Minus, 
  Plus, 
  CheckCircle2, 
  ShieldCheck, 
  SlidersHorizontal 
} from 'lucide-react'

export default function Settings() {
  const { updateWeeklyGoal } = useGoalContext()

  const [initialSettings, setInitialSettings] = useState({
    weekly_goal: 25,
    working_hours_start: '09:00',
    working_hours_end: '21:00',
  })
  
  const [settings, setSettings] = useState({
    weekly_goal: 25,
    working_hours_start: '09:00',
    working_hours_end: '21:00',
  })

  const [notifications, setNotifications] = useState({
    app_reminders: true,
    followup_reminders: true,
    interview_reminders: true,
    daily_progress: true,
    streak_alerts: true
  })

  const [activeSection, setActiveSection] = useState('goals')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.settings()
      .then(res => {
        if (active && res) {
          const loadedGoal = res.weekly_goal ?? (res.daily_goal ? res.daily_goal * 5 : 25)
          const loaded = {
            weekly_goal: loadedGoal,
            working_hours_start: res.working_hours_start || '09:00',
            working_hours_end: res.working_hours_end || '21:00',
          }
          setSettings(loaded)
          setInitialSettings(loaded)
        }
      })
      .catch(e => {
        if (active) {
          setMessage(e.message)
          setIsError(true)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const hasChanges = 
    settings.weekly_goal !== initialSettings.weekly_goal ||
    settings.working_hours_start !== initialSettings.working_hours_start ||
    settings.working_hours_end !== initialSettings.working_hours_end

  const isTimeInvalid = 
    settings.working_hours_start && 
    settings.working_hours_end && 
    settings.working_hours_start >= settings.working_hours_end

  const handleGoalChange = (delta) => {
    setSettings(prev => ({
      ...prev,
      weekly_goal: Math.max(1, (prev.weekly_goal || 0) + delta)
    }))
  }

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleCancel = () => {
    setSettings(initialSettings)
    setMessage('')
    setIsError(false)
  }

  const save = e => {
    e.preventDefault()
    if (isTimeInvalid) return

    setSaving(true)
    setMessage('')
    api.updateSettings(settings)
      .then(s => {
        const updatedGoal = s.weekly_goal ?? settings.weekly_goal
        const updated = {
          weekly_goal: updatedGoal,
          working_hours_start: s.working_hours_start || settings.working_hours_start,
          working_hours_end: s.working_hours_end || settings.working_hours_end,
        }
        setSettings(updated)
        setInitialSettings(updated)
        updateWeeklyGoal(updatedGoal)
        setMessage('Settings saved successfully.')
        setIsError(false)
      })
      .catch(e => {
        setMessage(e.message)
        setIsError(true)
      })
      .finally(() => setSaving(false))
  }

  const enabledNotifCount = Object.values(notifications).filter(Boolean).length

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-xs font-semibold text-muted animate-pulse">
        Loading Settings...
      </div>
    )
  }

  return (
    <section className="h-full pb-10 flex flex-col gap-6 max-w-full overflow-x-hidden select-none motion-reduce:transition-none">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="mt-1 text-xs md:text-sm text-foreground-secondary">
          Configure your weekly application goal, working hours, and notification preferences.
        </p>
      </div>

      <div className="flex items-center gap-1.5 p-1 bg-surface-secondary/50 rounded-xl w-fit overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSection('goals')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2 cursor-pointer ${
            activeSection === 'goals'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-foreground-secondary hover:text-foreground hover:bg-surface-secondary/70'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Goals & Schedule</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('notifications')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2 cursor-pointer ${
            activeSection === 'notifications'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-foreground-secondary hover:text-foreground hover:bg-surface-secondary/70'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notifications</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('preferences')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2 cursor-pointer ${
            activeSection === 'preferences'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-foreground-secondary hover:text-foreground hover:bg-surface-secondary/70'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Preferences</span>
        </button>
      </div>

      <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {(activeSection === 'goals' || activeSection === 'all') && (
            <div className="rounded-2xl p-5 md:p-6 bg-surface shadow-xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                  <Target className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Weekly Goal & Schedule</h3>
                  <p className="text-xs text-foreground-secondary font-medium mt-0.5">
                    Set your weekly application target and the hours you actively work on your job search.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-xl bg-surface-secondary/40 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="block text-xs font-bold text-foreground">Weekly application goal</label>
                      <p className="text-[11px] text-foreground-secondary font-medium mt-0.5">
                        Set the number of job applications you want to submit each week.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-surface p-1 rounded-xl shadow-xs self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleGoalChange(-1)}
                        className="w-8 h-8 rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-foreground flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={settings.weekly_goal}
                        onChange={e => setSettings({ ...settings, weekly_goal: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-12 text-center text-xs font-bold text-foreground bg-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleGoalChange(1)}
                        className="w-8 h-8 rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-foreground flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-foreground-secondary/80 font-medium pt-0.5">
                    This goal powers your weekly progress, dashboard goal pace, and application streak insights.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-secondary/40 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground">Working hours</label>
                    <p className="text-[11px] text-foreground-secondary font-medium mt-0.5">
                      Used for reminders and daily job-search activity.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground-secondary mb-1">Start Time</label>
                      <input
                        type="time"
                        value={settings.working_hours_start}
                        onChange={e => setSettings({ ...settings, working_hours_start: e.target.value })}
                        className="w-full bg-surface text-foreground text-xs font-semibold rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/25 shadow-xs cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-foreground-secondary mb-1">End Time</label>
                      <input
                        type="time"
                        value={settings.working_hours_end}
                        onChange={e => setSettings({ ...settings, working_hours_end: e.target.value })}
                        className="w-full bg-surface text-foreground text-xs font-semibold rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary/25 shadow-xs cursor-pointer"
                      />
                    </div>
                  </div>

                  {isTimeInvalid && (
                    <p className="text-[11px] font-bold text-rose-500 pt-1">
                      End time must be later than start time.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {(activeSection === 'notifications' || activeSection === 'all') && (
            <div className="rounded-2xl p-5 md:p-6 bg-surface shadow-xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                  <p className="text-xs text-foreground-secondary font-medium mt-0.5">
                    Choose how ApplyOps should keep you informed about important activity.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="p-3.5 rounded-xl bg-surface-secondary/40 flex items-center justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-foreground">Application reminders</h4>
                    <p className="text-[11px] text-foreground-secondary font-medium mt-0.5">
                      Get reminded when you haven&apos;t submitted applications today.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleNotification('app_reminders')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifications.app_reminders ? 'bg-primary' : 'bg-surface-tertiary'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out my-0.5 ${
                        notifications.app_reminders ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-secondary/40 flex items-center justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-foreground">Follow-up reminders</h4>
                    <p className="text-[11px] text-foreground-secondary font-medium mt-0.5">
                      Get reminded when an application follow-up task is due.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleNotification('followup_reminders')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifications.followup_reminders ? 'bg-primary' : 'bg-surface-tertiary'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out my-0.5 ${
                        notifications.followup_reminders ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-secondary/40 flex items-center justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-foreground">Interview reminders</h4>
                    <p className="text-[11px] text-foreground-secondary font-medium mt-0.5">
                      Receive notifications prior to scheduled technical and recruiter interviews.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleNotification('interview_reminders')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifications.interview_reminders ? 'bg-primary' : 'bg-surface-tertiary'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out my-0.5 ${
                        notifications.interview_reminders ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-secondary/40 flex items-center justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-foreground">Daily progress summary</h4>
                    <p className="text-[11px] text-foreground-secondary font-medium mt-0.5">
                      Evening summary of your daily application metrics and targets.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleNotification('daily_progress')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifications.daily_progress ? 'bg-primary' : 'bg-surface-tertiary'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out my-0.5 ${
                        notifications.daily_progress ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-secondary/40 flex items-center justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-foreground">Streak notifications</h4>
                    <p className="text-[11px] text-foreground-secondary font-medium mt-0.5">
                      Alerts when your daily application streak is about to break.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleNotification('streak_alerts')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifications.streak_alerts ? 'bg-primary' : 'bg-surface-tertiary'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out my-0.5 ${
                        notifications.streak_alerts ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-secondary/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-foreground">Telegram Notifications</h5>
                    <p className="text-[11px] text-foreground-secondary font-medium">
                      Connected through workspace configuration
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-md whitespace-nowrap">
                  Connected
                </span>
              </div>
            </div>
          )}

          {(activeSection === 'preferences' || activeSection === 'all') && (
            <div className="rounded-2xl p-5 md:p-6 bg-surface shadow-xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">AI Coach & Workspace</h3>
                  <p className="text-xs text-foreground-secondary font-medium mt-0.5">
                    AI-powered daily coaching layer and workspace parameters.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="p-3.5 rounded-xl bg-surface-secondary/40 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">AI Coaching Engine</h4>
                    <p className="text-[11px] text-foreground-secondary font-medium mt-0.5">
                      Generates daily tactical advice based on your spreadsheet activity.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-md whitespace-nowrap flex items-center gap-1">
                    <Check className="w-3 h-3" /> Enabled
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-secondary/40 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Google Sheets 2-Way Sync</h4>
                    <p className="text-[11px] text-foreground-secondary font-medium mt-0.5">
                      Applications & settings sync bi-directionally with your Master Sheet.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-md whitespace-nowrap flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-surface shadow-xs flex items-center justify-between gap-4">
            <div>
              {message && (
                <p className={`text-xs font-bold flex items-center gap-1.5 ${isError ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {!isError && <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{message}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCancel}
                disabled={!hasChanges || saving}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  hasChanges
                    ? 'bg-surface-secondary text-foreground-secondary hover:text-foreground hover:bg-surface-tertiary cursor-pointer'
                    : 'bg-surface-secondary/40 text-muted cursor-not-allowed opacity-50'
                }`}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!hasChanges || saving || isTimeInvalid}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  hasChanges && !isTimeInvalid
                    ? 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs cursor-pointer'
                    : 'bg-primary/40 text-primary-foreground/60 cursor-not-allowed opacity-60'
                }`}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save changes</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-2xl p-5 bg-surface shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Your Setup</h3>
              <span className="text-[10px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-md">
                Active Config
              </span>
            </div>

            <div className="space-y-2 pt-0.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-secondary/40">
                <div className="flex items-center gap-2.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground-secondary">Weekly Goal</span>
                </div>
                <span className="text-xs font-bold text-foreground">{settings.weekly_goal} apps/wk</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-secondary/40">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-medium text-foreground-secondary">Working Window</span>
                </div>
                <span className="text-xs font-bold text-foreground">
                  {settings.working_hours_start || '09:00'} – {settings.working_hours_end || '21:00'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-secondary/40">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-medium text-foreground-secondary">Notifications</span>
                </div>
                <span className="text-xs font-bold text-foreground">{enabledNotifCount} enabled</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-secondary/40">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-foreground-secondary">AI Coach</span>
                </div>
                <span className="text-xs font-bold text-emerald-500">Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </section>
  )
}
