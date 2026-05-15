// The balance/settlement algorithm now lives in @eventer/shared so apps/web
// and apps/mobile compute identical results from one source of truth.
// This re-export keeps existing `@/lib/expense-calculator` imports working.
export { calculateBalances } from '@eventer/shared'
export type { ParticipantBalance, Settlement } from '@eventer/shared'
