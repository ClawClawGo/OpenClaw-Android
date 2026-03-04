import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, Camera, BarcodeScanningResult } from 'expo-camera';
import { Colors } from '../theme/colors';
import { saveAuthToken, saveRelayUrl } from '../services/secureStorage';
import * as WS from '../services/websocket';
import { useStore } from '../store';

interface PairPayload {
  relay: string;
  token: string;
  name?: string;
}

function parsePairUrl(raw: string): PairPayload | null {
  try {
    // Support both openclaw://pair?... and https://openclaw.io/pair?...
    const url = new URL(raw);
    const relay = url.searchParams.get('relay');
    const token = url.searchParams.get('token');
    if (!relay || !token) return null;
    return {
      relay,
      token,
      name: url.searchParams.get('name') ?? undefined,
    };
  } catch {
    return null;
  }
}

export default function PairScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const { setAuthenticated, setRelayUrl, setConnectionStatus } = useStore();

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned || connecting) return;
    setScanned(true);

    const payload = parsePairUrl(data);
    if (!payload) {
      Alert.alert(
        'Invalid QR Code',
        'This QR code is not a valid OpenClaw pairing code. Please scan the QR from your OpenClaw dashboard.',
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
      return;
    }

    setConnecting(true);
    try {
      await saveRelayUrl(payload.relay);
      await saveAuthToken(payload.token);
      setRelayUrl(payload.relay);
      WS.configure(payload.relay, payload.token);
      setConnectionStatus('connecting');
      WS.connect();

      // Wait briefly for connection
      await new Promise((r) => setTimeout(r, 1800));

      if (WS.isConnected()) {
        setAuthenticated(true);
        // Navigation handled by App.tsx auth state change
      } else {
        setConnectionStatus('offline');
        Alert.alert(
          'Connection Failed',
          `Could not connect to relay at ${payload.relay}. The pairing code may have expired. Please generate a new one from your dashboard.`,
          [{ text: 'Try Again', onPress: () => setScanned(false) }]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to save pairing credentials.');
      setScanned(false);
    } finally {
      setConnecting(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.hint}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>📷</Text>
        <Text style={styles.errorTitle}>Camera Access Required</Text>
        <Text style={styles.hint}>
          OpenClaw needs camera access to scan the pairing QR code from your dashboard.
          Please enable it in your device settings.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top instruction */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scan Pairing QR</Text>
          <View style={{ width: 70 }} />
        </View>

        {/* Viewfinder */}
        <View style={styles.viewfinderWrapper}>
          <View style={styles.viewfinder}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Bottom instructions */}
        <View style={styles.bottomBar}>
          {connecting ? (
            <View style={styles.connectingRow}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.connectingText}>Connecting to gateway…</Text>
            </View>
          ) : (
            <>
              <Text style={styles.instruction}>
                Open your <Text style={styles.bold}>OpenClaw Dashboard</Text> →{' '}
                <Text style={styles.bold}>Settings → Connect Mobile App</Text>
              </Text>
              <Text style={styles.subInstruction}>
                Point your camera at the QR code shown on screen
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  hint: { color: Colors.textSecondary, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  backButton: {
    marginTop: 24,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: { color: Colors.primary, fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cancelBtn: { padding: 8 },
  cancelText: { color: '#fff', fontSize: 15 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  viewfinderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 28,
    alignItems: 'center',
  },
  instruction: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  bold: { fontWeight: '700', color: Colors.primary },
  subInstruction: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
  },
  connectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectingText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});
