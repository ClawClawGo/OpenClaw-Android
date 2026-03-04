export type GatewayStatus = 'online' | 'offline' | 'degraded' | 'connecting';

export interface Agent {
  id: string;
  name: string;
  model: string;
  description: string;
  status: 'active' | 'idle' | 'error';
  tags: string[];
  lastUsed?: string;
}

export interface Session {
  id: string;
  agentId: string;
  agentName: string;
  startedAt: string;
  messageCount: number;
  tokensUsed: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tokens?: number;
  streaming?: boolean;
}

export interface UsageStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  budgetLimitUsd?: number;
  periodStart: string;
  periodEnd: string;
  byAgent: AgentUsage[];
}

export interface AgentUsage {
  agentId: string;
  agentName: string;
  tokens: number;
  costUsd: number;
  requests: number;
}

export interface GatewayHealth {
  status: GatewayStatus;
  latencyMs: number;
  uptimePercent: number;
  version: string;
  servers: ServerInfo[];
}

export interface ServerInfo {
  id: string;
  name: string;
  url: string;
  status: GatewayStatus;
  latencyMs: number;
  model: string;
}

// JSON-RPC 2.0 types
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}
