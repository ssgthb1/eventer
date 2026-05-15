import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Link } from 'expo-router'
import { Pressable, View, Text, StyleSheet } from 'react-native'

import type { Event } from '@eventer/shared'

import { Badge } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import { statusAccent } from '@/lib/event-presenters'
import { colors, radius, spacing, fontSize } from '@/lib/theme'

function dateChip(date: string | null): { mon: string; day: string; sub: string } | null {
  if (!date) return null
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  return {
    mon: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(d.getDate()),
    sub: `${d.toLocaleDateString('en-US', { weekday: 'short' })} · ${d.toLocaleTimeString(
      'en-US',
      { hour: 'numeric', minute: '2-digit' },
    )}`,
  }
}

export function EventCard({ event }: { event: Event }) {
  const chip = dateChip(event.date)
  return (
    <Link href={`/events/${event.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        {/* Date strip */}
        <View style={styles.strip}>
          {chip ? (
            <View style={styles.stripLeft}>
              <View style={styles.dateBox}>
                <Text style={styles.dateMon}>{chip.mon}</Text>
                <Text style={styles.dateDay}>{chip.day}</Text>
              </View>
              <Text style={styles.stripSub}>{chip.sub}</Text>
            </View>
          ) : (
            <View style={styles.stripLeft}>
              <MaterialIcons name="event-busy" size={16} color={colors.textFaint} />
              <Text style={styles.noDate}>No date set</Text>
            </View>
          )}
          <Badge label={event.status} accent={statusAccent(event.status)} dot />
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {event.name}
          </Text>
          {!!event.description && (
            <Text style={styles.desc} numberOfLines={2}>
              {event.description}
            </Text>
          )}
          <View style={styles.meta}>
            {!!event.location && (
              <View style={styles.metaRow}>
                <MaterialIcons name="place" size={14} color={colors.textFaint} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            )}
            {event.budget != null && (
              <View style={styles.metaRow}>
                <MaterialIcons
                  name="account-balance-wallet"
                  size={14}
                  color={colors.textFaint}
                />
                <Text style={styles.metaText}>
                  Budget {formatCurrency(Number(event.budget))}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.brandSoft,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  stripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  dateBox: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMon: { fontSize: 9, fontWeight: '700', color: colors.brand },
  dateDay: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  stripSub: { fontSize: fontSize.xs, color: colors.textMuted, flexShrink: 1 },
  noDate: { fontSize: fontSize.xs, color: colors.textFaint },
  body: { padding: spacing.lg },
  name: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  desc: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textMuted },
  meta: { marginTop: spacing.md, gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { fontSize: fontSize.xs, color: colors.textMuted, flexShrink: 1 },
})
