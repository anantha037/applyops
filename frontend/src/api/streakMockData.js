import { subDays, format } from 'date-fns'

export function generateMockStreakData() {
  const today = new Date()
  const days = []

  const samplePattern = [
    { apps: 3, follow: 1, int: 1, calls: 0 },
    { apps: 2, follow: 0, int: 0, calls: 1 },
    { apps: 0, follow: 0, int: 0, calls: 0 },
    { apps: 4, follow: 2, int: 0, calls: 0 },
    { apps: 1, follow: 1, int: 1, calls: 0 },
    { apps: 5, follow: 1, int: 0, calls: 2 },
    { apps: 2, follow: 0, int: 0, calls: 0 },
    { apps: 0, follow: 0, int: 0, calls: 0 },
    { apps: 3, follow: 1, int: 0, calls: 1 },
    { apps: 2, follow: 2, int: 1, calls: 0 },
    { apps: 4, follow: 0, int: 0, calls: 1 },
    { apps: 1, follow: 0, int: 0, calls: 0 },
    { apps: 3, follow: 1, int: 1, calls: 0 },
    { apps: 2, follow: 1, int: 0, calls: 1 },
  ]

  for (let i = 89; i >= 0; i--) {
    const d = subDays(today, i)
    const dateStr = format(d, 'yyyy-MM-dd')
    const dayLabel = format(d, 'EEEEE')
    const displayDate = format(d, 'MMM d')
    const pat = samplePattern[i % samplePattern.length]

    const isToday = i === 0
    const apps = pat.apps
    const follow = pat.follow
    const int = pat.int
    const calls = pat.calls
    const total = apps + follow + int + calls

    days.push({
      date: dateStr,
      displayDate,
      dayLabel,
      isToday,
      applications: apps,
      followUps: follow,
      interviews: int,
      recruiterCalls: calls,
      total,
      completed: total > 0,
    })
  }

  const last14 = days.slice(-14)
  const activeDays14 = last14.filter(d => d.completed).length
  const totalApps14 = last14.reduce((acc, d) => acc + d.applications, 0)

  return {
    currentStreak: 7,
    bestStreak: 14,
    totalApplications: totalApps14,
    activeDays: activeDays14,
    todayCompleted: true,
    last14Days: last14,
    allDays: days,
  }
}
