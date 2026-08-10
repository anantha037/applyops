import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { isSameWeek, parseISO } from 'date-fns'
import { api } from '../api/client'

const GoalContext = createContext(null)

export function GoalProvider({ children }) {
  const [weeklyGoal, setWeeklyGoal] = useState(25)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [settingsRes, appsRes] = await Promise.all([
        api.settings().catch(() => ({})),
        api.applications().catch(() => [])
      ])

      if (settingsRes) {
        const goal = settingsRes.weekly_goal ?? (settingsRes.daily_goal ? settingsRes.daily_goal * 5 : 25)
        setWeeklyGoal(goal)
      }

      if (Array.isArray(appsRes)) {
        setApplications(appsRes)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const weeklyApplications = useMemo(() => {
    const now = new Date()
    return applications.filter(app => {
      if (!app || !app.date_applied) return false
      try {
        const date = parseISO(app.date_applied)
        return isSameWeek(date, now, { weekStartsOn: 1 })
      } catch {
        return false
      }
    }).length
  }, [applications])

  const weeklyProgress = useMemo(() => {
    if (!weeklyGoal || weeklyGoal <= 0) return 0
    return Math.round((weeklyApplications / weeklyGoal) * 100)
  }, [weeklyApplications, weeklyGoal])

  const applicationsRemaining = useMemo(() => {
    return Math.max(0, weeklyGoal - weeklyApplications)
  }, [weeklyGoal, weeklyApplications])

  const updateWeeklyGoal = useCallback(async (newGoal) => {
    const validatedGoal = Math.max(1, parseInt(newGoal, 10) || 1)
    setWeeklyGoal(validatedGoal)
    try {
      await api.updateSettings({ weekly_goal: validatedGoal, daily_goal: Math.ceil(validatedGoal / 5) })
    } catch {
    }
  }, [])

  const value = useMemo(() => ({
    weeklyGoal,
    weeklyApplications,
    weeklyProgress,
    applicationsRemaining,
    applications,
    loading,
    updateWeeklyGoal,
    refreshGoals: loadData
  }), [
    weeklyGoal,
    weeklyApplications,
    weeklyProgress,
    applicationsRemaining,
    applications,
    loading,
    updateWeeklyGoal,
    loadData
  ])

  return (
    <GoalContext.Provider value={value}>
      {children}
    </GoalContext.Provider>
  )
}

export function useGoalContext() {
  const ctx = useContext(GoalContext)
  if (!ctx) {
    throw new Error('useGoalContext must be used within a GoalProvider')
  }
  return ctx
}
