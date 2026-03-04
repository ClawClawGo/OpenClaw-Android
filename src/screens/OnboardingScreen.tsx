import React, { useState, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import * as Linking from 'expo-linking';
import { Colors } from '../theme/colors';
import { saveAuthToken, saveRelayUrl } from '../services/secureStorage';
import * as WS from '../services/websocket';
import { useStore } from '../store';

export default function OnboardingScreen({ navigation }: any) {
  const [relayUrl, setRelayUrl] = useState('wss://relay.openclaw.io');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const { setAuthenticated, setRelayUrl: storeSetRelayUrl, setConnectionStatus } = useStore();

  // Handle deep link pairing (openclaw://pair?relay=...&token=...)
  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      await processPairUrl(event.url);
    };

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) processPairUrl(url);
    });

    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, []);

  const processPairUrl = async (url: string) => {
    try {
      const parsed = new URL(url);
      if (
        (parsed.protocol === 'openclaw:' && parsed.hostname === 'pair') ||
        (parsed.hostname === 'openclaw.io' && parsed.pathname === '/pair')
      ) {
        const relay = parsed.searchParams.get('relay');
        const tok = parsed.searchParams.get('token');
        if (relay && tok) {
          await connectWith(decodeURIComponent(relay), decodeURIComponent(tok));
        }
      }
    } catch {
      // not a valid pair URL
    }
  };

  const connectWith = async (relay: string, tok: string) => {
    setLoading(true);
    try {
      await saveRelayUrl(relay);
      await saveAuthToken(tok);
      WS.configure(relay, tok);
      storeSetRelayUrl(relay);
      setConnectionStatus('connecting');
      WS.connect();
      await new Promise((r) => setTimeout(r, 1800));
      if (WS.isConnected()) {
        setAuthenticated(true);
      } else {
        setConnectionStatus('offline');
        Alert.alert(
          'Connection Failed',
          'Could not connect to the relay. The pairing code may have expired. Please generate a new one from your OpenClaw dashboard.'
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to save credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualConnect = () => {
    if (!relayUrl.trim() || !token.trim()) {
      Alert.alert('Missing Fields', 'Please enter both relay URL and auth token.');
      return;
    }
    connectWith(relayUrl.trim(), token.trim());
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <Text style={styles.logo}>🦀</Text>
        <Text style={styles.title}>OpenClaw</Text>
        <Text style={styles.subtitle}>AI Gateway Companion</Text>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Connecting to gateway…</Text>
          </View>
        ) : (
          <>
            {/* Primary: QR Scan */}
            <TouchableOpacity
              style={styles.qrButton}
              onPress={() => navigation.navigate('Pair')}
            >
              <Text style={styles.qrIcon}>📷</Text>
              <View style={styles.qrTextBlock}>
                <Text style={styles.qrTitle}>Scan QR Code</Text>
                <Text style={styles.qrSub}>
                  Open your OpenClaw dashboard → Settings → Connect Mobile App
                </Text>
              </View>
              <Text style={styles.qrArrow}>›</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or connect manually</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Manual Entry Toggle */}
            <TouchableOpacity
              style={styles.manualToggle}
              onPress={() => setShowManual(!showManual)}
            >
              <Text style={styles.manualToggleText}>
                {showManual ? '▲ Hide manual setup' : '▼ Enter relay URL & token manually'}
              </Text>
            </TouchableOpacity>

            {showManual && (
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

                <TouchableOpacity style={styles.connectButton} onPress={handleManualConnect}>
                  <Text style={styles.connectButtonText}>Connect Securely</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <Text style={styles.hint}>
          🔒 Credentials stored securely using device Keystore / Keychain
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  logo: { fontSize: 64, marginBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 40,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  loadingCard: {
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  loadingText: { color: Colors.textSecondary, fontSize: 15 },
  qrButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  qrIcon: { fontSize: 32 },
  qrTextBlock: { flex: 1 },
  qrTitle: { fontSize: 17, fontWeight: '800', color: Colors.background },
  qrSub: { fontSize: 12, color: Colors.background + 'CC', marginTop: 3, lineHeight: 17 },
  qrArrow: { fontSize: 24, color: Colors.background, fontWeight: '700' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: 12 },
  manualToggle: { marginBottom: 12 },
  manualToggleText: { color: Colors.primary, fontSize: 14 },
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
  connectButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  connectButtonText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 28,
    textAlign: 'center',
  },
});
