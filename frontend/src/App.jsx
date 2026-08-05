import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import Settings from './pages/Settings'

const views = { dashboard: Dashboard, applications: Applications, settings: Settings }
export default function App() {
  const [view, setView] = useState('dashboard')
  const View = views[view]
  return <div className="min-h-screen bg-[#07111f] p-4 md:p-7">
    <header className="mb-6 flex flex-col gap-4 border-b border-[#1b3045] pb-5 md:flex-row md:items-end md:justify-between">
      <div><p className="label text-cyan-400">Personal application command center</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-100">APPLY<span className="text-cyan-400">OPS</span></h1></div>
      <nav className="flex gap-1">{Object.keys(views).map(key => <button key={key} onClick={() => setView(key)} className={`rounded px-3 py-2 text-sm capitalize ${view === key ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-100'}`}>{key}</button>)}</nav>
    </header><View />
  </div>
}
