import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Link, type Href } from 'expo-router'
import { View, Text, Pressable, StyleSheet } from 'react-native'

import { accents, type Accent, colors, radius, spacing, fontSize } from '@/lib/theme'

/**
 * Stat row: accent icon chip + value + label. When `href` is provided the
 * tile is tappable (chevron affordance + press feedback) and navigates;
 * without it the tile is static — used for sections whose screens don't
 * exist yet, so we don't signal a dead-end navigation.
 */
export function StatTile({
  icon,
  value,
  label,
  accent = 'brand',
  href,
}: {
  icon: keyof typeof MaterialIcons.glyphMap
  value: string
  label: string
  accent?: Accent
  href?: Href
}) {
  const a = accents[accent]
  const inner = (
    <>
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
      {href != null && (
        <MaterialIcons
          name="chevron-right"
          size={18}
          color={colors.textFaint}
          style={styles.chevron}
        />
      )}
    </>
  )

  if (href == null) {
    return <View style={styles.tile}>{inner}</View>
  }

  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
        {inner}
      </Pressable>
    </Link>
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
  pressed: { opacity: 0.85 },
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
  chevron: { marginLeft: 'auto' },
})
