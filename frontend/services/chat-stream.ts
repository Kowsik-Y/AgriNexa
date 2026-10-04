import { Platform } from 'react-native';
import { getSession } from '@/lib/auth-storage';

export type StreamChunk = {
  type: 'status' | 'token' | 'done' | 'error' | 'conversation_created' | 'user_message' | 'authenticated';
  stage?: string;
  text?: string;
  token?: string;
  full_text?: string;
  conversation_id?: string;
  message?: any;
  conversation?: any;
  source?: string;
  error?: string;
};

export type StreamCallback = (chunk: StreamChunk) => void;

export function getChatWsUrl(token?: string): string {
  let base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  // If in browser and URL is relative or uses localhost, match window host
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    if (base.includes('localhost') && window.location.hostname !== 'localhost') {
      base = base.replace('localhost', window.location.hostname);
    }
  }

  const wsProto = base.startsWith('https://') ? 'wss' : 'ws';
  const cleanBase = base.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const url = `${wsProto}://${cleanBase}/chat/ws`;

  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

/**
 * Connects to the AgriNexa chat WebSocket and streams tokens and status updates in real-time.
 */
export async function streamChatQuery({
  query,
  conversationId,
  language = 'English',
  onChunk,
  onError,
}: {
  query: string;
  conversationId?: string;
  language?: string;
  onChunk: StreamCallback;
  onError?: (err: any) => void;
}): Promise<{ cancel: () => void }> {
  const session = await getSession();
  const token = session?.token || '';

  const wsUrl = getChatWsUrl(token);
  let socket: WebSocket | null = null;
  let hasReceivedTokens = false;
  let isDone = false;

  try {
    socket = new WebSocket(wsUrl);
  } catch (err) {
    if (onError) onError(err);
    throw err;
  }

  const timeoutId = setTimeout(() => {
    if (!hasReceivedTokens && !isDone) {
      if (socket && socket.readyState === WebSocket.CONNECTING) {
        socket.close();
        if (onError) onError(new Error('WebSocket connection timed out'));
      }
    }
  }, 10000);

  socket.onopen = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(
      JSON.stringify({
        type: 'message',
        query,
        conversation_id: conversationId || undefined,
        language,
      })
    );
  };

  socket.onmessage = (event) => {
    try {
      const data: StreamChunk = JSON.parse(event.data);
      if (data.type === 'token') {
        hasReceivedTokens = true;
      }
      onChunk(data);

      if (data.type === 'done') {
        isDone = true;
        clearTimeout(timeoutId);
        try {
          socket?.close();
        } catch {}
      } else if (data.type === 'error') {
        clearTimeout(timeoutId);
        if (onError) onError(new Error(data.text || data.error || 'Chat streaming error'));
        try {
          socket?.close();
        } catch {}
      }
    } catch (e) {
      console.warn('Error parsing chat websocket message:', e);
    }
  };

  socket.onerror = (evt) => {
    clearTimeout(timeoutId);
    if (!hasReceivedTokens && !isDone && onError) {
      onError(evt);
    }
  };

  socket.onclose = () => {
    clearTimeout(timeoutId);
    isDone = true;
  };

  return {
    cancel: () => {
      clearTimeout(timeoutId);
      isDone = true;
      try {
        socket?.close();
      } catch {}
    },
  };
}
