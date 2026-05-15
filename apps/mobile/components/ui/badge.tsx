import { View, Text, StyleSheet } from 'react-native'

import { accents, type Accent, radius, spacing, fontSize } from '@/lib/theme'

export function Badge({
  label,
  accent = 'neutral',
  dot = false,
}: {
  label: string
  accent?: Accent
  dot?: boolean
}) {
  const a = accents[accent]
  return (
    <View style={[styles.badge, { backgroundColor: a.bg }]}>
      {dot && <View style={[styles.dot, { backgroundColor: a.fg }]} />}
      <Text style={[styles.text, { color: a.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
})
