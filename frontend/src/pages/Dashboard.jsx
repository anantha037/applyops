import { useEffect, useState } from 'react'
import { api } from '../api/client'
import GoalRing from '../components/GoalRing'
import FunnelChart from '../components/FunnelChart'
import DueTodayList from '../components/DueTodayList'
import StreakBadge from '../components/StreakBadge'
import CoachingCard from '../components/CoachingCard'
import TodaysReport from '../components/TodaysReport'

export default function Dashboard() { const [data, setData] = useState({}); const [error, setError] = useState(''); const load = () => Promise.all([api.summary(), api.dueToday(), api.report()]).then(([summary, due, report]) => setData({ summary, due, report })).catch(e => setError(e.message)); useEffect(() => { load() }, []); const log = app => api.logActivity({ application_id: app.id, company: app.company, action_type: 'Call Dialed' }).then(load).catch(e => setError(e.message)); const report = data.report ?? {}; return <section><div className="mb-5 flex items-center justify-between"><div><p className="label">Live operating picture</p><h2 className="text-xl font-bold">Today’s command board</h2></div><button onClick={load} className="text-sm text-cyan-300">Refresh ↻</button></div>{error && <p className="mb-4 text-sm text-rose-300">{error}</p>}<div className="grid gap-4 lg:grid-cols-4"><GoalRing count={data.summary?.today_count} goal={data.summary?.goal}/><StreakBadge days={data.summary?.streak}/><div className="panel rounded-lg p-4"><p className="label">Interviews pipeline</p><p className="mt-2 text-3xl font-black">{report.interviews_in_pipeline ?? '—'}</p></div><CoachingCard /></div><div className="mt-4 grid gap-4 lg:grid-cols-5"><div className="lg:col-span-3"><DueTodayList applications={data.due} onLog={log}/></div><div className="lg:col-span-2"><FunnelChart funnel={data.summary?.funnel}/></div></div><div className="mt-4"><TodaysReport report={report}/></div></section> }
