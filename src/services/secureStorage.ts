import * as SecureStore from 'expo-secure-store';

const KEYS = {
  AUTH_TOKEN: 'openclaw_auth_token',
  RELAY_URL: 'openclaw_relay_url',
  BUDGET_LIMIT: 'openclaw_budget_limit',
};

export async function saveAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.AUTH_TOKEN, token);
}

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.AUTH_TOKEN);
}

export async function deleteAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.AUTH_TOKEN);
}

export async function saveRelayUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.RELAY_URL, url);
}

export async function getRelayUrl(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.RELAY_URL);
}

export async function saveBudgetLimit(limitUsd: number): Promise<void> {
  await SecureStore.setItemAsync(KEYS.BUDGET_LIMIT, String(limitUsd));
}

export async function getBudgetLimit(): Promise<number | null> {
  const val = await SecureStore.getItemAsync(KEYS.BUDGET_LIMIT);
  return val ? parseFloat(val) : null;
}
