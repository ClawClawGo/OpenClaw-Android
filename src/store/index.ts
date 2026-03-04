import { create } from 'zustand';
import { Agent, Session, ChatMessage, UsageStats, GatewayHealth, GatewayStatus } from '../types';

interface AppState {
  // Connection
  connectionStatus: GatewayStatus;
  setConnectionStatus: (status: GatewayStatus) => void;

  // Auth
  isAuthenticated: boolean;
  relayUrl: string;
  setAuthenticated: (value: boolean) => void;
  setRelayUrl: (url: string) => void;

  // Agents
  agents: Agent[];
  selectedAgentId: string | null;
  setAgents: (agents: Agent[]) => void;
  setSelectedAgent: (id: string | null) => void;

  // Sessions
  sessions: Session[];
  activeSessionId: string | null;
  setSessions: (sessions: Session[]) => void;
  setActiveSession: (id: string | null) => void;
  addSession: (session: Session) => void;
  removeSession: (id: string) => void;

  // Chat
  messages: Record<string, ChatMessage[]>;
  streamingContent: string;
  setMessages: (sessionId: string, messages: ChatMessage[]) => void;
  appendMessage: (sessionId: string, message: ChatMessage) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  finalizeStreaming: (sessionId: string) => void;

  // Usage
  usageStats: UsageStats | null;
  budgetLimitUsd: number | null;
  setUsageStats: (stats: UsageStats) => void;
  setBudgetLimit: (limit: number | null) => void;

  // Health
  gatewayHealth: GatewayHealth | null;
  setGatewayHealth: (health: GatewayHealth) => void;
}

export const useStore = create<AppState>((set, get) => ({
  connectionStatus: 'offline',
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  isAuthenticated: false,
  relayUrl: '',
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setRelayUrl: (url) => set({ relayUrl: url }),

  agents: [],
  selectedAgentId: null,
  setAgents: (agents) => set({ agents }),
  setSelectedAgent: (id) => set({ selectedAgentId: id }),

  sessions: [],
  activeSessionId: null,
  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
  removeSession: (id) =>
    set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== id) })),

  messages: {},
  streamingContent: '',
  setMessages: (sessionId, messages) =>
    set((s) => ({ messages: { ...s.messages, [sessionId]: messages } })),
  appendMessage: (sessionId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: [...(s.messages[sessionId] ?? []), message],
      },
    })),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),
  finalizeStreaming: (sessionId) => {
    const { streamingContent, messages } = get();
    if (!streamingContent) return;
    const msg: ChatMessage = {
      id: `${Date.now()}`,
      role: 'assistant',
      content: streamingContent,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({
      streamingContent: '',
      messages: {
        ...s.messages,
        [sessionId]: [...(s.messages[sessionId] ?? []), msg],
      },
    }));
  },

  usageStats: null,
  budgetLimitUsd: null,
  setUsageStats: (stats) => set({ usageStats: stats }),
  setBudgetLimit: (limit) => set({ budgetLimitUsd: limit }),

  gatewayHealth: null,
  setGatewayHealth: (health) => set({ gatewayHealth: health }),
}));
