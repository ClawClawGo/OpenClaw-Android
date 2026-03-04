import { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from '../types';

type MessageHandler = (notification: JsonRpcNotification) => void;
type ConnectionHandler = () => void;

let _ws: WebSocket | null = null;
let _relayUrl = '';
let _authToken = '';
let _pendingRequests = new Map<string | number, { resolve: Function; reject: Function }>();
let _notificationHandlers: MessageHandler[] = [];
let _onConnectHandlers: ConnectionHandler[] = [];
let _onDisconnectHandlers: ConnectionHandler[] = [];
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY_MS = 1000;

export function configure(relayUrl: string, authToken: string) {
  _relayUrl = relayUrl;
  _authToken = authToken;
}

export function connect() {
  if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) {
    return;
  }
  if (!_relayUrl) return;

  _ws = new WebSocket(_relayUrl, ['openclaw-relay']);

  _ws.onopen = () => {
    _reconnectAttempts = 0;
    // Send auth handshake
    const authMsg: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 'auth',
      method: 'relay.authenticate',
      params: { token: _authToken },
    };
    _ws!.send(JSON.stringify(authMsg));
    _onConnectHandlers.forEach((h) => h());
  };

  _ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string);
      if ('id' in data && _pendingRequests.has(data.id)) {
        const { resolve, reject } = _pendingRequests.get(data.id)!;
        _pendingRequests.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      } else if (!('id' in data) || data.id === null) {
        // Notification
        _notificationHandlers.forEach((h) => h(data as JsonRpcNotification));
      }
    } catch {
      // ignore parse errors
    }
  };

  _ws.onclose = () => {
    _onDisconnectHandlers.forEach((h) => h());
    scheduleReconnect();
  };

  _ws.onerror = () => {
    _ws?.close();
  };
}

function scheduleReconnect() {
  if (_reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
  const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, _reconnectAttempts);
  _reconnectAttempts++;
  _reconnectTimer = setTimeout(() => connect(), delay);
}

export function disconnect() {
  if (_reconnectTimer) clearTimeout(_reconnectTimer);
  _reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // prevent auto-reconnect
  _ws?.close();
  _ws = null;
}

export function send<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket not connected'));
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };
    _pendingRequests.set(id, { resolve, reject });
    _ws.send(JSON.stringify(request));
    // Timeout after 30s
    setTimeout(() => {
      if (_pendingRequests.has(id)) {
        _pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }
    }, 30000);
  });
}

export function onNotification(handler: MessageHandler) {
  _notificationHandlers.push(handler);
  return () => {
    _notificationHandlers = _notificationHandlers.filter((h) => h !== handler);
  };
}

export function onConnect(handler: ConnectionHandler) {
  _onConnectHandlers.push(handler);
  return () => {
    _onConnectHandlers = _onConnectHandlers.filter((h) => h !== handler);
  };
}

export function onDisconnect(handler: ConnectionHandler) {
  _onDisconnectHandlers.push(handler);
  return () => {
    _onDisconnectHandlers = _onDisconnectHandlers.filter((h) => h !== handler);
  };
}

export function isConnected(): boolean {
  return _ws?.readyState === WebSocket.OPEN;
}
