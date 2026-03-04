import * as WS from './websocket';
import { Agent, Session, UsageStats, GatewayHealth, ChatMessage } from '../types';

export async function listAgents(): Promise<Agent[]> {
  return WS.send<Agent[]>('agents.list');
}

export async function getAgent(agentId: string): Promise<Agent> {
  return WS.send<Agent>('agents.get', { agentId });
}

export async function listSessions(agentId?: string): Promise<Session[]> {
  return WS.send<Session[]>('sessions.list', agentId ? { agentId } : undefined);
}

export async function createSession(agentId: string): Promise<Session> {
  return WS.send<Session>('sessions.create', { agentId });
}

export async function deleteSession(sessionId: string): Promise<void> {
  return WS.send<void>('sessions.delete', { sessionId });
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  return WS.send<ChatMessage[]>('sessions.messages', { sessionId });
}

export async function sendMessage(
  sessionId: string,
  content: string
): Promise<ChatMessage> {
  return WS.send<ChatMessage>('chat.send', { sessionId, content });
}

export async function getUsageStats(
  periodDays: number = 30
): Promise<UsageStats> {
  return WS.send<UsageStats>('usage.stats', { periodDays });
}

export async function getGatewayHealth(): Promise<GatewayHealth> {
  return WS.send<GatewayHealth>('gateway.health');
}
