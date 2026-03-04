import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

const TABS = [
  { key: 'Dashboard', label: 'Home', icon: '⬡' },
  { key: 'Agents', label: 'Agents', icon: '🤖' },
  { key: 'Usage', label: 'Usage', icon: '📊' },
  { key: 'Health', label: 'Health', icon: '💡' },
  { key: 'Settings', label: 'Settings', icon: '⚙️' },
];

export default function TabBar({ state, navigation }: any) {
  return (
    <View style={styles.container}>
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.key)}
          >
            <Text style={[styles.icon, focused && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
            {focused && <View style={styles.indicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', position: 'relative' },
  icon: { fontSize: 20, marginBottom: 2 },
  iconActive: {},
  label: { fontSize: 10, color: Colors.textMuted },
  labelActive: { color: Colors.primary, fontWeight: '700' },
  indicator: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});
