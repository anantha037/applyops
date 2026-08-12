export const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

let accessToken = localStorage.getItem('applyops_access_token') || null
let refreshToken = localStorage.getItem('applyops_refresh_token') || null

export function setTokens(access, refresh) {
  accessToken = access
  refreshToken = refresh
  if (access) {
    localStorage.setItem('applyops_access_token', access)
  } else {
    localStorage.removeItem('applyops_access_token')
  }
  if (refresh) {
    localStorage.setItem('applyops_refresh_token', refresh)
  } else {
    localStorage.removeItem('applyops_refresh_token')
  }
}

async function request(path, options = {}, isRetry = false) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)
  
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  try {
    let response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    
    // Auto-refresh logic on 401
    if (response.status === 401 && !isRetry && refreshToken && !path.startsWith('/auth/')) {
      try {
        const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        })
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          setTokens(data.access_token, data.refresh_token)
          // Retry original request with new token
          headers['Authorization'] = `Bearer ${data.access_token}`
          response = await fetch(`${baseUrl}${path}`, {
            ...options,
            headers,
            signal: controller.signal,
          })
        } else {
          setTokens(null, null)
          window.dispatchEvent(new Event('auth:unauthorized'))
        }
      } catch (e) {
        setTokens(null, null)
        window.dispatchEvent(new Event('auth:unauthorized'))
      }
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      if (response.status === 401) {
        setTokens(null, null)
        window.dispatchEvent(new Event('auth:unauthorized'))
      }
      throw new Error(errorBody.detail ?? `Request failed with status ${response.status}`)
    }
    return response.status === 204 ? null : await response.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out — backend may be starting up. Please try again.')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
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

export const resumesApi = {
  listResumes: () => request('/resumes'),
  getResumeUrl: (id) => request(`/resumes/${id}/url`),
  uploadResume: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${baseUrl}/resumes`, {
      method: 'POST',
      body: formData
    })
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new Error(errorBody.detail ?? `Upload failed with status ${response.status}`)
    }
    return response.json()
  }
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

export const authApi = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => {
    if (refreshToken) {
      request('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) }).catch(() => {})
    }
    setTokens(null, null)
  },
  isAuthenticated: () => !!accessToken
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
  analyticsOverview: analyticsApi.getOverview,
  listResumes: resumesApi.listResumes,
  getResumeUrl: resumesApi.getResumeUrl,
  uploadResume: resumesApi.uploadResume
}
