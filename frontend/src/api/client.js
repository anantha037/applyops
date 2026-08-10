export const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { 
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, 
    ...options 
  })
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail ?? `Request failed with status ${response.status}`)
  }
  return response.status === 204 ? null : await response.json()
}

export const applicationsApi = {
  getApplications: (params = {}) => {
    const searchParams = new URLSearchParams()
    if (params.status) searchParams.set('status', params.status)
    if (params.stage) searchParams.set('stage', params.stage)
    const queryString = searchParams.toString()
    return request(`/applications${queryString ? `?${queryString}` : ''}`)
  },
  getApplication: (id) => request(`/applications/${id}`),
  createApplication: (body) => request('/applications', { method: 'POST', body: JSON.stringify(body) }),
  updateApplication: (id, body) => request(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateStatus: (id, status) => request(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateStage: (id, stage) => request(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
  deleteApplication: (id) => request(`/applications/${id}`, { method: 'DELETE' }),
  getResume: (id) => request(`/applications/${id}/resume`),
  downloadResume: (id) => window.open(`${baseUrl}/applications/${id}/resume/download`, '_blank')
}

export const contactsApi = {
  getContacts: () => request('/contacts'),
  getContact: (id) => request(`/contacts/${id}`),
  createContact: (body) => request('/contacts', { method: 'POST', body: JSON.stringify(body) }),
  updateContact: (id, body) => request(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteContact: (id) => request(`/contacts/${id}`, { method: 'DELETE' }),
  markAsApplied: (id, body) => request(`/contacts/${id}/apply`, { method: 'POST', body: JSON.stringify(body) })
}

export const calendarApi = {
  getEvents: (start, end) => {
    const params = new URLSearchParams()
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    const queryString = params.toString()
    return request(`/calendar/events${queryString ? `?${queryString}` : ''}`)
  },
  getEvent: (id) => request(`/calendar/events/${id}`),
  createEvent: (body) => request('/calendar/events', { method: 'POST', body: JSON.stringify(body) }),
  updateEvent: (id, body) => request(`/calendar/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteEvent: (id) => request(`/calendar/events/${id}`, { method: 'DELETE' })
}

export const dashboardApi = {
  getSummary: () => request('/dashboard/summary'),
  getDueToday: () => request('/dashboard/due-today'),
  getDailyReport: () => request('/dashboard/daily-report')
}

export const analyticsApi = {
  getOverview: (range = '30d') => request(`/analytics/overview?range=${range}`)
}

export const activityApi = {
  getActivity: (date = 'today') => request(`/activity?date=${date}`),
  getRecentActivity: () => request('/activity/recent'),
  getStreak: () => request('/activity/streak'),
  logActivity: (body) => request('/activity', { method: 'POST', body: JSON.stringify(body) })
}

export const updatesApi = {
  getUpdates: () => request('/updates'),
  markAsRead: (id) => request(`/updates/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () => request('/updates/read-all', { method: 'PATCH' })
}

export const settingsApi = {
  getSettings: () => request('/settings'),
  updateSettings: (body) => request('/settings', { method: 'PATCH', body: JSON.stringify(body) })
}

export const api = {
  summary: dashboardApi.getSummary,
  dueToday: dashboardApi.getDueToday,
  report: dashboardApi.getDailyReport,
  applications: applicationsApi.getApplications,
  createApplication: applicationsApi.createApplication,
  updateApplication: applicationsApi.updateApplication,
  settings: settingsApi.getSettings,
  updateSettings: settingsApi.updateSettings,
  logActivity: activityApi.logActivity,
  calendarEvents: calendarApi.getEvents,
  createCalendarEvent: calendarApi.createEvent,
  updateCalendarEvent: calendarApi.updateEvent,
  deleteCalendarEvent: calendarApi.deleteEvent,
  contacts: contactsApi.getContacts,
  createContact: contactsApi.createContact,
  analyticsOverview: analyticsApi.getOverview
}
