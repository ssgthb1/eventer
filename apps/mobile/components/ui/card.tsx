import { View, type ViewProps, StyleSheet } from 'react-native'

import { colors, radius, spacing } from '@/lib/theme'

/** White surface with the standard slate border + rounded corners. */
export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
})
