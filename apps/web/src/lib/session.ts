import { cache } from 'react'
import { createClient } from './supabase/server'

/**
 * Returns the current authenticated user, memoised with React.cache so that
 * multiple Server Components in the same request tree (e.g. layout + page)
 * share a single Supabase auth round-trip.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
