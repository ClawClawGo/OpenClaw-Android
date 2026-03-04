import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import { Colors } from './src/theme/colors';
import { useStore } from './src/store';
import { getAuthToken, getRelayUrl, getBudgetLimit } from './src/services/secureStorage';
import * as WS from './src/services/websocket';

import OnboardingScreen from './src/screens/OnboardingScreen';
import PairScreen from './src/screens/PairScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AgentsScreen from './src/screens/AgentsScreen';
import ChatScreen from './src/screens/ChatScreen';
import UsageScreen from './src/screens/UsageScreen';
import HealthScreen from './src/screens/HealthScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TabBar from './src/components/TabBar';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.border,
    primary: Colors.primary,
    notification: Colors.danger,
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: Colors.surface },
  headerTintColor: Colors.textPrimary,
  headerTitleStyle: { fontWeight: '700' as const },
  headerShadowVisible: false,
};

function MainTabs({ navigation }: any) {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={screenOptions}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'OpenClaw' }} />
      <Tab.Screen name="Agents" component={AgentsScreen} options={{ title: 'Agents' }} />
      <Tab.Screen name="Usage" component={UsageScreen} options={{ title: 'Usage & Cost' }} />
      <Tab.Screen name="Health" component={HealthScreen} options={{ title: 'Gateway Health' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

const linking = {
  prefixes: ['openclaw://', 'https://openclaw.io'],
  config: {
    screens: {
      Onboarding: 'onboarding',
      Pair: 'pair',
    },
  },
};

function AppNavigator() {
  const { isAuthenticated } = useStore();

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen
          name="Pair"
          component={PairScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Chat', headerBackTitle: 'Back' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const {
    setAuthenticated,
    setRelayUrl,
    setConnectionStatus,
    setBudgetLimit,
    usageStats,
    budgetLimitUsd,
  } = useStore();

  useEffect(() => {
    // Bootstrap: load saved credentials
    (async () => {
      const token = await getAuthToken();
      const url = await getRelayUrl();
      const budget = await getBudgetLimit();

      if (budget) setBudgetLimit(budget);

      if (token && url) {
        setRelayUrl(url);
        WS.configure(url, token);
        setConnectionStatus('connecting');

        WS.onConnect(() => setConnectionStatus('online'));
        WS.onDisconnect(() => setConnectionStatus('offline'));

        WS.connect();
        setAuthenticated(true);
      }
    })();
  }, []);

  // Budget alert check
  useEffect(() => {
    if (usageStats && budgetLimitUsd) {
      const pct = (usageStats.estimatedCostUsd / budgetLimitUsd) * 100;
      if (pct >= 90) {
        console.warn(`[OpenClaw] Budget alert: ${pct.toFixed(1)}% of limit used`);
        // In production: trigger push notification via expo-notifications
      }
    }
  }, [usageStats, budgetLimitUsd]);

  return (
    <NavigationContainer theme={NavTheme} linking={linking}>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}
