# 🦀 OpenClaw Mobile

> **The official mobile companion for the [OpenClaw AI Gateway](https://github.com/ClawClawGo).**
> Manage AI agents, chat in real-time, and track API token usage — securely from anywhere.

---

## Overview

OpenClaw Mobile is a **React Native + Expo** application that connects to your OpenClaw AI Gateway through a secure cloud relay. Whether you're at your desk or on the go, you have full visibility and control over your local AI infrastructure right from your phone.

```
┌─────────────────┐        WSS / JSON-RPC 2.0        ┌──────────────────┐
│  OpenClaw App   │ ◄──────────────────────────────► │  Cloud Relay     │
│  (iOS/Android)  │                                   │  (openclaw.io)   │
└─────────────────┘                                   └────────┬─────────┘
                                                               │
                                                    ┌──────────▼──────────┐
                                                    │  OpenClaw Gateway   │
                                                    │  (your local server)│
                                                    └──────────┬──────────┘
                                                               │
                                              ┌────────────────┼────────────────┐
                                              │                │                │
                                     ┌────────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
                                     │  Ollama       │ │  LM Studio  │ │  Custom LLM │
                                     └───────────────┘ └─────────────┘ └─────────────┘
```

---

## ✨ Features

### 📱 QR Code Pairing (New!)
- **Frictionless setup** — scan a QR code from your OpenClaw dashboard to pair instantly
- **Secure one-time tokens** — pairing codes expire after use for enhanced security
- **Deep linking support** — handles `openclaw://pair?relay=...&token=...` URLs
- **Manual fallback** — option to enter relay URL and token manually if QR scanning isn't available

### 🏠 Dashboard
- Live **gateway status badge** (online / degraded / offline)
- Quick-stats cards: **total tokens consumed** and **estimated cost**
- **Budget progress bar** with color-coded warnings (green → yellow → red)
- **Recent sessions** list with one-tap resume
- Pull-to-refresh for live data

### 🤖 Agent Manager
- Browse all registered AI agents with **status badges** (active / idle / error)
- View agent **model**, **description**, and **tags**
- See **last used** timestamp per agent
- One-tap **Start Chat** to create a new session instantly

### 💬 Real-time Chat Interface
- **Streaming responses** — tokens appear as they're generated, with a live blinking cursor
- **Token count** displayed per assistant message
- Full **message history** loaded from the gateway
- Keyboard-aware layout with multi-line input
- Graceful **offline error handling**

### 📊 Usage & Cost Tracker
- **Period selector**: 7 / 30 / 90 day views
- Summary cards: total tokens (prompt + completion breakdown) and estimated USD cost
- **Per-agent bar chart** showing relative token consumption
- **Budget limit** — set your monthly cap directly in the app
- **Budget alert** warning when usage exceeds 80% of limit
- Pull-to-refresh

### 💡 Gateway Health Monitor
- Overall gateway status with color-coded indicator
- Key metrics: **relay latency**, **uptime %**, **server count**
- **Per-server cards** showing individual status, latency, and model
- **Auto-refreshes every 30 seconds** in the background

### ⚙️ Settings
- Edit **relay URL** and **auth token** at any time
- Set or update **monthly budget limit**
- Toggle **budget alert notifications**
- **Save & Reconnect** — applies changes and re-establishes the WebSocket connection
- **Disconnect** — securely removes all stored credentials

---

## 🔒 Security Architecture

Authentication tokens are stored using **device-native secure storage**:

| Platform | Storage Mechanism |
|----------|------------------|
| iOS | Keychain Services |
| Android | Android Keystore |

Tokens are **never stored in plaintext** and are never transmitted outside of the encrypted WebSocket connection to your relay.

```
Device Keychain/Keystore
        │
        ▼ (token retrieved at app launch)
WebSocket Client ──── TLS (wss://) ────► Cloud Relay ──► OpenClaw Gateway
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo (TypeScript) |
| Navigation | React Navigation v7 (Stack + Bottom Tabs) |
| State Management | Zustand |
| Real-time | WebSocket JSON-RPC 2.0 |
| Secure Storage | `expo-secure-store` |
| Camera | `expo-camera` (QR code scanning) |
| Deep Linking | `expo-linking` |
| Styling | React Native StyleSheet (dark theme) |

---

## 📁 Project Structure

```
openclaw-mobile/
├── App.tsx                          # Root: navigation, bootstrap, budget alerts, deep linking
├── app.json                         # Expo config (URL schemes, camera permissions)
├── docs/
│   └── relay-protocol.md            # WebSocket JSON-RPC 2.0 protocol spec + QR pairing docs
└── src/
    ├── theme/
    │   └── colors.ts                # Dark theme color palette
    ├── types/
    │   └── index.ts                 # Shared TypeScript types
    ├── store/
    │   └── index.ts                 # Zustand global state store
    ├── services/
    │   ├── websocket.ts             # WS JSON-RPC client + reconnect logic
    │   ├── secureStorage.ts         # Keychain/Keystore wrapper
    │   └── api.ts                   # Gateway API methods
    ├── components/
    │   └── TabBar.tsx               # Custom bottom tab bar
    └── screens/
        ├── OnboardingScreen.tsx     # Auth: QR scan or manual relay URL + token entry
        ├── PairScreen.tsx           # QR code scanner with corner-bracket viewfinder
        ├── DashboardScreen.tsx      # Home: status, stats, sessions
        ├── AgentsScreen.tsx         # Agent list + start chat
        ├── ChatScreen.tsx           # Streaming chat interface
        ├── UsageScreen.tsx          # Token/cost analytics
        ├── HealthScreen.tsx         # Gateway health monitor
        └── SettingsScreen.tsx       # Config + credentials
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- An [OpenClaw AI Gateway](https://github.com/ClawClawGo) instance running locally
- A cloud relay endpoint (or run the relay locally for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/ClawClawGo/OpenClaw-Android.git
cd OpenClaw-Android

# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

### Running on Device / Emulator

```bash
# Android
npm run android

# iOS (requires macOS)
npm run ios

# Web (for development/testing)
npm run web
```

### First Launch — QR Code Pairing (Recommended)

1. Open your **OpenClaw Dashboard** in a web browser
2. Navigate to **Settings → Connect Mobile App**
3. A QR code will be displayed with pairing credentials
4. In the mobile app, tap **"Scan QR Code"**
5. Point your camera at the QR code — the app will connect automatically!

### First Launch — Manual Setup (Alternative)

1. Tap **"Enter relay URL & token manually"** to expand the manual entry form
2. Enter your **Cloud Relay URL** (e.g. `wss://relay.openclaw.io`)
3. Enter your **Auth Token** (generated from your OpenClaw Gateway)
4. Tap **Connect Securely** — your token is saved to Keychain/Keystore
5. You're in! The Dashboard will show your gateway status and recent activity

---

## 🔌 WebSocket JSON-RPC 2.0 Protocol

The app communicates with the OpenClaw Gateway via a **WebSocket JSON-RPC 2.0** protocol over the cloud relay. See the full spec in [`docs/relay-protocol.md`](docs/relay-protocol.md).

### Quick Reference

| Method | Description |
|--------|-------------|
| `relay.authenticate` | Authenticate with device token |
| `agents.list` | List all registered agents |
| `agents.get` | Get a specific agent |
| `sessions.list` | List sessions (optionally filtered by agent) |
| `sessions.create` | Create a new chat session |
| `sessions.delete` | Delete a session |
| `sessions.messages` | Get message history for a session |
| `chat.send` | Send a message (response via streaming notifications) |
| `usage.stats` | Get token usage and cost statistics |
| `gateway.health` | Get gateway and server health status |

### Streaming Notifications (Server → Client)

| Notification | Description |
|-------------|-------------|
| `chat.stream.chunk` | A token chunk from the LLM response |
| `chat.stream.end` | End of streaming response |
| `gateway.status.changed` | Gateway status change event |

### Reconnection Strategy

The WebSocket client uses **exponential backoff** reconnection:

```
Attempt 1: 1s delay
Attempt 2: 2s delay
Attempt 3: 4s delay
...
Attempt 10: 512s delay (max)
```

---

## 🗺️ Roadmap

- [x] **QR Code Pairing** — frictionless dashboard connection flow
- [ ] **Push Notifications** — alert when long-running agent tasks complete (`expo-notifications`)
- [ ] **Prompt Library** — save and replay favorite prompts per agent
- [ ] **Multi-Gateway Support** — switch between multiple OpenClaw instances
- [ ] **Audit Log Viewer** — browse recent API calls with timestamps and token counts
- [ ] **Biometric Auth** — Face ID / fingerprint to unlock the app
- [ ] **Dark/Light Theme Toggle** — user-selectable theme
- [ ] **Export Usage Reports** — CSV/PDF export of token usage data
- [ ] **Agent Configuration** — edit agent system prompts and parameters from the app

---

## 🤝 Who Is This For?

- **Developers** running instances of the OpenClaw AI Gateway
- **System operators** who need to monitor remote AI APIs
- **AI builders** who frequently test agent behaviors and conversational flows

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with 🦀 by the <a href="https://github.com/ClawClawGo">ClawClawGo</a> team
</p>
