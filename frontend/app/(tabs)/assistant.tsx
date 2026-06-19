
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import {
  AlertCircle,
  MessageSquare,
  Mic,
  Send,
  X,
} from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/Dialog';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '@/context/AppProvider';
import { getSession } from '@/lib/auth-storage';
import { ConversationSidebarContent } from '@/components/assistant/ConversationSidebarContent';
import { MessageItem } from '@/components/assistant/MessageItem';

type ConversationSummary = {
  conversation_id: string;
  title: string;
  last_message_preview: string;
  created_at: string;
  updated_at: string;
};

type ChatMessage = {
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  language: string;
  source: string;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
  retryQuery?: string;
};

type CachePayload = {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messagePages: Record<string, ChatMessage[]>;
  totals: Record<string, number>;
  cursors: Record<string, string | null>;
};

const PAGE_SIZE = 20;
const MESSAGE_PAGE_SIZE = 30;

export default function AssistantScreen() {
  const { colors } = useTheme();
  const {
    voiceQuery,
    sendChatMessage,
    createConversation,
    getConversations,
    getConversationMessages,
    renameConversation,
    deleteConversation,
    searchConversations,
    loading,
    error,
  } = useApi();
  const { responseLanguage } = useAppContext();
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 960;
  const isNarrowScreen = width < 430;
  const scrollRef = useRef<FlatList<ChatMessage>>(null);
  const loadingConversationsRef = useRef(false);
  const loadingMessagesRef = useRef(false);
  const loadingMoreMessagesRef = useRef(false);
  const lastLoadedConversationRef = useRef<string | null>(null);
  const previousSearchQueryRef = useRef('');
  const loadMessagesRef = useRef<(conversationId: string, reset: boolean) => Promise<void>>(async () => { });

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messagePages, setMessagePages] = useState<Record<string, ChatMessage[]>>({});
  const [messageTotals, setMessageTotals] = useState<Record<string, number>>({});
  const [messageCursors, setMessageCursors] = useState<Record<string, string | null>>({});
  const [conversationTotal, setConversationTotal] = useState(0);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [renameConversationId, setRenameConversationId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [cacheKey, setCacheKey] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [text, setText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileDrawerMounted, setMobileDrawerMounted] = useState(false);
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);
  const sendTextQueryRef = useRef<(msg: string) => Promise<void>>(async () => { });
  const drawerTranslateX = useRef(new Animated.Value(-Math.min(380, Math.round(width * 0.86)))).current;

  const activeMessages = useMemo(() => {
    if (!activeConversationId) return [];
    return messagePages[activeConversationId] || [];
  }, [activeConversationId, messagePages]);

  const activeTotal = activeConversationId ? (messageTotals[activeConversationId] || 0) : 0;
  const hasMoreMessages = activeConversationId ? Boolean(messageCursors[activeConversationId]) : false;
  const hasMoreConversations = conversations.length < conversationTotal;

  const groupedThreadRows = useMemo(() => {
    const today: ConversationSummary[] = [];
    const yesterday: ConversationSummary[] = [];
    const last7Days: ConversationSummary[] = [];
    const earlier: ConversationSummary[] = [];

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startToday.getDate() - 1);
    const startLast7Days = new Date(startToday);
    startLast7Days.setDate(startToday.getDate() - 7);

    conversations.forEach((conversation) => {
      const updatedAt = new Date(conversation.updated_at);
      if (Number.isNaN(updatedAt.getTime())) {
        earlier.push(conversation);
        return;
      }

      if (updatedAt >= startToday) {
        today.push(conversation);
      } else if (updatedAt >= startYesterday) {
        yesterday.push(conversation);
      } else if (updatedAt >= startLast7Days) {
        last7Days.push(conversation);
      } else {
        earlier.push(conversation);
      }
    });

    const rows: Array<
      | { type: 'header'; key: string; label: string; count: number }
      | { type: 'conversation'; key: string; conversation: ConversationSummary }
    > = [];

    if (today.length > 0) {
      rows.push({ type: 'header', key: 'header_today', label: 'Today', count: today.length });
      today.forEach((conversation) => {
        rows.push({
          type: 'conversation',
          key: `today_${conversation.conversation_id}`,
          conversation,
        });
      });
    }

    if (yesterday.length > 0) {
      rows.push({ type: 'header', key: 'header_yesterday', label: 'Yesterday', count: yesterday.length });
      yesterday.forEach((conversation) => {
        rows.push({
          type: 'conversation',
          key: `yesterday_${conversation.conversation_id}`,
          conversation,
        });
      });
    }

    if (last7Days.length > 0) {
      rows.push({ type: 'header', key: 'header_last7days', label: 'Last 7 Days', count: last7Days.length });
      last7Days.forEach((conversation) => {
        rows.push({
          type: 'conversation',
          key: `last7days_${conversation.conversation_id}`,
          conversation,
        });
      });
    }

    if (earlier.length > 0) {
      rows.push({ type: 'header', key: 'header_earlier', label: 'Earlier', count: earlier.length });
      earlier.forEach((conversation) => {
        rows.push({
          type: 'conversation',
          key: `earlier_${conversation.conversation_id}`,
          conversation,
        });
      });
    }

    return rows;
  }, [conversations]);

  const stickySectionIndices = useMemo(
    () => groupedThreadRows
      .map((row, index) => (row.type === 'header' ? index : -1))
      .filter((index) => index >= 0),
    [groupedThreadRows]
  );

  const upsertConversationLocal = useCallback((payload: {
    conversationId: string;
    title?: string;
    lastMessagePreview?: string;
    createdAt?: string;
    updatedAt?: string;
  }) => {
    const now = payload.updatedAt || new Date().toISOString();
    let added = false;

    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.conversation_id === payload.conversationId);
      if (idx === -1) {
        added = true;
        return [
          {
            conversation_id: payload.conversationId,
            title: payload.title || 'New chat',
            last_message_preview: payload.lastMessagePreview || '',
            created_at: payload.createdAt || now,
            updated_at: now,
          },
          ...prev,
        ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      }

      return prev
        .map((c) =>
          c.conversation_id === payload.conversationId
            ? {
              ...c,
              title: payload.title || c.title,
              last_message_preview: payload.lastMessagePreview ?? c.last_message_preview,
              updated_at: now,
            }
            : c
        )
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    });

    if (added) {
      setConversationTotal((prev) => prev + 1);
    }
  }, []);

  const sortConversationsByRecency = useCallback((items: ConversationSummary[]) => {
    return [...items].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, []);

  const summarizeTitle = (raw: string) => {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (!cleaned) return 'New chat';
    const firstSentence = cleaned.split(/[.!?]/)[0].trim();
    const words = firstSentence.split(' ').filter(Boolean);
    const short = words.slice(0, 7).join(' ').slice(0, 48).trim();
    if (!short) return 'New chat';
    return words.length > 7 ? `${short}...` : short;
  };

  const persistCache = useCallback(async (payload: CachePayload) => {
    if (!cacheKey) return;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
  }, [cacheKey]);

  const hydrateCache = useCallback(async () => {
    const session = await getSession();
    const key = `assistant_chat_cache_${session?.id || 'guest'}`;
    setCacheKey(key);
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CachePayload;
        setConversations(parsed.conversations || []);
        setActiveConversationId(parsed.activeConversationId || null);
        setMessagePages(parsed.messagePages || {});
        setMessageTotals(parsed.totals || {});
        setMessageCursors(parsed.cursors || {});
      } catch {
        await AsyncStorage.removeItem(key);
      }
    }
    setHydrated(true);
  }, []);

  const loadConversations = useCallback(async (reset: boolean, q: string = '') => {
    if (loadingConversationsRef.current) return;
    loadingConversationsRef.current = true;
    setLoadingConversations(true);
    const nextSkip = reset ? 0 : conversations.length;
    const response = q.trim()
      ? await searchConversations(q.trim(), 40)
      : await getConversations(nextSkip, PAGE_SIZE);

    if (response) {
      if (q.trim()) {
        setConversations(sortConversationsByRecency(response.conversations || []));
        setConversationTotal((response.conversations || []).length);
      } else {
        const next = reset
          ? (response.conversations || [])
          : [...conversations, ...(response.conversations || [])];
        setConversations(sortConversationsByRecency(next));
        setConversationTotal(response.total || next.length);
      }
    }
    loadingConversationsRef.current = false;
    setLoadingConversations(false);
  }, [conversations, getConversations, searchConversations, sortConversationsByRecency]);

  const loadMessages = useCallback(async (conversationId: string, reset: boolean) => {
    if (reset) {
      if (loadingMessagesRef.current) return;
      loadingMessagesRef.current = true;
      setLoadingMessages(true);
      const response = await getConversationMessages(conversationId, 0, MESSAGE_PAGE_SIZE);
      if (response) {
        setMessagePages((prev) => ({ ...prev, [conversationId]: response.messages || [] }));
        setMessageTotals((prev) => ({ ...prev, [conversationId]: response.total || 0 }));
        setMessageCursors((prev) => ({ ...prev, [conversationId]: response.next_cursor || null }));
      }
      loadingMessagesRef.current = false;
      setLoadingMessages(false);
      return;
    }

    if (loadingMoreMessagesRef.current) return;
    loadingMoreMessagesRef.current = true;
    setLoadingMoreMessages(true);
    const currentCursor = messageCursors[conversationId];
    const response = await getConversationMessages(conversationId, 0, MESSAGE_PAGE_SIZE, currentCursor || undefined);
    if (response) {
      setMessagePages((prev) => ({
        ...prev,
        [conversationId]: [...(response.messages || []), ...(prev[conversationId] || [])],
      }));
      setMessageTotals((prev) => ({ ...prev, [conversationId]: response.total || 0 }));
      setMessageCursors((prev) => ({ ...prev, [conversationId]: response.next_cursor || null }));
    }
    loadingMoreMessagesRef.current = false;
    setLoadingMoreMessages(false);
  }, [getConversationMessages, messageCursors]);

  useEffect(() => {
    loadMessagesRef.current = loadMessages;
  }, [loadMessages]);

  useEffect(() => {
    hydrateCache();
  }, [hydrateCache]);

  useEffect(() => {
    if (!hydrated) return;
    loadConversations(true);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!activeConversationId) return;
    if (lastLoadedConversationRef.current === activeConversationId) return;
    lastLoadedConversationRef.current = activeConversationId;
    loadMessagesRef.current(activeConversationId, true);
  }, [activeConversationId, hydrated]);

  useEffect(() => {
    if (!hydrated || !cacheKey) return;
    persistCache({
      conversations,
      activeConversationId,
      messagePages,
      totals: messageTotals,
      cursors: messageCursors,
    });
  }, [activeConversationId, cacheKey, conversations, hydrated, messagePages, messageTotals, messageCursors, persistCache]);

  useEffect(() => {
    const previous = previousSearchQueryRef.current.trim();
    const current = searchQuery.trim();
    if (previous.length > 0 && current.length === 0) {
      loadConversations(true, '');
    }
    previousSearchQueryRef.current = searchQuery;
  }, [loadConversations, searchQuery]);

  useEffect(() => {
    if (isWideScreen) {
      setMobileSidebarOpen(false);
    }
  }, [isWideScreen]);

  useEffect(() => {
    const closedX = -Math.min(380, Math.round(width * 0.86));

    if (isWideScreen) {
      setMobileDrawerMounted(false);
      drawerTranslateX.setValue(closedX);
      return;
    }

    if (mobileSidebarOpen) {
      setMobileDrawerMounted(true);
      drawerTranslateX.setValue(closedX);
      Animated.timing(drawerTranslateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (mobileDrawerMounted) {
      Animated.timing(drawerTranslateX, {
        toValue: closedX,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setMobileDrawerMounted(false);
        }
      });
    }
  }, [drawerTranslateX, isWideScreen, mobileDrawerMounted, mobileSidebarOpen, width]);

  const sendTextQuery = async (msg: string) => {
    if (!msg || isSendingMessage) return;

    let targetConversationId = activeConversationId;
    if (!targetConversationId) {
      const created = await createConversation();
      targetConversationId = created?.conversation?.conversation_id || null;
      if (targetConversationId) {
        setActiveConversationId(targetConversationId);
        setMessagePages((prev) => ({ ...prev, [targetConversationId as string]: [] }));
        setMessageTotals((prev) => ({ ...prev, [targetConversationId as string]: 0 }));
        await loadConversations(true, searchQuery);
      }
    }

    const pendingUser: ChatMessage = {
      message_id: `local_user_${Date.now()}`,
      role: 'user',
      content: msg,
      source: 'text',
      language: responseLanguage,
      created_at: new Date().toISOString(),
      pending: true,
    };
    const pendingAssistantId = `local_assistant_${Date.now()}`;
    const pendingAssistant: ChatMessage = {
      message_id: pendingAssistantId,
      role: 'assistant',
      content: 'Thinking...',
      source: 'llm',
      language: responseLanguage,
      created_at: new Date().toISOString(),
      pending: true,
    };

    if (targetConversationId) {
      setMessagePages((prev) => ({
        ...prev,
        [targetConversationId]: [...(prev[targetConversationId] || []), pendingUser, pendingAssistant],
      }));
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 40);

    setIsSendingMessage(true);
    try {
      const res = await sendChatMessage({
        query: msg,
        language: responseLanguage,
        conversation_id: targetConversationId || undefined,
        use_rag: true,
      }, { skipLoading: true });
      if (res) {
        const newConversationId = res.conversation_id;
        const assistantMessage: ChatMessage = {
          message_id: res.message?.message_id || pendingAssistantId,
          role: 'assistant',
          content: res.message?.content || res.response || '',
          source: res.message?.source || res.source || 'llm',
          language: res.message?.language || responseLanguage,
          created_at: res.message?.created_at || new Date().toISOString(),
          pending: false,
        };

        const finalConversationId = targetConversationId || newConversationId;
        setActiveConversationId(newConversationId);

        if (finalConversationId) {
          const existingTitle = conversations.find((c) => c.conversation_id === finalConversationId)?.title || '';
          const shouldAutoSetTitle = !existingTitle || existingTitle.trim().toLowerCase() === 'new chat';

          setMessagePages((prev) => {
            const current = prev[finalConversationId] || [];
            const replaced = current.map((m) => {
              if (m.message_id === pendingUser.message_id) {
                return { ...m, pending: false };
              }
              if (m.message_id === pendingAssistantId) {
                return assistantMessage;
              }
              return m;
            });

            const hasPendingAssistant = current.some((m) => m.message_id === pendingAssistantId);
            const nextMessages = hasPendingAssistant
              ? replaced
              : [
                ...current,
                { ...pendingUser, pending: false },
                assistantMessage,
              ];

            return { ...prev, [finalConversationId]: nextMessages };
          });

          setMessageTotals((prev) => {
            const current = prev[finalConversationId] || 0;
            return { ...prev, [finalConversationId]: current + 2 };
          });

          upsertConversationLocal({
            conversationId: finalConversationId,
            title: shouldAutoSetTitle ? summarizeTitle(msg) : undefined,
            lastMessagePreview: assistantMessage.content,
            updatedAt: assistantMessage.created_at,
          });
        }
      } else if (targetConversationId) {
        setMessagePages((prev) => ({
          ...prev,
          [targetConversationId as string]: (prev[targetConversationId as string] || []).map((m) => {
            if (m.message_id === pendingUser.message_id) {
              return { ...m, pending: false };
            }
            if (m.message_id === pendingAssistantId) {
              return {
                ...m,
                content: 'Failed to send. Tap to retry.',
                pending: false,
                failed: true,
                retryQuery: msg,
              };
            }
            return m;
          }),
        }));
      }
    } finally {
      setIsSendingMessage(false);
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 40);
  };

  // ── Text send ──
  const handleSendText = async () => {
    const msg = text.trim();
    if (!msg || isSendingMessage) return;
    setText('');
    await sendTextQuery(msg);
  };

  useEffect(() => {
    sendTextQueryRef.current = sendTextQuery;
  }, [sendTextQuery]);

  const handleRetryMessage = useCallback(async (item: ChatMessage) => {
    const retryQuery = item.retryQuery?.trim();
    if (!retryQuery || isSendingMessage) return;
    await sendTextQueryRef.current(retryQuery);
  }, [isSendingMessage]);

  const renderMessageItem = useCallback(({ item }: { item: ChatMessage }) => {
    return <MessageItem item={item} onRetry={handleRetryMessage} />;
  }, [handleRetryMessage]);

  const messageKeyExtractor = useCallback((item: ChatMessage) => item.message_id, []);

  // ── Voice recording ──
  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(recording);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setIsRecording(false);
    try {
      const status = await recording.getStatusAsync();
      if (status.canRecord && status.durationMillis > 100) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
          const res = await voiceQuery(uri, {
            conversationId: activeConversationId || undefined,
            language: responseLanguage,
          });
          if (res) {
            const conversationId = res.conversation_id || activeConversationId;
            if (conversationId) {
              setActiveConversationId(conversationId);

              const transcript = (res.transcription || '').trim();
              const assistantReply = (res.response || '').trim();
              const nowIso = new Date().toISOString();

              const voiceMessages: ChatMessage[] = [];
              if (transcript) {
                voiceMessages.push({
                  message_id: `voice_user_${Date.now()}`,
                  role: 'user',
                  content: transcript,
                  source: 'voice',
                  language: responseLanguage,
                  created_at: nowIso,
                });
              }
              if (assistantReply) {
                voiceMessages.push({
                  message_id: `voice_assistant_${Date.now()}`,
                  role: 'assistant',
                  content: assistantReply,
                  source: 'voice',
                  language: responseLanguage,
                  created_at: nowIso,
                });
              }

              if (voiceMessages.length > 0) {
                const existingTitle = conversations.find((c) => c.conversation_id === conversationId)?.title || '';
                const shouldAutoSetTitle = !existingTitle || existingTitle.trim().toLowerCase() === 'new chat';

                setMessagePages((prev) => ({
                  ...prev,
                  [conversationId]: [...(prev[conversationId] || []), ...voiceMessages],
                }));
                setMessageTotals((prev) => ({
                  ...prev,
                  [conversationId]: (prev[conversationId] || 0) + voiceMessages.length,
                }));
                upsertConversationLocal({
                  conversationId,
                  title: shouldAutoSetTitle ? 'Voice chat' : undefined,
                  lastMessagePreview: assistantReply || transcript,
                  updatedAt: nowIso,
                });
              }
            }
          }
        }
      } else {
        await recording.stopAndUnloadAsync().catch(() => { });
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    } finally {
      setRecording(null);
    }
  }

  const handleCreateConversation = async () => {
    const res = await createConversation();
    const conversationId = res?.conversation?.conversation_id;
    if (conversationId) {
      setActiveConversationId(conversationId);
      setMessagePages((prev) => ({ ...prev, [conversationId]: [] }));
      setMessageTotals((prev) => ({ ...prev, [conversationId]: 0 }));
      await loadConversations(true, searchQuery);
      return;
    }
    setActiveConversationId(null);
    setText('');
  };

  const handleConversationPress = async (conversationId: string) => {
    if (activeConversationId === conversationId) return;
    lastLoadedConversationRef.current = conversationId;
    setActiveConversationId(conversationId);
    if (!isWideScreen) {
      setMobileSidebarOpen(false);
    }
    await loadMessages(conversationId, true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
  };

  const handleDeleteConversation = (conversationId: string) => {
    setDeleteConversationId(conversationId);
  };

  const confirmDeleteConversation = async () => {
    if (!deleteConversationId) return;
    const conversationId = deleteConversationId;
    const res = await deleteConversation(conversationId);
    if (!res) return;

    const filtered = conversations.filter((c) => c.conversation_id !== conversationId);
    setConversations(sortConversationsByRecency(filtered));
    setMessagePages((prev) => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
    setMessageTotals((prev) => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
    setMessageCursors((prev) => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
    if (activeConversationId === conversationId) {
      setActiveConversationId(filtered[0]?.conversation_id || null);
    }
    setDeleteConversationId(null);
  };

  const saveRename = async (conversationId: string) => {
    const title = renameText.trim();
    if (!title) return;
    const ok = await renameConversation(conversationId, title);
    if (!ok) return;
    setConversations((prev) => sortConversationsByRecency(prev.map((c) =>
      c.conversation_id === conversationId ? { ...c, title, updated_at: new Date().toISOString() } : c
    )));
    setRenameConversationId(null);
    setRenameText('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View pointerEvents="none" style={[styles.bgOrbTop, { backgroundColor: `${colors.primary}22` }]} />
      <View pointerEvents="none" style={[styles.bgOrbBottom, { backgroundColor: `${colors.warning}16` }]} />

      <View style={styles.header}>
        <Card style={[styles.heroCard, isNarrowScreen && styles.heroCardNarrow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleBlock}>
              <Typography.H2 style={[styles.title, { color: colors.foreground, borderBottomWidth: 0 }]}>Agri Assistant</Typography.H2>
              <Typography.Small style={{ color: colors.mutedForeground }} numberOfLines={1}>
                Smart farm support with persistent chat memory
              </Typography.Small>
            </View>
            <View style={styles.heroActions}>
              {!isWideScreen && (
                isNarrowScreen ? (
                  <Button variant="outline" size="icon" onPress={() => setMobileSidebarOpen(true)} style={styles.heroConversationsIconBtn}>
                    <MessageSquare size={16} color={colors.foreground} />
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onPress={() => setMobileSidebarOpen(true)} style={styles.heroConversationsBtn}>
                    <View style={styles.inlineBtnContent}>
                      <MessageSquare size={14} color={colors.foreground} />
                      <Typography.Small style={{ color: colors.foreground, fontWeight: '700' }} translate={false}>
                        Conversations
                      </Typography.Small>
                    </View>
                  </Button>
                )
              )}
              {!isNarrowScreen && (
                <Badge variant="secondary">
                  {activeTotal} msgs
                </Badge>
              )}
            </View>
          </View>

          {isNarrowScreen && (
            <Badge variant="secondary" style={styles.heroCornerChip}>
              {activeTotal}
            </Badge>
          )}
        </Card>
      </View>

      <View style={[styles.contentShell, isWideScreen && styles.contentShellWide]}>
        {isWideScreen && (
          <Card style={[styles.sidebarCard, { borderColor: colors.border }]}>
            <View style={[styles.sidebarTop, { backgroundColor: colors.card }]}>
              <Typography.H4 style={{ color: colors.foreground, borderBottomWidth: 0 }}>Conversations</Typography.H4>
              <Badge variant="outline">{conversationTotal} total</Badge>
            </View>
            <ConversationSidebarContent
              groupedThreadRows={groupedThreadRows}
              stickySectionIndices={stickySectionIndices}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSearchSubmit={() => loadConversations(true, searchQuery)}
              onCreateConversation={handleCreateConversation}
              hasMoreConversations={hasMoreConversations}
              loadingConversations={loadingConversations}
              onLoadMore={() => loadConversations(false)}
              activeConversationId={activeConversationId}
              renameConversationId={renameConversationId}
              renameText={renameText}
              onRenameTextChange={setRenameText}
              onSaveRename={saveRename}
              onRenameClose={() => setRenameConversationId(null)}
              onRenameStart={(conversationId, title) => {
                setRenameConversationId(conversationId);
                setRenameText(title);
              }}
              onConversationPress={handleConversationPress}
              onDeleteConversation={handleDeleteConversation}
              isDesktop
            />
          </Card>
        )}

        <View style={styles.chatPane}>
          {/* Chat messages (virtualized) */}
          <FlatList
            ref={scrollRef}
            style={styles.chatArea}
            contentContainerStyle={styles.chatContent}
            data={activeMessages}
            keyExtractor={messageKeyExtractor}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={(
              <>
                {activeConversationId && hasMoreMessages && (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => loadMessages(activeConversationId, false)}
                    loading={loadingMoreMessages}
                    style={styles.loadOlderBtn}
                  >
                    Load Older Messages
                  </Button>
                )}

                {loadingMessages && (
                  <View style={styles.loadingArea}>
                    <Spinner size={18} color={colors.tint} />
                  </View>
                )}
              </>
            )}
            ListEmptyComponent={
              !loading && !loadingMessages ? (
                <Card style={styles.emptyCard}>
                  <View style={styles.empty}>
                    <MessageSquare size={36} color={colors.mutedForeground} />
                    <Typography.P style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 10 }}>
                      Start a new agri conversation or open one from history
                    </Typography.P>
                    <View style={styles.suggestions}>
                      {['What\'s the weather today?', 'Any pest alerts?', 'Rice market price?'].map((s) => (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          onPress={() => {
                            setText(s);
                          }}
                          style={styles.suggestion}
                        >
                          {s}
                        </Button>
                      ))}
                    </View>
                  </View>
                </Card>
              ) : null
            }
            renderItem={renderMessageItem}
          />

          {/* Error bar */}
          {error && (
            <Card style={[styles.errorBar, { backgroundColor: colors.destructive + '10', borderColor: colors.destructive }]}>
              <AlertCircle size={14} color={colors.destructive} />
              <Typography.Small style={{ color: colors.destructive, flex: 1 }} translate={false}>{error}</Typography.Small>
            </Card>
          )}

          <View style={styles.inputBar}>
            <Card style={[styles.composerCard, { borderColor: colors.border }]}>
              <View style={styles.composerRow}>
                <Button
                  variant={isRecording ? 'destructive' : 'secondary'}
                  size="icon"
                  onLongPress={startRecording}
                  onPressOut={stopRecording}
                >
                  <Mic size={18} color={isRecording ? '#fff' : colors.mutedForeground} />
                </Button>

                <Input
                  containerStyle={styles.textInputWrap}
                  placeholder="Ask about weather, pests, irrigation, prices..."
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={handleSendText}
                  returnKeyType="send"
                  editable={!isSendingMessage}
                />

                <Button
                  onPress={handleSendText}
                  disabled={!text.trim() || isSendingMessage}
                  loading={isSendingMessage}
                  size="icon"
                >
                  {!isSendingMessage && <Send size={18} color={colors.primaryForeground} />}
                </Button>
              </View>
            </Card>
          </View>
        </View>
      </View>

      {!isWideScreen && (
        <Modal
          transparent
          visible={mobileDrawerMounted}
          animationType="none"
          onRequestClose={() => setMobileSidebarOpen(false)}
        >
          <View style={styles.mobileDrawerRoot}>
            <Pressable
              style={[styles.mobileDrawerBackdrop, { backgroundColor: '#00000066' }]}
              onPress={() => setMobileSidebarOpen(false)}
            />
            <Animated.View style={[styles.mobileDrawerShell, { transform: [{ translateX: drawerTranslateX }] }]}>
              <Card style={[styles.mobileDrawer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={[styles.mobileDrawerHeader, { borderBottomColor: colors.border }]}>
                  <Typography.H4 style={{ color: colors.foreground, borderBottomWidth: 0 }}>Conversations</Typography.H4>
                  <View style={styles.mobileDrawerHeaderActions}>
                    <Badge variant="outline">{conversationTotal}</Badge>
                    <Button variant="ghost" size="icon" onPress={() => setMobileSidebarOpen(false)}>
                      <X size={16} color={colors.mutedForeground} />
                    </Button>
                  </View>
                </View>

                <ConversationSidebarContent
                  groupedThreadRows={groupedThreadRows}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSearchSubmit={() => loadConversations(true, searchQuery)}
                  onCreateConversation={handleCreateConversation}
                  hasMoreConversations={hasMoreConversations}
                  loadingConversations={loadingConversations}
                  onLoadMore={() => loadConversations(false)}
                  activeConversationId={activeConversationId}
                  renameConversationId={renameConversationId}
                  renameText={renameText}
                  onRenameTextChange={setRenameText}
                  onSaveRename={saveRename}
                  onRenameClose={() => setRenameConversationId(null)}
                  onRenameStart={(conversationId, title) => {
                    setRenameConversationId(conversationId);
                    setRenameText(title);
                  }}
                  onConversationPress={handleConversationPress}
                  onDeleteConversation={handleDeleteConversation}
                />
              </Card>
            </Animated.View>
          </View>
        </Modal>
      )}

      <AlertDialog open={Boolean(deleteConversationId)} onOpenChange={(open) => !open && setDeleteConversationId(null)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete conversation</AlertDialogTitle>
          <AlertDialogDescription>
            This conversation will be removed from your history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter style={{ gap: 10 }}>
          <Button variant="outline" onPress={() => setDeleteConversationId(null)} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="destructive" onPress={confirmDeleteConversation} style={{ flex: 1 }}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialog>

      {/* Recording indicator */}
      {isRecording && (
        <View style={[styles.recordingBar, { backgroundColor: colors.destructive }]}>
          <View style={styles.recordingDot} />
          <Typography.Small style={{ color: '#fff', fontWeight: '600' }}>Listening... Release to send</Typography.Small>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bgOrbTop: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: -120,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  heroCard: { borderRadius: 18, borderWidth: 1, padding: 14 },
  heroCardNarrow: { paddingRight: 58 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  heroTitleBlock: { flex: 1, minWidth: 0 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroConversationsBtn: { alignSelf: 'flex-start' },
  heroConversationsIconBtn: { alignSelf: 'flex-start' },
  heroCornerChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  inlineBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontWeight: '800', fontSize: 24, letterSpacing: -0.5 },
  threadListVertical: { gap: 8, paddingBottom: 12 },
  threadScrollVertical: { flex: 1, marginTop: 10 },
  sectionHeader: {
    marginTop: 2,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    zIndex: 1,
  },
  desktopSectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.18)',
  },
  threadCard: {
    minWidth: 0,
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadMain: { flex: 1, gap: 2 },
  threadActions: { flexDirection: 'row', marginLeft: 6 },
  iconBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  renameInput: { borderWidth: 1, borderRadius: 8, fontSize: 12, paddingHorizontal: 6, height: 28 },
  moreThreadsBtn: {
    alignSelf: 'center',
    marginTop: 6,
  },

  contentShell: { flex: 1 },
  contentShellWide: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sidebarCard: {
    width: 320,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  sidebarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.18)',
  },
  sidebarNewChatBtn: {
    marginTop: 10,
    justifyContent: 'flex-start',
  },
  searchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  sidebarSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  sidebarSearchWrap: {
    flex: 1,
  },
  chatPane: { flex: 1 },

  chatArea: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  loadOlderBtn: {
    marginBottom: 12,
    alignSelf: 'center',
  },
  loadingArea: { alignItems: 'center', marginVertical: 12 },
  emptyCard: { borderRadius: 16, marginTop: 68 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, paddingHorizontal: 14 },
  suggestions: { marginTop: 20, gap: 8, width: '100%', paddingHorizontal: 10 },
  suggestion: { justifyContent: 'flex-start' },

  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },

  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
  },
  composerCard: { borderRadius: 18, borderWidth: 1, padding: 10 },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textInputWrap: {
    flex: 1,
  },

  mobileDrawerRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  mobileDrawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  mobileDrawerShell: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '86%',
    maxWidth: 380,
  },
  mobileDrawer: {
    position: 'absolute',
    inset: 0,
    borderWidth: 1,
    borderRadius: 0,
    padding: 12,
  },
  mobileDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  mobileDrawerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mobileDrawerScroll: {
    flex: 1,
    marginTop: 10,
  },

  recordingBar: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});
