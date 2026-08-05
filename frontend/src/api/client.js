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
}
