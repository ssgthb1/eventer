import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { View, Text, StyleSheet } from 'react-native'

import { SettleButton } from '@/components/settle-button'
import { splitName } from '@/lib/event-presenters'
import type { ExpenseRow } from '@/lib/expenses'
import { formatCurrency, formatDate } from '@/lib/format'
import { colors, radius, spacing, fontSize } from '@/lib/theme'

export function ExpenseCard({
  expense,
  currentUserId,
  isOrganizer,
  onSettled,
}: {
  expense: ExpenseRow
  currentUserId: string | null
  isOrganizer: boolean
  onSettled: () => void
}) {
  const payerName = expense.payer?.[0]?.full_name ?? 'Unknown'
  const canSettleAny = expense.paid_by === currentUserId || isOrganizer

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text style={styles.desc} numberOfLines={2}>
            {expense.description}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            Paid by {payerName} · {formatDate(expense.created_at)}
          </Text>
        </View>
        <View style={styles.headRight}>
          <Text style={styles.amount}>{formatCurrency(Number(expense.amount))}</Text>
          <Text style={styles.split}>{expense.split_type} split</Text>
        </View>
      </View>

      {expense.expense_splits.length > 0 && (
        <View style={styles.splits}>
          {expense.expense_splits.map((s) => {
            const canSettle = !s.is_settled && canSettleAny
            return (
              <View key={s.id} style={styles.splitRow}>
                <Text
                  style={[styles.splitName, s.is_settled && styles.struck]}
                  numberOfLines={1}
                >
                  {splitName(s.event_participants)}
                </Text>
                <View style={styles.splitRight}>
                  <Text style={[styles.splitAmt, s.is_settled && styles.muted]}>
                    {formatCurrency(Number(s.amount_owed))}
                  </Text>
                  {s.is_settled ? (
                    <MaterialIcons name="check-circle" size={14} color={colors.success} />
                  ) : (
                    canSettle && <SettleButton splitId={s.id} onSettled={onSettled} />
                  )}
                </View>
              </View>
            )
          })}
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
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  headLeft: { flexShrink: 1 },
  desc: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  meta: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
  headRight: { alignItems: 'flex-end', flexShrink: 0 },
  amount: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  split: { fontSize: fontSize.xs, color: colors.textFaint, textTransform: 'capitalize' },
  splits: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  splitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  splitName: { flexShrink: 1, fontSize: fontSize.xs, color: colors.textMuted },
  struck: { textDecorationLine: 'line-through', color: colors.textFaint },
  splitRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  splitAmt: { fontSize: fontSize.xs, color: colors.textMuted },
  muted: { color: colors.textFaint },
})
