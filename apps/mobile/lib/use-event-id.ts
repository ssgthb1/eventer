import { useLocalSearchParams } from 'expo-router'

/**
 * The `[id]` segment for the events/[id]/* routes. Expo Router can hand back
 * `string[]` for a param, so every screen narrowed this by hand — centralized
 * here so the narrowing stays identical everywhere. Returns `undefined`
 * during the brief window before the route is fully mounted.
 */
export function useEventId(): string | undefined {
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  return Array.isArray(params.id) ? params.id[0] : params.id
}
