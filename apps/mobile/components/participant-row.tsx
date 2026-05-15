import { Image } from 'expo-image'
import { View, Text, StyleSheet } from 'react-native'

import { Badge } from '@/components/ui'
import { RsvpControl } from '@/components/rsvp-control'
import { participantName, rsvpPresenter } from '@/lib/event-presenters'
import { initials } from '@/lib/format'
import type { ParticipantRow as Participant } from '@/lib/participants'
import { colors, radius, spacing, fontSize } from '@/lib/theme'

export function ParticipantRow({
  participant,
  isSelf,
  onRsvpChange,
}: {
  participant: Participant
  isSelf: boolean
  onRsvpChange: (next: Participant['rsvp_status']) => void
}) {
  const name = participantName(participant)
  const avatarUrl = participant.profiles?.[0]?.avatar_url ?? null
  const isPlaceholder = !participant.user_id
  const subtitle = isPlaceholder ? (participant.email ?? participant.phone) : null
  const rsvp = rsvpPresenter(participant.rsvp_status)

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
        )}
        <View style={styles.identity}>
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {isSelf && <Text style={styles.you}>(you)</Text>}
          </View>
          <View style={styles.tagLine}>
            {participant.role === 'organizer' && <Badge label="Organizer" accent="brand" />}
            {isPlaceholder && <Badge label="Awaiting sign-in" accent="warning" />}
          </View>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.right}>
        {isSelf ? (
          <RsvpControl
            participantId={participant.id}
            status={participant.rsvp_status}
            onChange={onRsvpChange}
          />
        ) : (
          <Badge label={rsvp.label} accent={rsvp.accent} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  left: { flexDirection: 'row', gap: spacing.md, flexShrink: 1 },
  avatar: { width: 40, height: 40, borderRadius: radius.pill },
  avatarFallback: {
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.brandText },
  identity: { flexShrink: 1, gap: spacing.xs },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, flexShrink: 1 },
  you: { fontSize: fontSize.xs, color: colors.textFaint },
  tagLine: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  subtitle: { fontSize: fontSize.xs, color: colors.textFaint },
  right: { alignItems: 'flex-end', flexShrink: 0 },
})
