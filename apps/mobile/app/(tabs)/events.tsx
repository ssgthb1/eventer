import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, View, Text, StyleSheet } from 'react-native'

import type { Event } from '@eventer/shared'

import { EventCard } from '@/components/event-card'
import { Screen, LoadingState, ErrorState, EmptyState } from '@/components/ui'
import { listEvents } from '@/lib/events'
import { colors, spacing, fontSize } from '@/lib/theme'

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setEvents(await listEvents())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  if (events === null && error === null) {
    return (
      <Screen>
        <LoadingState label="Loading events…" />
      </Screen>
    )
  }

  if (error !== null && events === null) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={load} />
      </Screen>
    )
  }

  const list = events ?? []

  return (
    <Screen>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EventCard event={item} />}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Events</Text>
            <Text style={styles.subtitle}>
              {list.length} event{list.length === 1 ? '' : 's'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="event"
            title="No events yet"
            description="Events you create or are invited to will show up here."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  header: { marginBottom: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  subtitle: { marginTop: 2, fontSize: fontSize.sm, color: colors.textMuted },
  sep: { height: spacing.md },
})
