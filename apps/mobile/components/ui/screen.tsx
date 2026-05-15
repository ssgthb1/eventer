import type { ReactNode } from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { colors, spacing } from '@/lib/theme'

/**
 * Full-bleed screen background with safe-area insets. `padded` adds the
 * standard horizontal/vertical gutter; omit it for screens that host a
 * FlatList (the list supplies its own contentContainer padding).
 */
export function Screen({
  children,
  padded = false,
  edges = ['top', 'left', 'right'],
  style,
}: {
  children: ReactNode
  padded?: boolean
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
  style?: ViewStyle
}) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={[styles.body, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
})
