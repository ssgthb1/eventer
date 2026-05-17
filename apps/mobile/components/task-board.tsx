import { View, Text, StyleSheet } from 'react-native'

import { TaskCard } from '@/components/task-card'
import { Badge } from '@/components/ui'
import { TASK_COLUMNS, taskStatusMeta } from '@/lib/event-presenters'
import type { TaskRow } from '@/lib/tasks'
import { colors, spacing, fontSize } from '@/lib/theme'

/**
 * Mobile task board: vertical status sections (Open / In progress / Done)
 * rather than a side-by-side kanban, which is unusable at phone width.
 */
export function TaskBoard({
  tasks,
  currentUserId,
  isOrganizer,
  onChanged,
}: {
  tasks: TaskRow[]
  currentUserId: string | null
  isOrganizer: boolean
  onChanged: () => void
}) {
  return (
    <View style={styles.board}>
      {TASK_COLUMNS.map((status) => {
        const meta = taskStatusMeta(status)
        const colTasks = tasks.filter((t) => t.status === status)
        return (
          <View key={status} style={styles.section}>
            <View style={styles.sectionHead}>
              <Badge label={meta.label} accent={meta.accent} dot />
              <Text style={styles.count}>{colTasks.length}</Text>
            </View>
            {colTasks.length === 0 ? (
              <Text style={styles.empty}>No tasks</Text>
            ) : (
              <View style={styles.cards}>
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUserId={currentUserId}
                    isOrganizer={isOrganizer}
                    onChanged={onChanged}
                  />
                ))}
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  board: { gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  count: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textFaint },
  empty: {
    fontSize: fontSize.xs,
    color: colors.textFaint,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  cards: { gap: spacing.sm },
})
