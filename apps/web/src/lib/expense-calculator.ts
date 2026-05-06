export type ParticipantBalance = {
  participantId: string
  name: string
  paid: number   // total amount paid as payer (display)
  owed: number   // total unsettled amount owed as non-payer (display)
  /** Positive = others owe you; negative = you owe others. Excludes settled splits. */
  net: number
}

export type Settlement = {
  fromParticipantId: string
  fromName: string
  toParticipantId: string
  toName: string
  amount: number
}

type ExpenseInput = {
  paid_by: string
  amount: number
  expense_splits: {
    participant_id: string
    amount_owed: number
    is_settled: boolean
  }[]
}

type ParticipantInput = {
  id: string
  user_id: string | null
  display_name: string | null
  profiles: { full_name: string | null }[] | null
}

function displayName(p: ParticipantInput): string {
  return p.display_name || p.profiles?.[0]?.full_name || 'Unknown'
}

/**
 * Calculate per-participant net balances and the minimum set of transactions
 * to settle all outstanding debts (greedy maximize-transfer algorithm).
 *
 * Settled splits are excluded from the outstanding balance.
 *
 * `net` is computed via a credit/debit model that correctly handles settled
 * splits: the payer earns credit only for other participants' unsettled splits;
 * non-payers accumulate debit only for their own unsettled splits.
 * The payer's own split never creates a credit or debit (paying oneself cancels).
 *
 * `paid` and `owed` are raw display totals (before settlement adjustment) so
 * the UI can show context ("you've paid $X in total").
 */
export function calculateBalances(
  expenses: ExpenseInput[],
  participants: ParticipantInput[]
): { balances: ParticipantBalance[]; settlements: Settlement[] } {
  const userToParticipant = new Map<string, string>()
  for (const p of participants) {
    if (p.user_id) userToParticipant.set(p.user_id, p.id)
  }

  // Display accumulators (raw, ignoring settlement status for `paid`)
  const paid = new Map<string, number>()
  const owed = new Map<string, number>()
  // Net accumulators via credit/debit model
  const credit = new Map<string, number>()
  const debit = new Map<string, number>()

  for (const p of participants) {
    paid.set(p.id, 0)
    owed.set(p.id, 0)
    credit.set(p.id, 0)
    debit.set(p.id, 0)
  }

  for (const expense of expenses) {
    const payerParticipantId = userToParticipant.get(expense.paid_by)
    if (payerParticipantId) {
      paid.set(payerParticipantId, (paid.get(payerParticipantId) ?? 0) + expense.amount)
    }

    for (const split of expense.expense_splits) {
      // `owed` display: all unsettled splits the participant is responsible for
      if (!split.is_settled) {
        owed.set(split.participant_id, (owed.get(split.participant_id) ?? 0) + split.amount_owed)
      }

      // Net credit/debit: payer's own split cancels (paying oneself); only
      // other participants' unsettled splits create outstanding obligations.
      const isSelfSplit = payerParticipantId && split.participant_id === payerParticipantId
      if (split.is_settled || isSelfSplit) continue

      // Non-payer owes the payer
      debit.set(split.participant_id, (debit.get(split.participant_id) ?? 0) + split.amount_owed)
      // Payer is owed by the non-payer
      if (payerParticipantId) {
        credit.set(payerParticipantId, (credit.get(payerParticipantId) ?? 0) + split.amount_owed)
      }
    }
  }

  const balances: ParticipantBalance[] = participants.map(p => ({
    participantId: p.id,
    name: displayName(p),
    paid: paid.get(p.id) ?? 0,
    owed: owed.get(p.id) ?? 0,
    net: (credit.get(p.id) ?? 0) - (debit.get(p.id) ?? 0),
  }))

  // Greedy minimize-transactions: repeatedly match largest debtor to largest creditor
  const settlements: Settlement[] = []
  const work = balances.map(b => ({ ...b, remaining: b.net }))

  // eslint-disable-next-line no-constant-condition
  while (true) {
    work.sort((a, b) => a.remaining - b.remaining)
    const debtor = work[0]
    const creditor = work[work.length - 1]

    if (debtor.remaining > -0.005 || creditor.remaining < 0.005) break

    const amount = Math.round(Math.min(-debtor.remaining, creditor.remaining) * 100) / 100
    if (amount < 0.01) break

    settlements.push({
      fromParticipantId: debtor.participantId,
      fromName: debtor.name,
      toParticipantId: creditor.participantId,
      toName: creditor.name,
      amount,
    })

    debtor.remaining += amount
    creditor.remaining -= amount
  }

  return { balances, settlements }
}
