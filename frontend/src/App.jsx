import { useState, useEffect } from 'react'
import { GoalProvider } from './context/GoalContext'
import DashboardLayout from './components/layout/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import Calendar from './pages/Calendar'
import Contacts from './pages/Contacts'
import Analytics from './pages/Analytics'
import Updates from './pages/Updates'
import Settings from './pages/Settings'
import Auth from './pages/Auth'
import { authApi } from './api/client'

const views = { 
  dashboard: Dashboard, 
  applications: Applications, 
  calendar: Calendar, 
  contacts: Contacts, 
  analytics: Analytics, 
  updates: Updates, 
  settings: Settings 
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authApi.isAuthenticated())
  
  const [view, setView] = useState(() => {
    const hash = window.location.hash.replace('#/', '')
    return views[hash] ? hash : 'dashboard'
  })
  
  useEffect(() => {
    if (!window.location.hash || !views[window.location.hash.replace('#/', '')]) {
      window.location.hash = `#/dashboard`
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '')
      if (views[hash]) {
        setView(hash)
      }
    }
    
    window.addEventListener('hashchange', handleHashChange)
    
    const handleUnauthorized = () => {
      setIsAuthenticated(false)
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
    window.location.hash = '#/dashboard'
  }

  const handleLogout = () => {
    authApi.logout()
    setIsAuthenticated(false)
  }

  const handleViewChange = (newView) => {
    window.location.hash = `#/${newView}`
    setView(newView)
  }

  const View = views[view]

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <GoalProvider>
      <DashboardLayout 
        currentView={view} 
        onViewChange={handleViewChange}
        onLogout={handleLogout}
      >
        <View />
      </DashboardLayout>
    </GoalProvider>
  )
}
