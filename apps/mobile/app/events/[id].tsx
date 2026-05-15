import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, View, Text, StyleSheet } from 'react-native'

import { Badge, Card, StatTile, Screen, LoadingState, ErrorState } from '@/components/ui'
import { getEventDetail, type EventDetail } from '@/lib/events'
import { budgetView, statusAccent, taskProgressPct, pluralize } from '@/lib/event-presenters'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { colors, radius, spacing, fontSize } from '@/lib/theme'

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>()
  // useLocalSearchParams can yield string[] for repeated params — narrow it.
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [detail, setDetail] = useState<EventDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      setDetail(await getEventDetail(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load event')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (detail === null && error === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Event' }} />
        <LoadingState />
      </Screen>
    )
  }

  if (error !== null || detail === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Event' }} />
        <ErrorState message={error ?? 'Event not found'} onRetry={load} />
      </Screen>
    )
  }

  const { event, participantCount, expenseCount, totalSpend, taskCounts } = detail
  const budget = budgetView(event.budget, totalSpend)

  return (
    <Screen>
      <Stack.Screen options={{ title: event.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>{event.name}</Text>
          <Badge label={event.status} accent={statusAccent(event.status)} dot />
        </View>
        {!!event.date && (
          <View style={styles.metaRow}>
            <MaterialIcons name="schedule" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDateTime(event.date)}</Text>
          </View>
        )}
        {!!event.location && (
          <View style={styles.metaRow}>
            <MaterialIcons name="place" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{event.location}</Text>
          </View>
        )}

        {/* Stat tiles (read-only in Phase 2.1) */}
        <View style={styles.stats}>
          <StatTile
            icon="group"
            value={String(participantCount)}
            label="Participants"
            accent="brand"
          />
          <StatTile
            icon="attach-money"
            value={formatCurrency(totalSpend)}
            label={pluralize(expenseCount, 'expense')}
            accent="success"
          />
          <StatTile
            icon="check-box"
            value={`${taskCounts.done}/${taskCounts.total}`}
            label="Tasks done"
            accent="info"
          />
        </View>

        {/* Budget */}
        {budget.set && (
          <Card style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Budget</Text>
              <Text style={[styles.cardHint, budget.over && styles.over]}>
                {budget.over
                  ? `${formatCurrency(-budget.delta)} over budget`
                  : `${formatCurrency(budget.delta)} remaining`}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${budget.pct}%`,
                    backgroundColor: budget.over
                      ? colors.danger
                      : budget.pct >= 80
                        ? colors.warning
                        : colors.brand,
                  },
                ]}
              />
            </View>
            <View style={styles.cardHead}>
              <Text style={styles.faint}>
                Spent <Text style={styles.strong}>{formatCurrency(totalSpend)}</Text>
              </Text>
              <Text style={styles.faint}>
                Budget{' '}
                <Text style={styles.strong}>{formatCurrency(Number(event.budget))}</Text>
              </Text>
            </View>
          </Card>
        )}

        {/* Task progress */}
        {taskCounts.total > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Tasks</Text>
            <View style={styles.pillRow}>
              <Badge label={`${taskCounts.open} open`} accent="neutral" />
              <Badge label={`${taskCounts.in_progress} in progress`} accent="warning" />
              <Badge label={`${taskCounts.done} done`} accent="success" />
            </View>
            <View style={[styles.track, styles.trackThin]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${taskProgressPct(taskCounts.done, taskCounts.total)}%`,
                    backgroundColor: colors.success,
                  },
                ]}
              />
            </View>
          </Card>
        )}

        {/* Details */}
        <Card style={styles.card}>
          {!!event.description && (
            <View style={styles.section}>
              <Text style={styles.label}>DESCRIPTION</Text>
              <Text style={styles.bodyText}>{event.description}</Text>
            </View>
          )}
          {!!event.venue_notes && (
            <View style={styles.section}>
              <Text style={styles.label}>VENUE NOTES</Text>
              <Text style={styles.bodyText}>{event.venue_notes}</Text>
            </View>
          )}
          {!event.description && !event.venue_notes && (
            <Text style={styles.faint}>No additional details.</Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: { flex: 1, fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { fontSize: fontSize.sm, color: colors.textMuted },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  card: { gap: spacing.md },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  cardHint: { fontSize: fontSize.xs, color: colors.textMuted },
  over: { color: colors.danger },
  track: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  trackThin: { height: 6 },
  fill: { height: '100%', borderRadius: radius.pill },
  faint: { fontSize: fontSize.xs, color: colors.textMuted },
  strong: { fontWeight: '700', color: colors.text },
  pillRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  section: { gap: spacing.xs },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  bodyText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
})
