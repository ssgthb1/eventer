import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native'

import type { Event } from '@eventer/shared'

import { Card, Screen, LoadingState, ErrorState } from '@/components/ui'
import { listEvents } from '@/lib/events'
import { useAuth } from '@/lib/auth'
import { colors, radius, spacing, fontSize } from '@/lib/theme'

function firstName(email: string | undefined): string {
  if (!email) return 'there'
  const local = email.split('@')[0]
  const name = local.split(/[._]/)[0]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export default function HomeScreen() {
  const { state } = useAuth()
  const email = state.status === 'signedIn' ? state.session.user.email : undefined

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
        <LoadingState />
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
  const now = Date.now()
  const upcoming = list.filter((e) => e.date && new Date(e.date).getTime() >= now).length

  return (
    <Screen>
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
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroHi}>Hi {firstName(email)} 👋</Text>
          <Text style={styles.heroSub}>{"Here's what's happening."}</Text>
        </View>

        {/* Quick stats */}
        <View style={styles.statRow}>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{list.length}</Text>
            <Text style={styles.statLabel}>Total events</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </Card>
        </View>

        <Link href="/(tabs)/events" asChild>
          <Pressable style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
            <MaterialIcons name="event" size={18} color={colors.white} />
            <Text style={styles.ctaText}>View all events</Text>
            <MaterialIcons name="chevron-right" size={18} color={colors.white} />
          </Pressable>
        </Link>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  hero: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  heroHi: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  heroSub: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textMuted },
  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: spacing.xs },
  statValue: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
})
