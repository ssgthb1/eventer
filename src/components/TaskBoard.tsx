'use client'

import { useState } from 'react'
import { TaskForm, type TaskParticipant, type TaskData } from './TaskForm'

type Task = {
  id: string
  event_id: string
  created_by: string
  assigned_to: string | null
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'done'
  due_date: string | null
  created_at: string
  creator: { full_name: string | null }[] | null
  assignee: { full_name: string | null }[] | null
}

interface TaskBoardProps {
  eventId: string
  initialTasks: Task[]
  participants: TaskParticipant[]
  currentUserId: string
  isOrganizer: boolean
}

const COLUMNS: { status: Task['status']; label: string; color: string }[] = [
  { status: 'open', label: 'Open', color: 'border-slate-300 bg-slate-50' },
  { status: 'in_progress', label: 'In progress', color: 'border-amber-300 bg-amber-50' },
  { status: 'done', label: 'Done', color: 'border-green-300 bg-green-50' },
]

const NEXT_STATUS: Record<Task['status'], Task['status'] | null> = {
  open: 'in_progress',
  in_progress: 'done',
  done: null,
}

const PREV_STATUS: Record<Task['status'], Task['status'] | null> = {
  open: null,
  in_progress: 'open',
  done: 'in_progress',
}

function participantName(p: TaskParticipant): string {
  return p.display_name || p.profiles?.[0]?.full_name || 'Unknown'
}

function assigneeName(assignee: { full_name: string | null }[] | null): string | null {
  return assignee?.[0]?.full_name ?? null
}

export function TaskBoard({ eventId, initialTasks, participants, currentUserId, isOrganizer }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      const res = await fetch(`/api/events/${eventId}/tasks`)
      const json = await res.json()
      if (res.ok) setTasks(json.tasks ?? [])
    } catch {
      // silent — stale data is acceptable here
    }
  }

  async function moveTask(taskId: string, newStatus: Task['status']) {
    setError(null)
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to update task')
        await refresh() // revert
      }
    } catch {
      setError('Network error — please try again')
      await refresh()
    }
  }

  async function assignSelf(taskId: string) {
    setError(null)
    // Optimistic update: set assigned_to and a placeholder assignee; refresh() corrects the name
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: currentUserId, assignee: null } : t))
    try {
      const res = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: currentUserId }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to assign task')
        await refresh()
      } else {
        await refresh() // get fresh assignee name
      }
    } catch {
      setError('Network error — please try again')
      await refresh()
    }
  }

  async function unassign(taskId: string) {
    setError(null)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: null, assignee: null } : t))
    try {
      const res = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: null }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to unassign task')
        await refresh()
      }
    } catch {
      setError('Network error — please try again')
      await refresh()
    }
  }

  async function deleteTask(taskId: string) {
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to delete task')
      } else {
        setTasks(prev => prev.filter(t => t.id !== taskId))
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const tasksByStatus = (status: Task['status']) => tasks.filter(t => t.status === status)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        {!showForm && !editingId && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Add task
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {showForm && (
        <TaskForm
          eventId={eventId}
          participants={participants}
          onSuccess={async () => { setShowForm(false); await refresh() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(col => (
          <div key={col.status} className={`rounded-xl border-2 ${col.color} p-3`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{col.label}</h3>
              <span className="text-xs text-slate-400 bg-white rounded-full px-2 py-0.5 border border-slate-200">
                {tasksByStatus(col.status).length}
              </span>
            </div>

            <div className="space-y-2">
              {tasksByStatus(col.status).map(task => {
                const canEdit = task.created_by === currentUserId || task.assigned_to === currentUserId || isOrganizer
                const canDelete = task.created_by === currentUserId || isOrganizer
                const isAssignedToMe = task.assigned_to === currentUserId
                const isUnassigned = !task.assigned_to
                // Compare dates at UTC boundaries to avoid timezone off-by-one
                const todayUtc = new Date().toISOString().slice(0, 10)
                const isOverdue = task.due_date && task.status !== 'done' && task.due_date < todayUtc

                if (editingId === task.id) {
                  const taskData: TaskData = {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    due_date: task.due_date,
                    assigned_to: task.assigned_to,
                  }
                  return (
                    <TaskForm
                      key={task.id}
                      eventId={eventId}
                      participants={participants}
                      task={taskData}
                      onSuccess={async () => { setEditingId(null); await refresh() }}
                      onCancel={() => setEditingId(null)}
                    />
                  )
                }

                return (
                  <div key={task.id} className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm space-y-2">
                    <p className="text-sm font-medium text-slate-900 leading-snug">{task.title}</p>

                    {task.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
                    )}

                    {task.due_date && (
                      <p className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                        Due {new Date(task.due_date + 'T00:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })}
                        {isOverdue ? ' · Overdue' : ''}
                      </p>
                    )}

                    {/* Assignee */}
                    <div className="text-xs text-slate-500">
                      {isAssignedToMe ? (
                        <span className="flex items-center justify-between">
                          <span className="text-indigo-600 font-medium">Assigned to you</span>
                          <button onClick={() => unassign(task.id)} className="text-slate-400 hover:text-red-400 ml-2">
                            Unassign
                          </button>
                        </span>
                      ) : task.assigned_to ? (
                        <span className="flex items-center justify-between">
                          <span>{assigneeName(task.assignee) ?? 'Someone'}</span>
                          <button onClick={() => unassign(task.id)} className="text-slate-400 hover:text-red-400 ml-2">
                            Unassign
                          </button>
                        </span>
                      ) : (
                        <button onClick={() => assignSelf(task.id)} className="text-indigo-500 hover:underline">
                          Assign to me
                        </button>
                      )}
                    </div>

                    {/* Status move + actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      {PREV_STATUS[task.status] && canEdit && (
                        <button
                          onClick={() => moveTask(task.id, PREV_STATUS[task.status]!)}
                          title="Move back"
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ←
                        </button>
                      )}
                      {NEXT_STATUS[task.status] && canEdit && (
                        <button
                          onClick={() => moveTask(task.id, NEXT_STATUS[task.status]!)}
                          title="Move forward"
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          →
                        </button>
                      )}

                      {canEdit && (
                        <button
                          onClick={() => { setEditingId(task.id); setShowForm(false) }}
                          className="text-xs text-indigo-500 hover:underline ml-auto"
                        >
                          Edit
                        </button>
                      )}

                      {canDelete && (
                        confirmDeleteId === task.id ? (
                          <span className="flex items-center gap-1.5 text-xs">
                            <button onClick={() => deleteTask(task.id)} className="text-red-500 hover:underline">Yes</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400 hover:underline">No</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(task.id)}
                            className="text-xs text-red-400 hover:underline"
                          >
                            Delete
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )
              })}

              {tasksByStatus(col.status).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
