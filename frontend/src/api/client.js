import {
  MOCK_SUMMARY,
  MOCK_DUE_TODAY,
  MOCK_DAILY_REPORT,
  MOCK_APPLICATIONS,
  MOCK_CONTACTS,
  MOCK_ANALYTICS,
  MOCK_CALENDAR_EVENTS,
  MOCK_SETTINGS
} from './mockData'

export const baseUrl = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

const savedApps = typeof window !== 'undefined' ? localStorage.getItem('applyops_apps') : null
let localApps = savedApps ? JSON.parse(savedApps) : [...MOCK_APPLICATIONS]
let localContacts = [...MOCK_CONTACTS]
let localEvents = [...MOCK_CALENDAR_EVENTS]
let localSettings = { ...MOCK_SETTINGS }
let localDue = [...MOCK_DUE_TODAY]
let localReport = { ...MOCK_DAILY_REPORT }

async function request(path, options = {}) {
  try {
    const response = await fetch(`${baseUrl}${path}`, { 
      headers: { 'Content-Type': 'application/json' }, 
      ...options 
    })
    if (!response.ok) {
      throw new Error((await response.json().catch(() => ({}))).detail ?? `Request failed (${response.status})`)
    }
    return response.status === 204 ? null : await response.json()
  } catch (err) {
    return getMockFallback(path, options)
  }
}

function convertTime(timeStr, addMinutes = 0) {
  if (!timeStr) return '10:00:00'
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i)
  if (!match) return '10:00:00'
  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const ampm = match[3] ? match[3].toUpperCase() : ''
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  let totalMin = h * 60 + m + addMinutes
  let resH = Math.floor(totalMin / 60) % 24
  let resM = totalMin % 60
  return `${String(resH).padStart(2, '0')}:${String(resM).padStart(2, '0')}:00`
}

function getMockFallback(path, options = {}) {
  const method = options.method ? options.method.toUpperCase() : 'GET'

  // Dashboard endpoints
  if (path.startsWith('/dashboard/summary')) return MOCK_SUMMARY
  if (path.startsWith('/dashboard/due-today')) return localDue
  if (path.startsWith('/dashboard/daily-report')) return localReport

  // Applications endpoints
  if (path.startsWith('/applications')) {
    if (method === 'PATCH' || method === 'PUT') {
      const parts = path.split('/')
      const appId = parts[2]
      const body = options.body ? JSON.parse(options.body) : {}
      localApps = localApps.map(a => a.id === appId ? { ...a, ...body } : a)
      if (typeof window !== 'undefined') {
        localStorage.setItem('applyops_apps', JSON.stringify(localApps))
      }
      const updated = localApps.find(a => a.id === appId)
      return updated || { status: 'ok' }
    }
    if (method === 'POST') {
      const body = JSON.stringify(options.body ? JSON.parse(options.body) : {})
      const appBody = options.body ? JSON.parse(options.body) : {}
      const todayStr = new Date().toISOString().split('T')[0]
      const defaultDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
      
      const newApp = {
        id: `app_${Date.now()}`,
        company: appBody.company || 'New Company',
        job_title: appBody.job_title || 'Role',
        stage: appBody.stage || 'Application Sent',
        status: appBody.status || 'In Progress',
        application_method: appBody.application_method || 'LinkedIn Easy Apply',
        date_applied: todayStr,
        next_action_due: appBody.next_action?.date || defaultDate,
        next_action: appBody.next_action || {
          id: `act_${Date.now()}`,
          type: 'Follow Up',
          title: 'Follow up with recruiter',
          date: defaultDate,
          time: '10:00 AM',
          completed: false,
          calendarEventId: `evt_app_${Date.now()}`
        }
      }
      localApps = [newApp, ...localApps]
      localDue = [newApp, ...localDue]
      if (typeof window !== 'undefined') {
        localStorage.setItem('applyops_apps', JSON.stringify(localApps))
      }
      return newApp
    }
    return localApps
  }

  // Activity logging
  if (path.startsWith('/activity')) {
    localReport = {
      ...localReport,
      calls_dialed: localReport.calls_dialed + 1,
      calls_connected: localReport.calls_connected + 1
    }
    return { status: 'logged' }
  }

  // Contacts endpoints
  if (path.startsWith('/contacts')) {
    if (method === 'POST') {
      const body = options.body ? JSON.parse(options.body) : {}
      const newContact = {
        id: `c_${Date.now()}`,
        name: body.name || 'New Contact',
        company: body.company || '',
        role: body.role || 'Recruiter',
        email: body.email || '',
        phone: body.phone || '',
        last_contacted: new Date().toISOString().split('T')[0],
        responded: false,
        tags: body.tags || []
      }
      localContacts = [newContact, ...localContacts]
      return newContact
    }
    return localContacts
  }

  // Analytics endpoint
  if (path.startsWith('/analytics/overview')) return MOCK_ANALYTICS

  // Calendar endpoints
  if (path.startsWith('/calendar/events')) {
    if (method === 'POST') {
      const body = options.body ? JSON.parse(options.body) : {}
      const newEvt = { id: `evt_${Date.now()}`, ...body }
      localEvents = [...localEvents, newEvt]
      return newEvt
    }

    const appActionsAsEvents = localApps
      .filter(app => app.next_action && app.next_action.date)
      .map(app => {
        const act = app.next_action
        const eventType = act.type === 'Prepare for Interview'
          ? 'Interview'
          : act.type === 'Review Offer'
            ? 'Application Deadline'
            : 'Follow-up'
        return {
          id: act.calendarEventId || `evt_${app.id}`,
          title: `${act.title || 'Next Action'} (${app.company})`,
          company: app.company,
          type: eventType,
          event_type: eventType,
          date: act.date,
          start: `${act.date}T${convertTime(act.time)}`,
          end: `${act.date}T${convertTime(act.time, 30)}`,
          time: act.time || '10:00 AM',
          notes: `${app.job_title} · ${app.status}`,
          isNextActionTask: true,
          completed: act.completed || false
        }
      })

    return [...localEvents, ...appActionsAsEvents]
  }

  // Settings endpoint
  if (path.startsWith('/settings')) {
    if (method === 'PATCH') {
      const body = options.body ? JSON.parse(options.body) : {}
      localSettings = { ...localSettings, ...body }
      return localSettings
    }
    return localSettings
  }

  return {}
}

export const api = {
  summary: () => request('/dashboard/summary'),
  dueToday: () => request('/dashboard/due-today'),
  report: () => request('/dashboard/daily-report'),
  applications: () => request('/applications'),
  createApplication: body => request('/applications', { method: 'POST', body: JSON.stringify(body) }),
  updateApplication: (id, body) => request(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  settings: () => request('/settings'),
  updateSettings: body => request('/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  logActivity: body => request('/activity', { method: 'POST', body: JSON.stringify(body) }),
  calendarEvents: (start, end) => {
    const params = new URLSearchParams()
    if (start) params.set('start', start)
    if (end)   params.set('end',   end)
    return request(`/calendar/events?${params}`)
  },
  createCalendarEvent: body => request('/calendar/events', { method: 'POST', body: JSON.stringify(body) }),
  updateCalendarEvent: (id, body) => request(`/calendar/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCalendarEvent: id => request(`/calendar/events/${id}`, { method: 'DELETE' }),
  contacts: () => request('/contacts'),
  createContact: body => request('/contacts', { method: 'POST', body: JSON.stringify(body) }),
  analyticsOverview: (range = '30d') => request(`/analytics/overview?range=${range}`),
}
