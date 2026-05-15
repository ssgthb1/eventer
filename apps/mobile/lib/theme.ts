// Design tokens for the mobile feature screens. Light-only — the web app is
// light-only and Phase 2 keeps parity; a dark palette can be layered on later
// without touching call sites since everything reads from this module.
//
// Palette mirrors the web app's Tailwind usage: indigo as the brand accent,
// slate for text/surfaces, plus semantic colors for status + budget states.

export const colors = {
  brand: '#4f46e5', // indigo-600
  brandSoft: '#eef2ff', // indigo-50
  brandText: '#4338ca', // indigo-700

  bg: '#f8fafc', // slate-50 — screen background
  surface: '#ffffff',
  border: '#e2e8f0', // slate-200

  text: '#0f172a', // slate-900
  textMuted: '#64748b', // slate-500
  textFaint: '#94a3b8', // slate-400

  success: '#16a34a', // green-600
  successSoft: '#f0fdf4', // green-50
  info: '#2563eb', // blue-600
  infoSoft: '#eff6ff', // blue-50
  warning: '#d97706', // amber-600
  warningSoft: '#fffbeb', // amber-50
  danger: '#dc2626', // red-600

  white: '#ffffff',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const

// Accent presets used by Badge / StatTile so screens stay declarative.
export type Accent = 'brand' | 'success' | 'info' | 'warning' | 'neutral'

export const accents: Record<Accent, { fg: string; bg: string }> = {
  brand: { fg: colors.brandText, bg: colors.brandSoft },
  success: { fg: colors.success, bg: colors.successSoft },
  info: { fg: colors.info, bg: colors.infoSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  neutral: { fg: colors.textMuted, bg: '#f1f5f9' /* slate-100 */ },
}
