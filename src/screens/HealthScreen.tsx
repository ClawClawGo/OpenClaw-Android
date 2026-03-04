import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useStore } from '../store';
import { getGatewayHealth } from '../services/api';
import { ServerInfo, GatewayStatus } from '../types';

function statusColor(status: GatewayStatus) {
  return status === 'online'
    ? Colors.success
    : status === 'degraded'
    ? Colors.warning
    : status === 'connecting'
    ? Colors.primary
    : Colors.danger;
}

function ServerCard({ server }: { server: ServerInfo }) {
  const color = statusColor(server.status);
  return (
    <View style={styles.serverCard}>
      <View style={styles.serverHeader}>
        <View style={[styles.serverDot, { backgroundColor: color }]} />
        <Text style={styles.serverName}>{server.name}</Text>
        <Text style={[styles.serverStatus, { color }]}>{server.status.toUpperCase()}</Text>
      </View>
      <Text style={styles.serverUrl}>{server.url}</Text>
      <View style={styles.serverMeta}>
        <View style={styles.serverMetaItem}>
          <Text style={styles.serverMetaValue}>{server.latencyMs}ms</Text>
          <Text style={styles.serverMetaLabel}>Latency</Text>
        </View>
        <View style={styles.serverMetaItem}>
          <Text style={styles.serverMetaValue}>{server.model}</Text>
          <Text style={styles.serverMetaLabel}>Model</Text>
        </View>
      </View>
    </View>
  );
}

export default function HealthScreen() {
  const { gatewayHealth, setGatewayHealth, connectionStatus } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const health = await getGatewayHealth();
      setGatewayHealth(health);
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const gwColor = statusColor(gatewayHealth?.status ?? connectionStatus);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Overall Status */}
      <View style={[styles.overallCard, { borderColor: gwColor + '55' }]}>
        <View style={styles.overallHeader}>
          <View style={[styles.overallDot, { backgroundColor: gwColor }]} />
          <Text style={[styles.overallStatus, { color: gwColor }]}>
            {(gatewayHealth?.status ?? connectionStatus).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.overallTitle}>OpenClaw Gateway</Text>
        {gatewayHealth && (
          <Text style={styles.overallVersion}>Version {gatewayHealth.version}</Text>
        )}
      </View>

      {/* Key Metrics */}
      {gatewayHealth && (
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{gatewayHealth.latencyMs}ms</Text>
            <Text style={styles.metricLabel}>Relay Latency</Text>
            <View
              style={[
                styles.metricBar,
                {
                  backgroundColor:
                    gatewayHealth.latencyMs < 100
                      ? Colors.success
                      : gatewayHealth.latencyMs < 300
                      ? Colors.warning
                      : Colors.danger,
                },
              ]}
            />
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: Colors.success }]}>
              {gatewayHealth.uptimePercent.toFixed(2)}%
            </Text>
            <Text style={styles.metricLabel}>Uptime</Text>
            <View style={styles.metricBar} />
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{gatewayHealth.servers.length}</Text>
            <Text style={styles.metricLabel}>Servers</Text>
            <View style={[styles.metricBar, { backgroundColor: Colors.primary }]} />
          </View>
        </View>
      )}

      {/* Server List */}
      <Text style={styles.sectionTitle}>Backend Servers</Text>
      {gatewayHealth?.servers.length ? (
        gatewayHealth.servers.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))
      ) : (
        <Text style={styles.emptyText}>
          {connectionStatus === 'offline'
            ? 'No connection to relay. Pull to retry.'
            : 'No servers registered.'}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  overallCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  overallHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  overallDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  overallStatus: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  overallTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  overallVersion: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  metricValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  metricLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  metricBar: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  serverCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serverHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  serverDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  serverName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  serverStatus: { fontSize: 10, fontWeight: '700' },
  serverUrl: { fontSize: 11, color: Colors.textMuted, marginBottom: 10 },
  serverMeta: { flexDirection: 'row', gap: 20 },
  serverMetaItem: {},
  serverMetaValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  serverMetaLabel: { fontSize: 10, color: Colors.textSecondary },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
