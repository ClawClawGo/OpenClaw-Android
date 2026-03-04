import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useStore } from '../store';
import { getUsageStats } from '../services/api';
import { saveBudgetLimit } from '../services/secureStorage';
import { AgentUsage } from '../types';

function BarRow({ item, maxTokens }: { item: AgentUsage; maxTokens: number }) {
  const pct = maxTokens > 0 ? (item.tokens / maxTokens) * 100 : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {item.agentName}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={styles.barValue}>{(item.tokens / 1000).toFixed(1)}K</Text>
      <Text style={styles.barCost}>${item.costUsd.toFixed(4)}</Text>
    </View>
  );
}

const PERIODS = [7, 30, 90];

export default function UsageScreen() {
  const { usageStats, budgetLimitUsd, setUsageStats, setBudgetLimit } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState(30);

  const load = useCallback(async (days: number) => {
    try {
      const stats = await getUsageStats(days);
      setUsageStats(stats);
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(period);
    setRefreshing(false);
  };

  const handleSetBudget = () => {
    Alert.prompt(
      'Set Budget Limit',
      'Enter monthly budget in USD (e.g. 10.00)',
      async (value) => {
        const num = parseFloat(value ?? '');
        if (!isNaN(num) && num > 0) {
          await saveBudgetLimit(num);
          setBudgetLimit(num);
        }
      },
      'plain-text',
      budgetLimitUsd?.toString() ?? ''
    );
  };

  const maxTokens = Math.max(...(usageStats?.byAgent.map((a) => a.tokens) ?? [1]));
  const budgetPct =
    usageStats && budgetLimitUsd
      ? Math.min((usageStats.estimatedCostUsd / budgetLimitUsd) * 100, 100)
      : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Tokens</Text>
          <Text style={styles.summaryValue}>
            {usageStats ? (usageStats.totalTokens / 1000).toFixed(1) + 'K' : '—'}
          </Text>
          <Text style={styles.summaryBreakdown}>
            {usageStats
              ? `↑ ${(usageStats.promptTokens / 1000).toFixed(1)}K prompt · ${(usageStats.completionTokens / 1000).toFixed(1)}K completion`
              : ''}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Est. Cost</Text>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            {usageStats ? `$${usageStats.estimatedCostUsd.toFixed(4)}` : '—'}
          </Text>
          <TouchableOpacity onPress={handleSetBudget}>
            <Text style={styles.setBudget}>
              {budgetLimitUsd ? `Limit: $${budgetLimitUsd.toFixed(2)} ✏️` : '+ Set Budget'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Budget Bar */}
      {budgetPct !== null && (
        <View style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetLabel}>Budget Usage</Text>
            <Text
              style={[
                styles.budgetPct,
                { color: budgetPct > 90 ? Colors.danger : budgetPct > 70 ? Colors.warning : Colors.success },
              ]}
            >
              {budgetPct.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.budgetTrack}>
            <View
              style={[
                styles.budgetFill,
                {
                  width: `${budgetPct}%` as any,
                  backgroundColor:
                    budgetPct > 90 ? Colors.danger : budgetPct > 70 ? Colors.warning : Colors.success,
                },
              ]}
            />
          </View>
          {budgetPct > 80 && (
            <Text style={styles.budgetWarning}>
              ⚠️ Approaching budget limit. Consider reviewing usage.
            </Text>
          )}
        </View>
      )}

      {/* Per-Agent Breakdown */}
      <Text style={styles.sectionTitle}>Token Usage by Agent</Text>
      {usageStats?.byAgent.length ? (
        usageStats.byAgent
          .sort((a, b) => b.tokens - a.tokens)
          .map((item) => <BarRow key={item.agentId} item={item} maxTokens={maxTokens} />)
      ) : (
        <Text style={styles.emptyText}>No usage data for this period.</Text>
      )}

      {/* Period Info */}
      {usageStats && (
        <Text style={styles.periodInfo}>
          Period: {new Date(usageStats.periodStart).toLocaleDateString()} –{' '}
          {new Date(usageStats.periodEnd).toLocaleDateString()}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  periodTextActive: { color: Colors.background },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  summaryBreakdown: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  setBudget: { fontSize: 12, color: Colors.primary, marginTop: 6 },
  budgetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  budgetPct: { fontSize: 13, fontWeight: '700' },
  budgetTrack: { height: 10, backgroundColor: Colors.surfaceAlt, borderRadius: 5, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 5 },
  budgetWarning: { fontSize: 12, color: Colors.warning, marginTop: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  barLabel: { width: 90, fontSize: 12, color: Colors.textPrimary },
  barTrack: { flex: 1, height: 8, backgroundColor: Colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  barValue: { width: 44, fontSize: 11, color: Colors.textSecondary, textAlign: 'right' },
  barCost: { width: 52, fontSize: 11, color: Colors.success, textAlign: 'right' },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 20, fontSize: 14 },
  periodInfo: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 16 },
});
