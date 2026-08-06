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

// In-memory mutable fallback state for offline frontend testing
let localApps = [...MOCK_APPLICATIONS]
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
    // Backend unavailable or request failed — Fallback to Demo Data for Frontend Testing
    console.warn(`[ApplyOps API] Fetch failed for "${path}". Using Demo Data fallback. Error:`, err.message)
    return getMockFallback(path, options)
  }
}

function getMockFallback(path, options = {}) {
  const method = options.method ? options.method.toUpperCase() : 'GET'

  // Dashboard endpoints
  if (path.startsWith('/dashboard/summary')) return MOCK_SUMMARY
  if (path.startsWith('/dashboard/due-today')) return localDue
  if (path.startsWith('/dashboard/daily-report')) return localReport

  // Applications endpoints
  if (path.startsWith('/applications')) {
    if (method === 'POST') {
      const body = JSON.stringify(options.body ? JSON.parse(options.body) : {})
      const newApp = {
        id: `app_${Date.now()}`,
        company: body.company || 'New Company',
        job_title: body.job_title || 'Role',
        stage: 'Application Sent',
        status: 'In Progress',
        application_method: body.application_method || 'LinkedIn Easy Apply',
        date_applied: new Date().toISOString().split('T')[0],
        next_action_due: '2026-08-12'
      }
      localApps = [newApp, ...localApps]
      localDue = [newApp, ...localDue]
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
    return localEvents
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
