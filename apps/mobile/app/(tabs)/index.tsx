import { Alert, Button, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';

export default function HomeScreen() {
  const { state, signOut } = useAuth();
  const email = state.status === 'signedIn' ? state.session.user.email : '';

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) Alert.alert('Sign-out failed', error);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Welcome</ThemedText>
      <ThemedText style={styles.email}>{email}</ThemedText>
      <View style={styles.button}>
        <Button title="Sign out" onPress={handleSignOut} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  email: { fontSize: 16, opacity: 0.7, marginBottom: 24 },
  button: { width: '100%', maxWidth: 320 },
});
