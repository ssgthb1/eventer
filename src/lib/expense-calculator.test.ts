import { describe, it, expect } from 'vitest'
import { calculateBalances } from './expense-calculator'

const makeParticipant = (id: string, name: string, userId?: string) => ({
  id,
  user_id: userId ?? id,
  display_name: name,
  profiles: null,
})

const makeExpense = (
  paidBy: string,
  amount: number,
  splits: { participantId: string; amountOwed: number; isSettled?: boolean }[]
) => ({
  paid_by: paidBy,
  amount,
  expense_splits: splits.map(s => ({
    participant_id: s.participantId,
    amount_owed: s.amountOwed,
    is_settled: s.isSettled ?? false,
  })),
})

describe('calculateBalances', () => {
  it('returns zero balances with no expenses', () => {
    const participants = [makeParticipant('a', 'Alice'), makeParticipant('b', 'Bob')]
    const { balances, settlements } = calculateBalances([], participants)
    expect(balances).toHaveLength(2)
    expect(balances.every(b => b.net === 0)).toBe(true)
    expect(settlements).toHaveLength(0)
  })

  it('one payer, two participants — splits evenly', () => {
    const alice = makeParticipant('pa', 'Alice', 'ua')
    const bob = makeParticipant('pb', 'Bob', 'ub')
    const expense = makeExpense('ua', 20, [
      { participantId: 'pa', amountOwed: 10 },
      { participantId: 'pb', amountOwed: 10 },
    ])
    const { balances, settlements } = calculateBalances([expense], [alice, bob])

    const aliceBal = balances.find(b => b.participantId === 'pa')!
    const bobBal = balances.find(b => b.participantId === 'pb')!

    expect(aliceBal.paid).toBe(20)
    expect(aliceBal.owed).toBe(10)
    expect(aliceBal.net).toBe(10) // Alice is owed $10

    expect(bobBal.paid).toBe(0)
    expect(bobBal.owed).toBe(10)
    expect(bobBal.net).toBe(-10) // Bob owes $10

    expect(settlements).toHaveLength(1)
    expect(settlements[0].fromName).toBe('Bob')
    expect(settlements[0].toName).toBe('Alice')
    expect(settlements[0].amount).toBe(10)
  })

  it('multiple expenses — greedy minimizes transactions', () => {
    const alice = makeParticipant('pa', 'Alice', 'ua')
    const bob = makeParticipant('pb', 'Bob', 'ub')
    const carol = makeParticipant('pc', 'Carol', 'uc')

    // Alice paid $30 (each owes $10)
    const e1 = makeExpense('ua', 30, [
      { participantId: 'pa', amountOwed: 10 },
      { participantId: 'pb', amountOwed: 10 },
      { participantId: 'pc', amountOwed: 10 },
    ])
    // Bob paid $30 (each owes $10)
    const e2 = makeExpense('ub', 30, [
      { participantId: 'pa', amountOwed: 10 },
      { participantId: 'pb', amountOwed: 10 },
      { participantId: 'pc', amountOwed: 10 },
    ])

    const { balances, settlements } = calculateBalances([e1, e2], [alice, bob, carol])

    // Alice: paid 30, owed 20, net = +10
    // Bob:   paid 30, owed 20, net = +10
    // Carol: paid 0,  owed 20, net = -20
    const carolBal = balances.find(b => b.participantId === 'pc')!
    expect(carolBal.net).toBe(-20)

    // Carol owes $10 to Alice and $10 to Bob — 2 transactions
    expect(settlements).toHaveLength(2)
    const total = settlements.reduce((s, t) => s + t.amount, 0)
    expect(total).toBe(20)
    expect(settlements.every(s => s.fromName === 'Carol')).toBe(true)
  })

  it('settled splits are excluded from balance', () => {
    const alice = makeParticipant('pa', 'Alice', 'ua')
    const bob = makeParticipant('pb', 'Bob', 'ub')
    const expense = makeExpense('ua', 20, [
      { participantId: 'pa', amountOwed: 10, isSettled: true },
      { participantId: 'pb', amountOwed: 10, isSettled: true },
    ])
    const { balances, settlements } = calculateBalances([expense], [alice, bob])

    // Alice paid $20; both splits settled → net = 0 (Bob paid Alice, Alice covers her own share)
    const aliceBal = balances.find(b => b.participantId === 'pa')!
    expect(aliceBal.paid).toBe(20)
    expect(aliceBal.owed).toBe(0) // settled
    expect(aliceBal.net).toBe(0)  // no outstanding credit once Bob settled

    const bobBal = balances.find(b => b.participantId === 'pb')!
    expect(bobBal.owed).toBe(0)   // settled
    expect(bobBal.net).toBe(0)

    // No outstanding settlements
    expect(settlements).toHaveLength(0)
  })

  it('partial settlement — only settled split is removed from net', () => {
    const alice = makeParticipant('pa', 'Alice', 'ua')
    const bob = makeParticipant('pb', 'Bob', 'ub')
    const expense = makeExpense('ua', 20, [
      { participantId: 'pa', amountOwed: 10 },           // Alice's own — not settled
      { participantId: 'pb', amountOwed: 10, isSettled: true }, // Bob settled
    ])
    const { balances, settlements } = calculateBalances([expense], [alice, bob])

    // Bob settled his $10; Alice's own split doesn't affect net
    const aliceBal = balances.find(b => b.participantId === 'pa')!
    expect(aliceBal.net).toBe(0) // Bob settled; payer's own split cancels

    const bobBal = balances.find(b => b.participantId === 'pb')!
    expect(bobBal.net).toBe(0) // settled

    expect(settlements).toHaveLength(0)
  })

  it('all even — no settlements needed', () => {
    const alice = makeParticipant('pa', 'Alice', 'ua')
    const bob = makeParticipant('pb', 'Bob', 'ub')

    const e1 = makeExpense('ua', 10, [
      { participantId: 'pa', amountOwed: 5 },
      { participantId: 'pb', amountOwed: 5 },
    ])
    const e2 = makeExpense('ub', 10, [
      { participantId: 'pa', amountOwed: 5 },
      { participantId: 'pb', amountOwed: 5 },
    ])

    const { settlements } = calculateBalances([e1, e2], [alice, bob])
    expect(settlements).toHaveLength(0)
  })

  it('payer without a participant record is ignored gracefully', () => {
    const alice = makeParticipant('pa', 'Alice', 'ua')
    // paidBy user 'ux' has no participant record
    const expense = makeExpense('ux', 20, [
      { participantId: 'pa', amountOwed: 20 },
    ])
    const { balances, settlements } = calculateBalances([expense], [alice])
    // Alice owes but nobody is credited (orphaned payer) — debit accumulates, no creditor
    const aliceBal = balances.find(b => b.participantId === 'pa')!
    expect(aliceBal.owed).toBe(20)
    expect(aliceBal.paid).toBe(0)
    // No creditor to settle with, greedy exits immediately
    expect(settlements).toHaveLength(0)
  })
})
