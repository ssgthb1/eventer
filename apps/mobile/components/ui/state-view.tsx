import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native'

import { colors, spacing, fontSize, radius } from '@/lib/theme'

/** Centered full-area spinner. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.brand} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  )
}

/** Centered error with an optional retry button. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <View style={styles.center}>
      <MaterialIcons name="error-outline" size={40} color={colors.danger} />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  )
}

/** Centered empty state: icon + title + description. */
export function EmptyState({
  icon = 'inbox',
  title,
  description,
}: {
  icon?: keyof typeof MaterialIcons.glyphMap
  title: string
  description?: string
}) {
  return (
    <View style={styles.center}>
      <MaterialIcons name={icon} size={44} color={colors.textFaint} />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.muted}>{description}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  muted: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  retryPressed: { opacity: 0.8 },
  retryText: { color: colors.white, fontWeight: '600', fontSize: fontSize.md },
})
