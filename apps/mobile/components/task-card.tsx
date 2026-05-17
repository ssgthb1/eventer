import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'

import {
  assigneeLabel,
  dueDateView,
  nextTaskStatus,
  prevTaskStatus,
} from '@/lib/event-presenters'
import { setTaskAssignee, setTaskStatus, type TaskRow } from '@/lib/tasks'
import { colors, radius, spacing, fontSize } from '@/lib/theme'

export function TaskCard({
  task,
  currentUserId,
  isOrganizer,
  onChanged,
}: {
  task: TaskRow
  currentUserId: string | null
  isOrganizer: boolean
  onChanged: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  const isAssignedToMe = !!currentUserId && task.assigned_to === currentUserId
  const isAssigned = !!task.assigned_to
  // RLS truth: tasks_update = creator | assignee | organizer.
  const canModify =
    (!!currentUserId && task.created_by === currentUserId) || isAssignedToMe || isOrganizer

  const due = dueDateView(task.due_date, task.status)
  const assignee = assigneeLabel(task.assignee, isAssignedToMe, isAssigned)
  const prev = prevTaskStatus(task.status)
  const next = nextTaskStatus(task.status)

  async function run(action: () => Promise<void>) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    try {
      await action()
      // Success → parent reload unmounts this card. Deliberately do NOT
      // reset inFlight/busy or touch state past here: the guard stays
      // armed until unmount (airtight against a double-tap) and there is
      // no setState on an unmounted instance.
      onChanged()
      return
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    }
    // Error path only — the card stays mounted, so re-enable it.
    inFlight.current = false
    setBusy(false)
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{task.title}</Text>
      {!!task.description && (
        <Text style={styles.desc} numberOfLines={2}>
          {task.description}
        </Text>
      )}
      {due && (
        <Text style={[styles.due, due.overdue && styles.overdue]}>{due.label}</Text>
      )}

      {/* Assignee */}
      <View style={styles.assigneeRow}>
        {assignee ? (
          <>
            <Text style={[styles.assignee, isAssignedToMe && styles.assigneeMe]} numberOfLines={1}>
              {assignee}
            </Text>
            {canModify && (
              <Pressable
                onPress={() => run(() => setTaskAssignee(task.id, null))}
                disabled={busy}
                hitSlop={6}
              >
                <Text style={styles.link}>Unassign</Text>
              </Pressable>
            )}
          </>
        ) : canModify ? (
          <Pressable
            onPress={() => currentUserId && run(() => setTaskAssignee(task.id, currentUserId))}
            disabled={busy}
            hitSlop={6}
            style={styles.assignBtn}
          >
            <MaterialIcons name="person-add" size={14} color={colors.brand} />
            <Text style={styles.link}>Assign to me</Text>
          </Pressable>
        ) : (
          <Text style={styles.assignee}>Unassigned</Text>
        )}
      </View>

      {/* Status move */}
      {canModify && (prev || next) && (
        <View style={styles.moveRow}>
          {prev && (
            <Pressable
              onPress={() => run(() => setTaskStatus(task.id, prev))}
              disabled={busy}
              style={styles.moveBtn}
              accessibilityLabel="Move back"
            >
              <MaterialIcons name="chevron-left" size={18} color={colors.textMuted} />
            </Pressable>
          )}
          {next && (
            <Pressable
              onPress={() => run(() => setTaskStatus(task.id, next))}
              disabled={busy}
              style={styles.moveBtn}
              accessibilityLabel="Move forward"
            >
              <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  desc: { fontSize: fontSize.xs, color: colors.textMuted },
  due: { fontSize: fontSize.xs, color: colors.textFaint },
  overdue: { color: colors.danger, fontWeight: '600' },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  assignee: { flexShrink: 1, fontSize: fontSize.xs, color: colors.textMuted },
  assigneeMe: { color: colors.brand, fontWeight: '600' },
  assignBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  link: { fontSize: fontSize.xs, fontWeight: '600', color: colors.brand },
  moveRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moveBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  error: { marginTop: spacing.xs, fontSize: fontSize.xs, color: colors.danger },
})
