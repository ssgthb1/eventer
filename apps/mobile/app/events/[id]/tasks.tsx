import { Stack } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native'

import { TaskBoard } from '@/components/task-board'
import { Screen, LoadingState, ErrorState, EmptyState } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { getTasksData, type TasksData } from '@/lib/tasks'
import { pluralize } from '@/lib/event-presenters'
import { useEventId } from '@/lib/use-event-id'
import { colors, spacing, fontSize } from '@/lib/theme'

export default function TasksScreen() {
  const id = useEventId()

  const { state } = useAuth()
  const currentUserId = state.status === 'signedIn' ? state.session.user.id : null

  const [data, setData] = useState<TasksData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const mounted = useRef(true)
  useEffect(() => {
    return () => {
      mounted.current = false
    }
  }, [])

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      const next = await getTasksData(id)
      if (mounted.current) setData(next)
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Failed to load tasks')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    if (mounted.current) setRefreshing(false)
  }, [load])

  const isOrganizer = useMemo(() => {
    if (!data || !currentUserId) return false
    // is_event_organizer() RLS checks event_participants.role only. The event
    // creator is always inserted as an organizer participant at creation, so
    // this eventCreatedBy arm is a fast-path, not an RLS bypass — task
    // mutations still go through tasks_update (creator|assignee|organizer).
    if (data.eventCreatedBy === currentUserId) return true
    const mine = data.participants.find((p) => p.user_id === currentUserId)
    return mine?.role === 'organizer'
  }, [data, currentUserId])

  if (data === null && error === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Tasks' }} />
        <LoadingState label="Loading tasks…" />
      </Screen>
    )
  }

  if (error !== null && data === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Tasks' }} />
        <ErrorState message={error} onRetry={load} />
      </Screen>
    )
  }

  const tasks = data?.tasks ?? []

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Tasks' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
      >
        {tasks.length === 0 ? (
          <EmptyState
            icon="checklist"
            title="No tasks yet"
            description="Tasks created for this event will appear here."
          />
        ) : (
          <>
            <Text style={styles.summary}>{pluralize(tasks.length, 'task')}</Text>
            <TaskBoard
              tasks={tasks}
              currentUserId={currentUserId}
              isOrganizer={isOrganizer}
              onChanged={load}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1, gap: spacing.md },
  summary: { fontSize: fontSize.sm, color: colors.textMuted },
})
