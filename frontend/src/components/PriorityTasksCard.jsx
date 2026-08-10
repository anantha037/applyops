import React, { useState } from 'react'
import { Check, CheckCircle2, ArrowUpRight } from 'lucide-react'
import Dropdown from './ui/Dropdown'

export default function PriorityTasksCard({ tasks: initialPropTasks, onViewAll }) {
  const [tasks, setTasks] = useState(initialPropTasks || [])
  const [filterPriority, setFilterPriority] = useState('all')

  const toggleComplete = (id, e) => {
    e.stopPropagation()
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const activeTasks = tasks.filter(t => !t.completed)
  const filteredTasks = activeTasks.filter(t => {
    if (filterPriority === 'all') return true
    return t.priority.toLowerCase() === filterPriority
  })

  const filterOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'high', label: 'High Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'low', label: 'Low Priority' }
  ]

  const getPriorityBadgeClass = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold'
      case 'medium':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
      case 'low':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
      default:
        return 'bg-surface-secondary text-foreground-secondary font-medium'
    }
  }

  return (
    <div className="panel flex flex-col rounded-2xl p-5 border border-border bg-surface shadow-xs h-full select-none">
      {/* Header with Title & Filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground">Priority Tasks</h3>
          {activeTasks.length > 0 && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {activeTasks.length}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Dropdown 
            options={filterOptions} 
            value={filterPriority} 
            onChange={setFilterPriority} 
            size="sm"
          />
        </div>
      </div>

      {/* Task List / Empty State */}
      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto scrollbar-none min-h-[220px]">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="group relative flex items-center justify-between p-3 rounded-xl bg-surface-secondary/40 hover:bg-surface-secondary/90 dark:hover:bg-surface-tertiary/60 border border-transparent hover:border-border/30 hover:translate-x-1.5 transition-all duration-200 ease-out cursor-pointer shadow-2xs hover:shadow-md overflow-hidden"
            >
              {/* Left Hover Indicator Bar */}
              <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

              {/* Left: Company Icon + Details */}
              <div className="flex items-center gap-3 min-w-0 flex-1 mr-2 pl-1">
                {/* Company Logo Badge */}
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 overflow-hidden text-xs font-bold text-foreground shadow-2xs group-hover:scale-110 transition-transform duration-200">
                  <img
                    src={`https://logo.clearbit.com/${task.domain}`}
                    alt={task.company}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextSibling.style.display = 'flex'
                    }}
                  />
                  <span className="hidden w-full h-full items-center justify-center bg-primary/10 text-primary font-bold text-xs">
                    {task.company.charAt(0)}
                  </span>
                </div>

                {/* Company Name & Task Title */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {task.company}
                    </span>
                    <span className="text-[10px] font-medium text-foreground-secondary truncate">
                      • {task.taskTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-semibold text-foreground-secondary">
                      Due {task.dueDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Priority Badge + Quick Action Checkmark */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-md ${getPriorityBadgeClass(task.priority)}`}>
                  {task.priority}
                </span>

                <button
                  onClick={(e) => toggleComplete(task.id, e)}
                  className="w-7 h-7 rounded-lg bg-surface-secondary/80 hover:bg-emerald-500/20 text-foreground-secondary hover:text-emerald-400 flex items-center justify-center transition-all focus:outline-none shadow-2xs active:scale-95 group-hover:bg-emerald-500/10"
                  title="Mark as completed"
                  aria-label="Mark task completed"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          /* Clean Minimal Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-foreground">You're all caught up.</h4>
            <p className="text-[11px] font-medium text-foreground-secondary mt-0.5">
              No urgent tasks today.
            </p>
          </div>
        )}
      </div>

      {/* Footer View All Action Bar — Borderless Clean Spacing */}
      {activeTasks.length > 0 && (
        <div className="mt-3 pt-1 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground-secondary">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>{activeTasks.length} pending action{activeTasks.length > 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => {
              if (onViewAll) onViewAll()
              else window.location.hash = '#/applications'
            }}
            className="text-[11px] font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-all duration-150 focus:outline-none group/link"
          >
            <span className="group-hover/link:underline">View all tasks</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </button>
        </div>
      )}
    </div>
  )
}
