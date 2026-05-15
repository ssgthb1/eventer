import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { View, Text, StyleSheet } from 'react-native'

import { accents, type Accent, colors, radius, spacing, fontSize } from '@/lib/theme'

/**
 * Read-only stat row: accent icon chip + value + label. Phase 2.1 keeps these
 * non-navigable — the participants/expenses/tasks sub-screens land in later
 * sub-issues, so signalling navigation here would be a dead end.
 */
export function StatTile({
  icon,
  value,
  label,
  accent = 'brand',
}: {
  icon: keyof typeof MaterialIcons.glyphMap
  value: string
  label: string
  accent?: Accent
}) {
  const a = accents[accent]
  return (
    <View style={styles.tile}>
      <View style={[styles.iconChip, { backgroundColor: a.bg }]}>
        <MaterialIcons name={icon} size={20} color={a.fg} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flexShrink: 1 },
  value: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  label: { fontSize: fontSize.xs, color: colors.textMuted },
})
