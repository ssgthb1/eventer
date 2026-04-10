'use client'

import { useState } from 'react'

export type TaskParticipant = {
  id: string
  user_id: string | null
  display_name: string | null
  profiles: { full_name: string | null }[] | null
}

export type TaskData = {
  id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'done'
  due_date: string | null
  assigned_to: string | null
}

interface TaskFormProps {
  eventId: string
  participants: TaskParticipant[]
  task?: TaskData
  onSuccess: () => void
  onCancel: () => void
}

function participantName(p: TaskParticipant): string {
  return p.display_name || p.profiles?.[0]?.full_name || 'Unknown'
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
}

export function TaskForm({ eventId, participants, task, onSuccess, onCancel }: TaskFormProps) {
  const isEdit = !!task
  const eligibleAssignees = participants.filter(p => p.user_id)

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? '')
  const [status, setStatus] = useState<TaskData['status']>(task?.status ?? 'open')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const url = isEdit ? `/api/tasks/${task.id}` : `/api/events/${eventId}/tasks`
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          due_date: dueDate || null,
          assigned_to: assignedTo || null,
          ...(isEdit ? { status } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong')
      } else {
        onSuccess()
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">{isEdit ? 'Edit task' : 'Add task'}</h3>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Book the venue"
          maxLength={200}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Description <span className="text-slate-400">(optional)</span></label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Add details…"
          rows={2}
          maxLength={1000}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Due date <span className="text-slate-400">(optional)</span></label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Assign to <span className="text-slate-400">(optional)</span></label>
          <select
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Unassigned</option>
            {eligibleAssignees.map(p => (
              <option key={p.user_id} value={p.user_id!}>{participantName(p)}</option>
            ))}
          </select>
        </div>
      </div>

      {isEdit && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            {(['open', 'in_progress', 'done'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  status === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save changes' : 'Add task')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
