import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import Calendar from './pages/Calendar'
import Contacts from './pages/Contacts'
import Settings from './pages/Settings'

const views = { dashboard: Dashboard, applications: Applications, calendar: Calendar, contacts: Contacts, settings: Settings }

export default function App() {
  const [view, setView] = useState('dashboard')
  const View = views[view]
  
  return (
    <div className="flex min-h-screen bg-[#07111f] text-slate-100 font-sans">
      <aside className="w-64 flex flex-col border-r border-[#1b3045] bg-[#070e17]">
        <div className="p-6">
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            ApplyOps
          </h1>
          <p className="mt-1 text-[10px] tracking-wider text-slate-500 font-semibold uppercase">Application Command Center</p>
        </div>
        
        <nav className="flex-1 px-4 flex flex-col gap-1.5 mt-2">
          {Object.keys(views).map(key => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm capitalize font-medium transition-all ${
                view === key 
                  ? 'bg-indigo-600/20 text-indigo-400' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0b1828]'
              }`}
            >
              {view === key && <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full" />}
              <span className={view === key ? 'translate-x-1 transition-transform' : 'transition-transform'}>
                 {key}
              </span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 mt-auto">
          <div className="rounded-xl bg-gradient-to-br from-[#131135] to-[#1b1747] border border-indigo-500/20 p-4 mb-4 relative overflow-hidden">
             <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/20 blur-xl rounded-full"></div>
             <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/></svg>
                Upgrade to Pro
             </div>
             <div className="text-[10px] text-indigo-200/60 mt-1.5 mb-3 leading-relaxed">Unlock advanced analytics, AI insights and more power.</div>
             <button className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg transition-colors">Upgrade Now ↗</button>
          </div>
          
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-[#0b1828] border border-[#1b3045]">
            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
               <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Aman&backgroundColor=b6e3f4" alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="text-left flex-1 min-w-0">
               <div className="text-xs font-bold text-slate-200 truncate">Aman Raj</div>
               <div className="text-[10px] text-slate-500 truncate">Job Seeker</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 mr-1"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </aside>
      
      <main className={`flex-1 overflow-auto p-6 md:p-8 ${view === 'dashboard' ? 'bg-[#07111f]' : 'bg-gray-50 text-gray-900'}`}>
        <View />
      </main>
    </div>
  )
}
