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
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleViewChange = (newView) => {
    window.location.hash = `#/${newView}`
    setView(newView)
  }

  const View = views[view]

  return (
    <GoalProvider>
      <DashboardLayout 
        currentView={view} 
        onViewChange={handleViewChange}
        onLogout={() => alert('Logged out successfully.')}
      >
        <View />
      </DashboardLayout>
    </GoalProvider>
  )
}
