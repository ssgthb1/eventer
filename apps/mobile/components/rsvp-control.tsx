import { useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'

import type { RsvpStatus } from '@eventer/shared'

import { RSVP_CHOICES } from '@/lib/event-presenters'
import { setRsvp } from '@/lib/participants'
import { colors, radius, spacing, fontSize } from '@/lib/theme'

const ACTIVE: Record<(typeof RSVP_CHOICES)[number]['value'], string> = {
  yes: colors.success,
  maybe: colors.warning,
  no: colors.danger,
}

/**
 * Segmented RSVP control for the signed-in user's own participant row.
 * Optimistic: flips immediately, rolls back if the Supabase update fails
 * (RLS only permits a participant to update their own row).
 */
export function RsvpControl({
  participantId,
  status,
  onChange,
}: {
  participantId: string
  status: RsvpStatus
  onChange: (next: RsvpStatus) => void
}) {
  const [pending, setPending] = useState<RsvpStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Synchronously-readable in-flight guard — `pending` state would be stale in
  // the closure if two chips are tapped within the same render frame.
  const inFlight = useRef(false)
  // Last server-confirmed status. `status` (the prop) may already hold an
  // optimistic value the parent applied, so rolling back to it would be wrong.
  const confirmedRef = useRef<RsvpStatus>(status)

  async function choose(value: (typeof RSVP_CHOICES)[number]['value']) {
    if (value === status || inFlight.current) return
    inFlight.current = true
    setPending(value)
    setError(null)
    onChange(value) // optimistic
    try {
      const confirmed = await setRsvp(participantId, value)
      confirmedRef.current = confirmed
      onChange(confirmed)
    } catch (e) {
      onChange(confirmedRef.current) // rollback to last confirmed
      setError(e instanceof Error ? e.message : 'Could not update RSVP')
    } finally {
      inFlight.current = false
      setPending(null)
    }
  }

  return (
    <View>
      <View style={styles.row}>
        {RSVP_CHOICES.map((opt) => {
          const active = status === opt.value
          return (
            <Pressable
              key={opt.value}
              onPress={() => choose(opt.value)}
              disabled={pending !== null}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: pending !== null }}
              style={[
                styles.chip,
                active && { backgroundColor: ACTIVE[opt.value], borderColor: ACTIVE[opt.value] },
                pending !== null && styles.disabled,
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {pending === opt.value ? '…' : opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.5 },
  chipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.white },
  error: { marginTop: spacing.xs, fontSize: fontSize.xs, color: colors.danger },
})
