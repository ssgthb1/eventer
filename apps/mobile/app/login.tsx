import { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { state, signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  if (state.status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }
  if (state.status === 'signedIn') return <Redirect href="/(tabs)" />;

  const handleSignIn = async () => {
    setSubmitting(true);
    const { error } = await signInWithGoogle();
    setSubmitting(false);
    if (error && error !== 'cancelled') Alert.alert('Sign-in failed', error);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Eventer</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>
      <View style={styles.button}>
        <Button
          title={submitting ? 'Signing in…' : 'Sign in with Google'}
          onPress={handleSignIn}
          disabled={submitting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: '600' },
  subtitle: { fontSize: 16, opacity: 0.7, marginBottom: 24 },
  button: { width: '100%', maxWidth: 320 },
});
