export type Role = 'super_admin' | 'admin' | 'user'
export type ParticipantRole = 'organizer' | 'participant'
export type RsvpStatus = 'pending' | 'yes' | 'no' | 'maybe'
export type EventStatus = 'draft' | 'active' | 'completed'
export type SplitType = 'equal' | 'custom'
export type TaskStatus = 'open' | 'in_progress' | 'done'
export type InvitationStatus = 'pending' | 'accepted' | 'declined'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: Role
  created_at: string
}

export interface Event {
  id: string
  created_by: string
  name: string
  description: string | null
  date: string | null
  location: string | null
  venue_notes: string | null
  budget: number | null
  status: EventStatus
  created_at: string
}

export interface EventParticipant {
  id: string
  event_id: string
  user_id: string | null
  email: string | null
  phone: string | null
  display_name: string | null
  role: ParticipantRole
  rsvp_status: RsvpStatus
  joined_at: string
}

export interface Invitation {
  id: string
  event_id: string
  invited_by: string
  email: string | null
  phone: string | null
  token: string
  status: InvitationStatus
  created_at: string
  expires_at: string
}

export interface Expense {
  id: string
  event_id: string
  paid_by: string
  amount: number
  description: string
  split_type: SplitType
  created_at: string
}

export interface ExpenseSplit {
  id: string
  expense_id: string
  participant_id: string
  amount_owed: number
  is_settled: boolean
  settled_at: string | null
}

export interface Task {
  id: string
  event_id: string
  created_by: string
  assigned_to: string | null
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
  created_at: string
}

// ─── Enriched / joined types ─────────────────────────────────

export interface EventWithParticipants extends Event {
  event_participants: EventParticipant[]
}

export interface ExpenseWithSplits extends Expense {
  expense_splits: ExpenseSplit[]
  payer: Profile
}

export interface TaskWithProfiles extends Task {
  creator: Profile | null
  assignee: Profile | null
}

// ─── Balance / settlement ─────────────────────────────────────

export interface Balance {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}

export interface NetBalance {
  userId: string
  name: string
  net: number  // positive = owed money, negative = owes money
}
