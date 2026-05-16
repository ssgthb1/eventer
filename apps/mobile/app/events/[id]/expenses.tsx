import { Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, View, Text, StyleSheet } from 'react-native'

import { BalanceSummary } from '@/components/balance-summary'
import { ExpenseCard } from '@/components/expense-card'
import { Screen, LoadingState, ErrorState, EmptyState } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { getExpensesData, type ExpensesData } from '@/lib/expenses'
import { formatCurrency } from '@/lib/format'
import { pluralize } from '@/lib/event-presenters'
import { colors, spacing, fontSize } from '@/lib/theme'

export default function ExpensesScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const { state } = useAuth()
  const currentUserId = state.status === 'signedIn' ? state.session.user.id : null

  const [data, setData] = useState<ExpensesData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      setData(await getExpensesData(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load expenses')
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

  const isOrganizer = useMemo(() => {
    if (!data || !currentUserId) return false
    if (data.eventCreatedBy === currentUserId) return true
    const mine = data.participants.find((p) => p.user_id === currentUserId)
    return mine?.role === 'organizer'
  }, [data, currentUserId])

  if (data === null && error === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Expenses' }} />
        <LoadingState label="Loading expenses…" />
      </Screen>
    )
  }

  if (error !== null && data === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Expenses' }} />
        <ErrorState message={error} onRetry={load} />
      </Screen>
    )
  }

  const expenses = data?.expenses ?? []
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Expenses' }} />
      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            currentUserId={currentUserId}
            isOrganizer={isOrganizer}
            onSettled={load}
          />
        )}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <BalanceSummary
              participants={data?.participants ?? []}
              expenses={expenses}
            />
            {expenses.length > 0 && (
              <Text style={styles.summary}>
                {pluralize(expenses.length, 'expense')} · {formatCurrency(total)} total
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-long"
            title="No expenses yet"
            description="Expenses logged for this event will appear here."
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
  header: { gap: spacing.md, marginBottom: spacing.md },
  summary: { fontSize: fontSize.sm, color: colors.textMuted },
  sep: { height: spacing.md },
})
