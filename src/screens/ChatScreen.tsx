import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useStore } from '../store';
import { getSessionMessages, sendMessage } from '../services/api';
import * as WS from '../services/websocket';
import { ChatMessage } from '../types';

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleWrapper, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
      {!isUser && (
        <View style={styles.avatarIcon}>
          <Text style={{ fontSize: 14 }}>🤖</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          msg.streaming ? styles.bubbleStreaming : {},
        ]}
      >
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : {}]}>
          {msg.content}
          {msg.streaming ? <Text style={styles.cursor}>▌</Text> : null}
        </Text>
        {msg.tokens && !msg.streaming ? (
          <Text style={styles.tokenCount}>{msg.tokens} tokens</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ChatScreen({ route }: any) {
  const { sessionId, agentId } = route.params as { sessionId: string; agentId: string };
  const {
    messages,
    streamingContent,
    setMessages,
    appendMessage,
    setStreamingContent,
    appendStreamingContent,
    finalizeStreaming,
    agents,
  } = useStore();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const agent = agents.find((a) => a.id === agentId);
  const sessionMessages = messages[sessionId] ?? [];

  // Build display list including streaming message
  const displayMessages: ChatMessage[] = streamingContent
    ? [
        ...sessionMessages,
        {
          id: 'streaming',
          role: 'assistant',
          content: streamingContent,
          timestamp: new Date().toISOString(),
          streaming: true,
        },
      ]
    : sessionMessages;

  useEffect(() => {
    (async () => {
      try {
        const msgs = await getSessionMessages(sessionId);
        setMessages(sessionId, msgs);
      } catch {
        // offline
      }
    })();

    // Listen for streaming chunks
    const unsub = WS.onNotification((notif) => {
      if (notif.method === 'chat.stream.chunk') {
        const params = notif.params as any;
        if (params?.sessionId === sessionId) {
          appendStreamingContent(params.chunk ?? '');
        }
      } else if (notif.method === 'chat.stream.end') {
        const params = notif.params as any;
        if (params?.sessionId === sessionId) {
          finalizeStreaming(sessionId);
        }
      }
    });

    return unsub;
  }, [sessionId]);

  useEffect(() => {
    if (displayMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [displayMessages.length, streamingContent]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    appendMessage(sessionId, userMsg);
    setStreamingContent('');

    try {
      await sendMessage(sessionId, text);
      // Response comes via WS notifications (streaming)
    } catch {
      appendMessage(sessionId, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Failed to send message. Check connection.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionId]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Agent Header */}
      <View style={styles.agentHeader}>
        <View style={styles.agentAvatar}>
          <Text style={{ fontSize: 20 }}>🤖</Text>
        </View>
        <View>
          <Text style={styles.agentName}>{agent?.name ?? 'Agent'}</Text>
          <Text style={styles.agentModel}>{agent?.model ?? ''}</Text>
        </View>
        {sending && <ActivityIndicator color={Colors.primary} style={{ marginLeft: 'auto' }} />}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={displayMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble msg={item} />}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Send a message to start the conversation.
          </Text>
        }
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message…"
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={4000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  agentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  agentName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  agentModel: { fontSize: 11, color: Colors.textSecondary },
  messageList: { padding: 16, paddingBottom: 8 },
  bubbleWrapper: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  avatarIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    padding: 12,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleStreaming: { borderColor: Colors.primary + '88' },
  bubbleText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  bubbleTextUser: { color: Colors.background },
  cursor: { color: Colors.primary },
  tokenCount: { fontSize: 10, color: Colors.textMuted, marginTop: 4, textAlign: 'right' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.border },
  sendIcon: { color: Colors.background, fontSize: 20, fontWeight: '700' },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 60, fontSize: 14 },
});
