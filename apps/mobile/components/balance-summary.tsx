import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'

import { calculateBalances } from '@eventer/shared'

import { allDebtsSettled, netBalanceView } from '@/lib/event-presenters'
import type { BalanceParticipant, ExpenseRow } from '@/lib/expenses'
import { formatCurrency } from '@/lib/format'
import { colors, radius, spacing, fontSize } from '@/lib/theme'

const TONE_COLOR = {
  positive: colors.success,
  negative: colors.danger,
  muted: colors.textFaint,
} as const

/**
 * Per-participant net + settlement plan. Uses the shared calculateBalances
 * (identical to web BalanceSummary). Renders nothing when there are no
 * expenses, matching web.
 */
export function BalanceSummary({
  participants,
  expenses,
}: {
  participants: BalanceParticipant[]
  expenses: ExpenseRow[]
}) {
  const { balances, settlements, settled } = useMemo(() => {
    const r = calculateBalances(expenses, participants)
    return { ...r, settled: allDebtsSettled(expenses, r.settlements.length) }
  }, [expenses, participants])

  if (expenses.length === 0) return null

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Balance summary</Text>

      <View style={styles.section}>
        {balances.map((b) => {
          const v = netBalanceView(b.net)
          return (
            <View key={b.participantId} style={styles.balanceRow}>
              <Text style={styles.name} numberOfLines={1}>
                {b.name}
              </Text>
              <Text style={[styles.net, { color: TONE_COLOR[v.tone] }]}>{v.label}</Text>
            </View>
          )
        })}
      </View>

      {settled ? (
        <Text style={styles.settled}>All debts settled!</Text>
      ) : (
        <View style={styles.section}>
          <Text style={styles.subhead}>To settle up:</Text>
          {settlements.map((s) => (
            <View key={`${s.fromParticipantId}-${s.toParticipantId}`} style={styles.settleRow}>
              <Text style={styles.settleText} numberOfLines={1}>
                <Text style={styles.bold}>{s.fromName}</Text> owes{' '}
                <Text style={styles.bold}>{s.toName}</Text>
              </Text>
              <Text style={styles.amount}>{formatCurrency(s.amount)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  section: { gap: spacing.sm },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  name: { flexShrink: 1, fontSize: fontSize.sm, color: colors.text },
  net: { fontSize: fontSize.sm, fontWeight: '600' },
  subhead: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted },
  settleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settleText: { flexShrink: 1, fontSize: fontSize.xs, color: colors.text },
  bold: { fontWeight: '700' },
  amount: { marginLeft: 'auto', fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  settled: { fontSize: fontSize.xs, fontWeight: '600', color: colors.success },
})
