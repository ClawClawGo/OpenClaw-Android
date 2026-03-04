import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useStore } from '../store';
import { listAgents, createSession } from '../services/api';
import { Agent } from '../types';

function AgentStatusBadge({ status }: { status: Agent['status'] }) {
  const color =
    status === 'active' ? Colors.success : status === 'idle' ? Colors.primary : Colors.danger;
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Text style={[styles.badgeText, { color }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

export default function AgentsScreen({ navigation }: any) {
  const { agents, setAgents, setSelectedAgent, addSession, setActiveSession } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listAgents();
      setAgents(data);
    } catch {
      // offline
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

  const handleStartChat = async (agent: Agent) => {
    setStarting(agent.id);
    try {
      const session = await createSession(agent.id);
      addSession(session);
      setSelectedAgent(agent.id);
      setActiveSession(session.id);
      navigation.navigate('Chat', { sessionId: session.id, agentId: agent.id });
    } catch {
      Alert.alert('Error', 'Could not start session. Check connection.');
    } finally {
      setStarting(null);
    }
  };

  const renderAgent = ({ item }: { item: Agent }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.agentIcon}>
          <Text style={styles.agentIconText}>🤖</Text>
        </View>
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{item.name}</Text>
          <Text style={styles.agentModel}>{item.model}</Text>
        </View>
        <AgentStatusBadge status={item.status} />
      </View>

      {item.description ? (
        <Text style={styles.agentDesc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.tagsRow}>
        {item.tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      {item.lastUsed && (
        <Text style={styles.lastUsed}>
          Last used: {new Date(item.lastUsed).toLocaleDateString()}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.chatButton, starting === item.id && styles.chatButtonDisabled]}
        onPress={() => handleStartChat(item)}
        disabled={starting === item.id}
      >
        <Text style={styles.chatButtonText}>
          {starting === item.id ? 'Starting…' : '💬 Start Chat'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={agents}
        keyExtractor={(item) => item.id}
        renderItem={renderAgent}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No agents found. Check your gateway connection.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  agentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  agentIconText: { fontSize: 22 },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  agentModel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  agentDesc: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: {
    backgroundColor: Colors.accent + '22',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  tagText: { fontSize: 11, color: Colors.accent },
  lastUsed: { fontSize: 11, color: Colors.textMuted, marginBottom: 12 },
  chatButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  chatButtonDisabled: { opacity: 0.5 },
  chatButtonText: { color: Colors.background, fontWeight: '700', fontSize: 14 },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
