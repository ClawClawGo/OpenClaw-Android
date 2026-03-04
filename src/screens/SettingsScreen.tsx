import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useStore } from '../store';
import {
  getRelayUrl,
  getAuthToken,
  saveRelayUrl,
  saveAuthToken,
  deleteAuthToken,
  getBudgetLimit,
  saveBudgetLimit,
} from '../services/secureStorage';
import * as WS from '../services/websocket';

export default function SettingsScreen() {
  const { relayUrl, setRelayUrl, setAuthenticated, setConnectionStatus, budgetLimitUsd, setBudgetLimit } =
    useStore();

  const [editRelayUrl, setEditRelayUrl] = useState(relayUrl);
  const [editToken, setEditToken] = useState('');
  const [editBudget, setEditBudget] = useState(budgetLimitUsd?.toString() ?? '');
  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const url = await getRelayUrl();
      const token = await getAuthToken();
      const budget = await getBudgetLimit();
      if (url) setEditRelayUrl(url);
      if (token) setEditToken(token);
      if (budget) setEditBudget(budget.toString());
    })();
  }, []);

  const handleSave = async () => {
    if (!editRelayUrl.trim() || !editToken.trim()) {
      Alert.alert('Missing Fields', 'Relay URL and token are required.');
      return;
    }
    setSaving(true);
    try {
      await saveRelayUrl(editRelayUrl.trim());
      await saveAuthToken(editToken.trim());
      const budgetNum = parseFloat(editBudget);
      if (!isNaN(budgetNum) && budgetNum > 0) {
        await saveBudgetLimit(budgetNum);
        setBudgetLimit(budgetNum);
      }
      setRelayUrl(editRelayUrl.trim());
      WS.disconnect();
      WS.configure(editRelayUrl.trim(), editToken.trim());
      setConnectionStatus('connecting');
      WS.connect();
      Alert.alert('Saved', 'Settings saved and reconnecting…');
    } catch {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Disconnect', 'Remove credentials and disconnect?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          WS.disconnect();
          await deleteAuthToken();
          setAuthenticated(false);
          setConnectionStatus('offline');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Connection</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Cloud Relay URL</Text>
        <TextInput
          style={styles.input}
          value={editRelayUrl}
          onChangeText={setEditRelayUrl}
          placeholder="wss://relay.openclaw.io"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={styles.label}>Auth Token</Text>
        <TextInput
          style={styles.input}
          value={editToken}
          onChangeText={setEditToken}
          placeholder="oc_••••••••••••••••"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Text style={styles.sectionTitle}>Budget & Alerts</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Monthly Budget Limit (USD)</Text>
        <TextInput
          style={styles.input}
          value={editBudget}
          onChangeText={setEditBudget}
          placeholder="e.g. 10.00"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Budget Alert Notifications</Text>
          <Switch
            value={budgetAlertsEnabled}
            onValueChange={setBudgetAlertsEnabled}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.textPrimary}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save & Reconnect'}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Security</Text>
      <View style={styles.card}>
        <Text style={styles.securityNote}>
          🔒 Auth tokens are stored using device-native secure storage (Keychain on iOS, Keystore on Android).
          They are never transmitted in plaintext.
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Disconnect & Remove Credentials</Text>
      </TouchableOpacity>

      <Text style={styles.version}>OpenClaw Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  switchLabel: { fontSize: 14, color: Colors.textPrimary },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: Colors.background, fontWeight: '700', fontSize: 16 },
  securityNote: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  logoutButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.danger + '55',
    backgroundColor: Colors.danger + '11',
    marginBottom: 24,
  },
  logoutText: { color: Colors.danger, fontWeight: '600', fontSize: 15 },
  version: { color: Colors.textMuted, textAlign: 'center', fontSize: 12 },
});
