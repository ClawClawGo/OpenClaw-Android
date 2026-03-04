import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { saveAuthToken, saveRelayUrl } from '../services/secureStorage';
import * as WS from '../services/websocket';
import { useStore } from '../store';

export default function OnboardingScreen() {
  const [relayUrl, setRelayUrl] = useState('wss://relay.openclaw.io');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuthenticated, setRelayUrl: storeSetRelayUrl, setConnectionStatus } = useStore();

  const handleConnect = async () => {
    if (!relayUrl.trim() || !token.trim()) {
      Alert.alert('Missing Fields', 'Please enter both relay URL and auth token.');
      return;
    }
    setLoading(true);
    try {
      await saveRelayUrl(relayUrl.trim());
      await saveAuthToken(token.trim());
      WS.configure(relayUrl.trim(), token.trim());
      storeSetRelayUrl(relayUrl.trim());
      setConnectionStatus('connecting');
      WS.connect();
      // Give WS a moment to connect
      await new Promise((r) => setTimeout(r, 1500));
      if (WS.isConnected()) {
        setAuthenticated(true);
      } else {
        setConnectionStatus('offline');
        Alert.alert('Connection Failed', 'Could not connect to relay. Check URL and token.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🦀</Text>
        <Text style={styles.title}>OpenClaw</Text>
        <Text style={styles.subtitle}>AI Gateway Companion</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Cloud Relay URL</Text>
          <TextInput
            style={styles.input}
            value={relayUrl}
            onChangeText={setRelayUrl}
            placeholder="wss://relay.openclaw.io"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={styles.label}>Auth Token</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="oc_••••••••••••••••"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleConnect}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.buttonText}>Connect Securely</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Your token is stored securely using device Keystore / Keychain.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: { fontSize: 64, marginBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 40,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 20,
    textAlign: 'center',
  },
});
