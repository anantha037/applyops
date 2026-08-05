const baseUrl = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options })
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail ?? `Request failed (${response.status})`)
  return response.status === 204 ? null : response.json()
}

export const api = {
  summary: () => request('/dashboard/summary'), dueToday: () => request('/dashboard/due-today'), report: () => request('/dashboard/daily-report'),
  applications: () => request('/applications'), createApplication: body => request('/applications', { method: 'POST', body: JSON.stringify(body) }),
  updateApplication: (id, body) => request(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  settings: () => request('/settings'), updateSettings: body => request('/settings', { method: 'PATCH', body: JSON.stringify(body) }),
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
