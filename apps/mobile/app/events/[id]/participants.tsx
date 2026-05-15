import { Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, View, Text, StyleSheet } from 'react-native'

import type { RsvpStatus } from '@eventer/shared'

import { ParticipantRow } from '@/components/participant-row'
import { Screen, LoadingState, ErrorState, EmptyState } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { listParticipants, type ParticipantRow as Participant } from '@/lib/participants'
import { colors, spacing, fontSize } from '@/lib/theme'

export default function ParticipantsScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const { state } = useAuth()
  const currentUserId = state.status === 'signedIn' ? state.session.user.id : null

  const [participants, setParticipants] = useState<Participant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      setParticipants(await listParticipants(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load participants')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const handleRsvpChange = useCallback(
    (participantId: string, next: RsvpStatus) => {
      setParticipants((prev) =>
        prev
          ? prev.map((p) => (p.id === participantId ? { ...p, rsvp_status: next } : p))
          : prev,
      )
    },
    [],
  )

  if (participants === null && error === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Participants' }} />
        <LoadingState label="Loading participants…" />
      </Screen>
    )
  }

  if (error !== null && participants === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Participants' }} />
        <ErrorState message={error} onRetry={load} />
      </Screen>
    )
  }

  const list = participants ?? []

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Participants' }} />
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <ParticipantRow
            participant={item}
            isSelf={!!currentUserId && item.user_id === currentUserId}
            onRsvpChange={(next) => handleRsvpChange(item.id, next)}
          />
        )}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListHeaderComponent={
          <Text style={styles.subtitle}>
            {list.length} {list.length === 1 ? 'person' : 'people'}
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="group"
            title="No participants yet"
            description="People added to this event will appear here."
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
  subtitle: { marginBottom: spacing.md, fontSize: fontSize.sm, color: colors.textMuted },
  sep: { height: spacing.md },
})
