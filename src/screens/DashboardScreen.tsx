import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useStore } from '../store';
import { getUsageStats, getGatewayHealth, listSessions } from '../services/api';

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'online'
      ? Colors.success
      : status === 'degraded'
      ? Colors.warning
      : status === 'connecting'
      ? Colors.primary
      : Colors.danger;
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <View style={[styles.statCard, accent ? { borderColor: accent } : {}]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent ? { color: accent } : {}]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function DashboardScreen({ navigation }: any) {
  const {
    connectionStatus,
    usageStats,
    gatewayHealth,
    sessions,
    budgetLimitUsd,
    setUsageStats,
    setGatewayHealth,
    setSessions,
  } = useStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const load = useCallback(async () => {
    try {
      const [stats, health, sess] = await Promise.all([
        getUsageStats(30),
        getGatewayHealth(),
        listSessions(),
      ]);
      setUsageStats(stats);
      setGatewayHealth(health);
      setSessions(sess);
    } catch {
      // silently fail — offline state handled by connection status
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const budgetPercent =
    usageStats && budgetLimitUsd
      ? Math.min((usageStats.estimatedCostUsd / budgetLimitUsd) * 100, 100)
      : null;

  const isOffline = connectionStatus === 'offline';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>OpenClaw</Text>
          <Text style={styles.subGreeting}>AI Gateway Dashboard</Text>
        </View>
        <View style={styles.statusBadge}>
          <StatusDot status={connectionStatus} />
          <Text style={styles.statusText}>{connectionStatus.toUpperCase()}</Text>
        </View>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠️  No connection to relay. Pull to retry.</Text>
        </View>
      )}

      {/* Gateway Health Card */}
      {gatewayHealth && (
        <View style={styles.healthCard}>
          <Text style={styles.sectionTitle}>Gateway Health</Text>
          <View style={styles.healthRow}>
            <View style={styles.healthItem}>
              <Text style={styles.healthValue}>{gatewayHealth.latencyMs}ms</Text>
              <Text style={styles.healthLabel}>Latency</Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={[styles.healthValue, { color: Colors.success }]}>
                {gatewayHealth.uptimePercent.toFixed(1)}%
              </Text>
              <Text style={styles.healthLabel}>Uptime</Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthValue}>{gatewayHealth.servers.length}</Text>
              <Text style={styles.healthLabel}>Servers</Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthValue}>v{gatewayHealth.version}</Text>
              <Text style={styles.healthLabel}>Version</Text>
            </View>
          </View>
        </View>
      )}

      {/* Usage Stats */}
      <Text style={styles.sectionTitle}>Usage (30 days)</Text>
      <View style={styles.statsRow}>
        <StatCard
          label="Total Tokens"
          value={usageStats ? (usageStats.totalTokens / 1000).toFixed(1) + 'K' : '—'}
          sub="tokens consumed"
        />
        <StatCard
          label="Est. Cost"
          value={usageStats ? `$${usageStats.estimatedCostUsd.toFixed(4)}` : '—'}
          sub="USD"
          accent={
            budgetPercent && budgetPercent > 80 ? Colors.warning : Colors.success
          }
        />
      </View>

      {/* Budget Bar */}
      {budgetPercent !== null && (
        <View style={styles.budgetContainer}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetLabel}>Budget Usage</Text>
            <Text style={styles.budgetPercent}>{budgetPercent.toFixed(0)}%</Text>
          </View>
          <View style={styles.budgetBar}>
            <View
              style={[
                styles.budgetFill,
                {
                  width: `${budgetPercent}%` as any,
                  backgroundColor:
                    budgetPercent > 90
                      ? Colors.danger
                      : budgetPercent > 70
                      ? Colors.warning
                      : Colors.success,
                },
              ]}
            />
          </View>
          <Text style={styles.budgetSub}>
            ${usageStats?.estimatedCostUsd.toFixed(4)} / ${budgetLimitUsd?.toFixed(2)} limit
          </Text>
        </View>
      )}

      {/* Recent Sessions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Agents')}>
          <Text style={styles.seeAll}>See All →</Text>
        </TouchableOpacity>
      </View>
      {sessions.slice(0, 5).map((sess) => (
        <TouchableOpacity
          key={sess.id}
          style={styles.sessionRow}
          onPress={() => navigation.navigate('Chat', { sessionId: sess.id, agentId: sess.agentId })}
        >
          <View style={styles.sessionIcon}>
            <Text style={styles.sessionIconText}>💬</Text>
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionAgent}>{sess.agentName}</Text>
            <Text style={styles.sessionMeta}>
              {sess.messageCount} messages · {(sess.tokensUsed / 1000).toFixed(1)}K tokens
            </Text>
          </View>
          <Text style={styles.sessionTime}>
            {new Date(sess.startedAt).toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      ))}
      {sessions.length === 0 && (
        <Text style={styles.emptyText}>No sessions yet. Start chatting with an agent!</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  greeting: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  subGreeting: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  offlineBanner: {
    backgroundColor: Colors.danger + '22',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.danger + '55',
  },
  offlineText: { color: Colors.danger, fontSize: 13, fontWeight: '600' },
  healthCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  healthItem: { alignItems: 'center' },
  healthValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  healthLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  seeAll: { color: Colors.primary, fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  statSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  budgetContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  budgetPercent: { fontSize: 13, color: Colors.textPrimary, fontWeight: '700' },
  budgetBar: {
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetFill: { height: '100%', borderRadius: 4 },
  budgetSub: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionIconText: { fontSize: 18 },
  sessionInfo: { flex: 1 },
  sessionAgent: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  sessionMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sessionTime: { fontSize: 11, color: Colors.textMuted },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 20, fontSize: 14 },
});
