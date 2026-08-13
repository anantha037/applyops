export const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

let refreshPromise = null

async function request(path, options = {}, isRetry = false) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)
  
  const headers = { 
    'Content-Type': 'application/json', 
    'X-ApplyOps-Client': '1',
    ...(options.headers || {}) 
  }

  try {
    let response = await fetch(`${baseUrl}${path}`, {
      cache: 'no-store',
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    })
    
    // Auto-refresh logic on 401
    const isLoggedIn = isBrowser && localStorage.getItem('applyops_is_logged_in') === '1';
    if (response.status === 401 && !isRetry && isLoggedIn && !path.startsWith('/auth/')) {
      try {
        if (!refreshPromise) {
          refreshPromise = fetch(`${baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({})
          }).then(async refreshRes => {
            if (refreshRes.ok) {
              const data = await refreshRes.json()
              if (isBrowser) localStorage.setItem('applyops_is_logged_in', '1')
              return true
            } else {
              if (isBrowser) localStorage.removeItem('applyops_is_logged_in')
              window.dispatchEvent(new Event('auth:unauthorized'))
              return false
            }
          }).catch(() => {
            if (isBrowser) localStorage.removeItem('applyops_is_logged_in')
            window.dispatchEvent(new Event('auth:unauthorized'))
            return false
          }).finally(() => {
            refreshPromise = null
          })
        }

        const success = await refreshPromise
        if (success) {
          // Retry original request
          response = await fetch(`${baseUrl}${path}`, {
            ...options,
            headers,
            credentials: 'include',
            signal: controller.signal,
          })
        }
      } catch (e) {
        if (isBrowser) localStorage.removeItem('applyops_is_logged_in')
        window.dispatchEvent(new Event('auth:unauthorized'))
      }
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      if (response.status === 401) {
        if (isBrowser) localStorage.removeItem('applyops_is_logged_in')
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
      credentials: 'include',
      headers: {
        'X-ApplyOps-Client': '1'
      },
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
  login: async (email, password) => {
    const res = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    if (isBrowser) localStorage.setItem('applyops_is_logged_in', '1')
    return res
  },
  register: async (name, email, password) => {
    const res = await request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
    if (isBrowser) localStorage.setItem('applyops_is_logged_in', '1')
    return res
  },
  logout: () => {
    request('/auth/logout', { method: 'POST', body: JSON.stringify({}) }).catch(() => {})
    if (isBrowser) localStorage.removeItem('applyops_is_logged_in')
  },
  isAuthenticated: () => isBrowser && localStorage.getItem('applyops_is_logged_in') === '1',
  me: () => request('/auth/me'),
  updateMe: (body) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(body) })
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
  uploadResume: resumesApi.uploadResume,
  updateMe: authApi.updateMe,
  me: authApi.me
}
