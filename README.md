# OpenClaw Mobile

OpenClaw Mobile is an Expo/React Native companion app for monitoring and interacting with an OpenClaw AI Gateway. It lets you authenticate against a relay, browse agents, start chat sessions, watch live token usage and costs, and keep an eye on gateway health from Android, iOS, or the web.

## Quick Start

1) **Prerequisites**
- Node.js 18+ and npm
- Expo CLI (`npm i -g expo`), or Expo Go installed on your device
- Android emulator / iOS simulator, or a USB-connected device with debugging enabled

2) **Install dependencies**
```bash
npm install
```

3) **Run the app**
- `npm run android` — start Metro and launch on Android
- `npm run ios` — start Metro and launch on iOS
- `npm run web` — run in the browser

4) **Provide relay credentials**
- On first launch you’ll see the onboarding screen.
- Enter your **Cloud Relay URL** (e.g. `wss://relay.openclaw.io`) and **Auth Token** (`oc_...`).
- Credentials are stored securely via `expo-secure-store` (Keychain/Keystore) and reused on next launch.

## Features at a Glance
- **Onboarding** – collect and securely persist relay URL + auth token.
- **Dashboard** – connection status, 30-day usage, budget progress, and recent sessions.
- **Agents** – list available agents from the relay and start new sessions.
- **Chat** – JSON-RPC over WebSocket streaming (`chat.stream.chunk` / `chat.stream.end`) with per-session history.
- **Usage & Cost** – token and cost breakdowns, budget threshold visualization.
- **Gateway Health** – latency/uptime, server list, and gateway version.
- **Settings** – edit relay credentials, set a monthly budget limit, trigger reconnect, and clear stored tokens.

## Configuration Notes
- WebSocket subprotocol: `openclaw-relay`
- Auth handshake: `relay.authenticate` with your `oc_...` token
- Relay API shape: see `docs/relay-protocol.md` for the JSON-RPC 2.0 contract (agents, sessions, chat, usage, health).
- Budget alerts: set a USD limit in **Settings**; the app warns when usage exceeds 90% of the configured budget.

## Project Structure (high level)
- `App.tsx` — navigation shell, auth bootstrap, WebSocket wiring
- `src/screens/*` — feature screens (Dashboard, Agents, Chat, Usage, Health, Settings, Onboarding)
- `src/components/` — shared UI (tab bar, etc.)
- `src/services/api.ts` — typed JSON-RPC calls over WebSocket
- `src/services/websocket.ts` — connection lifecycle, reconnect logic, notification dispatch
- `src/services/secureStorage.ts` — Keychain/Keystore-backed credential storage
- `src/store/` — Zustand state (auth, agents, sessions, messages, usage, health, budget)
- `docs/relay-protocol.md` — relay protocol reference

## Development Tips
- Metro/Expo will hot reload; keep `npm run android|ios|web` running during development.
- If you change relay credentials, use **Settings → Save & Reconnect** to re-handshake and refresh state.
- Offline handling: the dashboard shows a warning when the relay is unreachable; pull-to-refresh triggers re-fetches after reconnecting.

## Testing & Quality
- The project currently has no automated test or lint scripts. For functional verification, exercise the main flows manually (onboarding, starting a chat session, viewing usage/health, updating settings).

## Troubleshooting
- **WebSocket not connected**: verify the relay URL uses `wss://` and the token is valid; try reconnecting from **Settings**.
- **Expo Go issues**: clear Metro cache (`expo start -c`) if you see stale bundles.
- **Slow reconnects**: the client backs off exponentially up to 10 attempts (`src/services/websocket.ts`); restart the app to reset the backoff.
