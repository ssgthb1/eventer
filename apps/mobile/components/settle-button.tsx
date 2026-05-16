import { useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'

import { settleSplit } from '@/lib/expenses'
import { colors, radius, spacing, fontSize } from '@/lib/theme'

/**
 * Two-step settle: tap "Settle" → Confirm / Cancel (mirrors the web
 * SettleButton). Calls onSettled so the parent can reload balances.
 */
export function SettleButton({
  splitId,
  onSettled,
}: {
  splitId: string
  onSettled: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  async function handleSettle() {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    setError(null)
    let ok = false
    try {
      await settleSplit(splitId)
      ok = true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to settle')
      setConfirming(false)
    } finally {
      inFlight.current = false
      setLoading(false)
    }
    // Call after the state settles: onSettled() reloads the parent list,
    // which unmounts this row — touching local state past that point would
    // be a no-op on a stale instance.
    if (ok) onSettled()
  }

  if (error) {
    return (
      <View style={styles.row}>
        <Text style={styles.error} numberOfLines={2}>
          {error}
        </Text>
        <Pressable onPress={() => setError(null)} hitSlop={8}>
          <Text style={styles.ghost}>Dismiss</Text>
        </Pressable>
      </View>
    )
  }

  if (confirming) {
    return (
      <View style={styles.row}>
        <Pressable
          onPress={handleSettle}
          disabled={loading}
          style={[styles.confirm, loading && styles.disabled]}
        >
          <Text style={styles.confirmText}>{loading ? 'Settling…' : 'Confirm'}</Text>
        </Pressable>
        {!loading && (
          <Pressable onPress={() => setConfirming(false)} hitSlop={8}>
            <Text style={styles.ghost}>Cancel</Text>
          </Pressable>
        )}
      </View>
    )
  }

  return (
    <Pressable
      onPress={() => setConfirming(true)}
      style={({ pressed }) => [styles.settle, pressed && styles.disabled]}
      accessibilityRole="button"
    >
      <Text style={styles.settleText}>Settle</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settle: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  settleText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text },
  confirm: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  confirmText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.white },
  ghost: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted },
  disabled: { opacity: 0.5 },
  error: { flexShrink: 1, fontSize: fontSize.xs, color: colors.danger },
})
