# @eventer/shared

Shared TypeScript code consumed by both `apps/web` and `apps/mobile`.

Currently empty. Planned exports (extracted lazily as mobile screens need them):

- Domain types (Event, Expense, Task, Participant, etc.)
- `expense-calculator` (greedy minimize-transactions algorithm)
- Zod validation schemas (event/expense/task forms)
- Pure-TS date and currency formatters

This package is `tsx`-source only — no build step. Both Next.js and Expo bundlers transpile workspace packages directly.
