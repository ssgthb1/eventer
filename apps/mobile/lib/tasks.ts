// Supabase data access for the task board. Direct SDK + RLS, like the rest
// of the mobile data layer.
//
// Authorization note: the `tasks_update` RLS policy permits
//   created_by = auth.uid()  OR  assigned_to = auth.uid()  OR  organizer
// Status moves and assign/unassign are all UPDATEs, so they are gated by
// that same rule. (The web /assign route claims "any participant can
// assign" but that is not RLS-backed and silently no-ops there for plain
// participants — mobile only exposes controls that actually work, and the
// conditional .select('id') below surfaces a denial instead of a silent
// no-op.)

import type { TaskStatus } from '@eventer/shared'

import { supabase } from './supabase'

export type TaskRow = {
  id: string
  event_id: string
  created_by: string
  assigned_to: string | null
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
  created_at: string
  creator: { full_name: string | null }[] | null
  assignee: { full_name: string | null }[] | null
}

export type TaskParticipantRow = {
  id: string
  user_id: string | null
  display_name: string | null
  role: string
  profiles: { full_name: string | null }[] | null
}

export type TasksData = {
  eventCreatedBy: string | null
  participants: TaskParticipantRow[]
  tasks: TaskRow[]
}

const TASK_SELECT = `
  id, event_id, created_by, assigned_to, title, description, status, due_date, created_at,
  creator:profiles!created_by(full_name),
  assignee:profiles!assigned_to(full_name)
`

export async function getTasksData(eventId: string): Promise<TasksData> {
  const [
    { data: event, error: eventError },
    { data: participants, error: participantError },
    { data: tasks, error: taskError },
  ] = await Promise.all([
    supabase.from('events').select('created_by').eq('id', eventId).single(),
    supabase
      .from('event_participants')
      .select('id, user_id, display_name, role, profiles(full_name)')
      .eq('event_id', eventId)
      .order('joined_at', { ascending: true })
      .limit(500),
    supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
      .limit(500),
  ])

  const firstError = eventError || participantError || taskError
  if (firstError) {
    console.error('[tasks.getTasksData]', firstError.message)
    throw new Error('Unable to load tasks. Please try again.')
  }

  return {
    eventCreatedBy: event?.created_by ?? null,
    participants: (participants ?? []) as TaskParticipantRow[],
    tasks: (tasks ?? []) as unknown as TaskRow[],
  }
}

function assertUpdated(rows: unknown[] | null, action: string): void {
  if (!rows || rows.length === 0) {
    // Zero rows is ambiguous: RLS denied the update (not
    // creator/assignee/organizer) OR the task was deleted between load and
    // action. Use a message that covers both rather than asserting a cause.
    throw new Error(
      `Could not ${action} this task — it may no longer exist or you may not have permission.`,
    )
  }
}

export async function setTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .select('id')

  if (error) {
    console.error('[tasks.setTaskStatus]', error.message)
    throw new Error('Could not move the task. Please try again.')
  }
  assertUpdated(data, 'move')
}

/** Pass `null` to unassign. */
export async function setTaskAssignee(
  taskId: string,
  assignedTo: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ assigned_to: assignedTo })
    .eq('id', taskId)
    .select('id')

  if (error) {
    console.error('[tasks.setTaskAssignee]', error.message)
    throw new Error('Could not update the assignee. Please try again.')
  }
  assertUpdated(data, assignedTo ? 'assign' : 'unassign')
}
