# OpenClaw Relay — WebSocket JSON-RPC 2.0 Protocol Spec

## Mobile App Pairing (QR Code)

The recommended way to connect the OpenClaw Mobile app to your gateway is via **QR code pairing** from the OpenClaw web dashboard.

### Flow

```
OpenClaw Dashboard                    Mobile App
       │                                   │
       │  1. User clicks "Connect Mobile"  │
       │  2. Dashboard generates           │
       │     one-time pairing token        │
       │  3. Displays QR code             │
       │                                   │
       │         ◄── Scan QR ────────────  │
       │                                   │
       │  4. App parses deep link          │
       │  5. Saves relay URL + token       │
       │     to Keychain/Keystore          │
       │  6. Connects via WebSocket        │
       │  7. Authenticates                 │
```

### QR Code Payload Format

The QR code encodes a URL in one of two formats:

**Custom scheme (preferred):**
```
openclaw://pair?relay=wss%3A%2F%2Frelay.openclaw.io&token=oc_abc123xyz&name=My%20Gateway
```

**Universal link (fallback for web):**
```
https://openclaw.io/pair?relay=wss%3A%2F%2Frelay.openclaw.io&token=oc_abc123xyz&name=My%20Gateway
```

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `relay` | ✅ | URL-encoded WebSocket relay endpoint (e.g. `wss://relay.openclaw.io`) |
| `token` | ✅ | One-time or long-lived auth token for the relay |
| `name` | ❌ | Human-readable gateway name shown in the app |

### Security Recommendations

- Pairing tokens should be **short-lived** (10–15 minutes) if generated as one-time codes
- Alternatively, use a **device-scoped long-lived token** that can be revoked from the dashboard
- The QR code should only be shown to authenticated dashboard users
- Tokens are stored in device Keychain/Keystore immediately after scanning — never in plaintext

### Dashboard Implementation Guide

On the OpenClaw web dashboard, add a **"Connect Mobile App"** button in Settings that:

1. Calls your gateway API to generate a pairing token: `POST /api/devices/pair`
2. Returns `{ token: "oc_xxx", relay: "wss://relay.openclaw.io", expiresAt: "..." }`
3. Encodes the URL and renders it as a QR code (e.g. using `qrcode` npm package)
4. Shows a countdown timer until expiry
5. On successful connection, the mobile app calls `relay.authenticate` and the gateway registers the device

---


## Transport

- Protocol: `WebSocket` over TLS (`wss://`)
- Sub-protocol header: `openclaw-relay`
- Message format: UTF-8 JSON

---

## Authentication

On connect, the client **must** send an auth request before any other calls:

```json
{
  "jsonrpc": "2.0",
  "id": "auth",
  "method": "relay.authenticate",
  "params": { "token": "oc_<device_token>" }
}
```

**Success response:**
```json
{ "jsonrpc": "2.0", "id": "auth", "result": { "ok": true, "deviceId": "dev_abc123" } }
```

**Failure response:**
```json
{ "jsonrpc": "2.0", "id": "auth", "error": { "code": -32001, "message": "Unauthorized" } }
```

---

## Methods (Client → Relay → Gateway)

### `agents.list`
Returns all registered agents.

**Request:** `{ "params": {} }`

**Response result:**
```json
[
  {
    "id": "agent_001",
    "name": "Code Assistant",
    "model": "llama3:8b",
    "description": "Helps with code review and generation.",
    "status": "active",
    "tags": ["code", "review"],
    "lastUsed": "2025-03-01T10:00:00Z"
  }
]
```

---

### `agents.get`
**Params:** `{ "agentId": "agent_001" }`

---

### `sessions.list`
**Params:** `{ "agentId": "agent_001" }` *(optional)*

**Response result:**
```json
[
  {
    "id": "sess_xyz",
    "agentId": "agent_001",
    "agentName": "Code Assistant",
    "startedAt": "2025-03-01T10:00:00Z",
    "messageCount": 12,
    "tokensUsed": 4200
  }
]
```

---

### `sessions.create`
**Params:** `{ "agentId": "agent_001" }`

**Response result:** Session object (see above)

---

### `sessions.delete`
**Params:** `{ "sessionId": "sess_xyz" }`

---

### `sessions.messages`
**Params:** `{ "sessionId": "sess_xyz" }`

**Response result:**
```json
[
  {
    "id": "msg_001",
    "role": "user",
    "content": "Hello!",
    "timestamp": "2025-03-01T10:01:00Z",
    "tokens": 5
  }
]
```

---

### `chat.send`
**Params:** `{ "sessionId": "sess_xyz", "content": "Explain async/await" }`

Response is delivered via **streaming notifications** (see below).

---

### `usage.stats`
**Params:** `{ "periodDays": 30 }`

**Response result:**
```json
{
  "totalTokens": 125000,
  "promptTokens": 80000,
  "completionTokens": 45000,
  "estimatedCostUsd": 0.0375,
  "periodStart": "2025-02-01T00:00:00Z",
  "periodEnd": "2025-03-01T00:00:00Z",
  "byAgent": [
    { "agentId": "agent_001", "agentName": "Code Assistant", "tokens": 90000, "costUsd": 0.027, "requests": 45 }
  ]
}
```

---

### `gateway.health`
**Params:** `{}`

**Response result:**
```json
{
  "status": "online",
  "latencyMs": 42,
  "uptimePercent": 99.97,
  "version": "1.4.2",
  "servers": [
    {
      "id": "srv_001",
      "name": "Local Ollama",
      "url": "http://localhost:11434",
      "status": "online",
      "latencyMs": 12,
      "model": "llama3:8b"
    }
  ]
}
```

---

## Server → Client Notifications

### `chat.stream.chunk`
Sent for each token chunk during streaming response.

```json
{
  "jsonrpc": "2.0",
  "method": "chat.stream.chunk",
  "params": {
    "sessionId": "sess_xyz",
    "chunk": "async/await is a syntax"
  }
}
```

### `chat.stream.end`
Signals end of streaming response.

```json
{
  "jsonrpc": "2.0",
  "method": "chat.stream.end",
  "params": {
    "sessionId": "sess_xyz",
    "totalTokens": 312
  }
}
```

### `gateway.status.changed`
Pushed when gateway status changes.

```json
{
  "jsonrpc": "2.0",
  "method": "gateway.status.changed",
  "params": { "status": "degraded", "reason": "Server srv_002 unreachable" }
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| -32700 | Parse error |
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32001 | Unauthorized |
| -32002 | Session not found |
| -32003 | Agent not found |
| -32004 | Gateway unreachable |
| -32005 | Budget limit exceeded |
