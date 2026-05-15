import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import { Alert, Pressable, View, Text, StyleSheet } from 'react-native'

import { Card, Screen } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { initials } from '@/lib/format'
import { colors, radius, spacing, fontSize } from '@/lib/theme'

export default function ProfileScreen() {
  const { state, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const user = state.status === 'signedIn' ? state.session.user : null
  const email = user?.email ?? ''
  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    null

  const handleSignOut = async () => {
    setSigningOut(true)
    const { error } = await signOut()
    setSigningOut(false)
    if (error) Alert.alert('Sign-out failed', error)
  }

  return (
    <Screen padded>
      <Text style={styles.title}>Profile</Text>

      <Card style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(fullName || email)}</Text>
        </View>
        <View style={styles.identity}>
          {!!fullName && <Text style={styles.name}>{fullName}</Text>}
          <Text style={styles.email}>{email}</Text>
        </View>
      </Card>

      <Pressable
        onPress={handleSignOut}
        disabled={signingOut}
        style={({ pressed }) => [
          styles.signOut,
          pressed && styles.signOutPressed,
          signingOut && styles.disabled,
        ]}
      >
        <MaterialIcons name="logout" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.brandText },
  identity: { flexShrink: 1, gap: 2 },
  name: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  email: { fontSize: fontSize.sm, color: colors.textMuted },
  signOut: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
  },
  signOutPressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  signOutText: { color: colors.danger, fontWeight: '700', fontSize: fontSize.md },
})
