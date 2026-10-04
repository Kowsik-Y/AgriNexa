import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'expo-router';

import { useApi } from '@/hooks/use-api';
import { getSession } from '@/lib/auth-storage';

export type ConversationSummary = {
  conversation_id: string;
  title: string;
  last_message_preview: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  language: string;
  source: string;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
  retryQuery?: string;
  statusText?: string;
};


export type ConversationRow =
  | { type: 'header'; key: string; label: string; count: number }
  | { type: 'conversation'; key: string; conversation: ConversationSummary };

type CachePayload = {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messagePages: Record<string, ChatMessage[]>;
  totals: Record<string, number>;
  cursors: Record<string, string | null>;
};

const PAGE_SIZE = 20;
const MESSAGE_PAGE_SIZE = 30;

type AssistantContextType = {
  conversations: ConversationSummary[];
  conversationTotal: number;
  loadingConversations: boolean;
  hasMoreConversations: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  loadConversations: (reset: boolean, q?: string) => Promise<void>;

  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  messagePages: Record<string, ChatMessage[]>;
  setMessagePages: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>>;
  messageTotals: Record<string, number>;
  setMessageTotals: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  messageCursors: Record<string, string | null>;
  loadMessages: (conversationId: string, reset: boolean) => Promise<void>;
  loadingMessages: boolean;
  loadingMoreMessages: boolean;

  upsertConversationLocal: (payload: {
    conversationId: string;
    title?: string;
    lastMessagePreview?: string;
    createdAt?: string;
    updatedAt?: string;
  }) => void;
  sortConversationsByRecency: (items: ConversationSummary[]) => ConversationSummary[];

  deleteConversationId: string | null;
  setDeleteConversationId: (id: string | null) => void;
  confirmDeleteConversation: () => Promise<void>;

  renameConversationId: string | null;
  setRenameConversationId: (id: string | null) => void;
  renameText: string;
  setRenameText: (text: string) => void;
  saveRename: (id: string) => Promise<void>;

  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  groupedThreadRows: ConversationRow[];
  stickySectionIndices: number[];

  openConversation: (id: string) => void;
  startNewChat: () => void;
};

const AssistantContext = createContext<AssistantContextType | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    getConversations,
    getConversationMessages,
    renameConversation,
    deleteConversation,
    searchConversations,
  } = useApi();

  const loadingConversationsRef = useRef(false);
  const loadingMessagesRef = useRef(false);
  const loadingMoreMessagesRef = useRef(false);
  const previousSearchQueryRef = useRef('');

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
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [cacheKey, setCacheKey] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const sortConversationsByRecency = useCallback((items: ConversationSummary[]) => {
    return [...items].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, []);

  const upsertConversationLocal = useCallback(
    (payload: {
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
    },
    []
  );

  const persistCache = useCallback(
    async (payload: CachePayload) => {
      if (!cacheKey) return;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
    },
    [cacheKey]
  );

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

  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const messageCursorsRef = useRef(messageCursors);
  messageCursorsRef.current = messageCursors;

  const getConversationMessagesRef = useRef(getConversationMessages);
  getConversationMessagesRef.current = getConversationMessages;

  const getConversationsRef = useRef(getConversations);
  getConversationsRef.current = getConversations;

  const searchConversationsRef = useRef(searchConversations);
  searchConversationsRef.current = searchConversations;

  const loadConversations = useCallback(
    async (reset: boolean, q: string = '') => {
      if (loadingConversationsRef.current) return;
      loadingConversationsRef.current = true;
      setLoadingConversations(true);
      try {
        const nextSkip = reset ? 0 : conversationsRef.current.length;
        const response = q.trim()
          ? await searchConversationsRef.current(q.trim(), 40)
          : await getConversationsRef.current(nextSkip, PAGE_SIZE);

        if (response) {
          if (q.trim()) {
            setConversations(sortConversationsByRecency(response.conversations || []));
            setConversationTotal((response.conversations || []).length);
          } else {
            const next = reset
              ? response.conversations || []
              : [...conversationsRef.current, ...(response.conversations || [])];
            setConversations(sortConversationsByRecency(next));
            setConversationTotal(response.total || next.length);
          }
        }
      } finally {
        loadingConversationsRef.current = false;
        setLoadingConversations(false);
      }
    },
    [sortConversationsByRecency]
  );

  const loadMessages = useCallback(
    async (conversationId: string, reset: boolean) => {
      if (!conversationId) return;
      if (reset) {
        if (loadingMessagesRef.current) return;
        loadingMessagesRef.current = true;
        setLoadingMessages(true);
        try {
          const response = await getConversationMessagesRef.current(conversationId, 0, MESSAGE_PAGE_SIZE);
          if (response) {
            setMessagePages((prev) => ({ ...prev, [conversationId]: response.messages || [] }));
            setMessageTotals((prev) => ({ ...prev, [conversationId]: response.total || 0 }));
            setMessageCursors((prev) => ({ ...prev, [conversationId]: response.next_cursor || null }));
          }
        } finally {
          loadingMessagesRef.current = false;
          setLoadingMessages(false);
        }
        return;
      }

      if (loadingMoreMessagesRef.current) return;
      loadingMoreMessagesRef.current = true;
      setLoadingMoreMessages(true);
      try {
        const currentCursor = messageCursorsRef.current[conversationId];
        const response = await getConversationMessagesRef.current(
          conversationId,
          0,
          MESSAGE_PAGE_SIZE,
          currentCursor || undefined
        );
        if (response) {
          setMessagePages((prev) => ({
            ...prev,
            [conversationId]: [...(response.messages || []), ...(prev[conversationId] || [])],
          }));
          setMessageTotals((prev) => ({ ...prev, [conversationId]: response.total || 0 }));
          setMessageCursors((prev) => ({ ...prev, [conversationId]: response.next_cursor || null }));
        }
      } finally {
        loadingMoreMessagesRef.current = false;
        setLoadingMoreMessages(false);
      }
    },
    []
  );

  useEffect(() => {
    hydrateCache();
  }, [hydrateCache]);

  useEffect(() => {
    if (!hydrated) return;
    loadConversations(true);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !cacheKey) return;
    persistCache({
      conversations,
      activeConversationId,
      messagePages,
      totals: messageTotals,
      cursors: messageCursors,
    });
  }, [
    activeConversationId,
    cacheKey,
    conversations,
    hydrated,
    messagePages,
    messageTotals,
    messageCursors,
    persistCache,
  ]);

  useEffect(() => {
    const previous = previousSearchQueryRef.current.trim();
    const current = searchQuery.trim();
    if (previous.length > 0 && current.length === 0) {
      loadConversations(true, '');
    }
    previousSearchQueryRef.current = searchQuery;
  }, [loadConversations, searchQuery]);

  const confirmDeleteConversation = async () => {
    if (!deleteConversationId) return;
    const conversationId = deleteConversationId;
    const res = await deleteConversation(conversationId);
    if (!res) return;

    const filtered = conversations.filter((c) => c.conversation_id !== conversationId);
    setConversations(sortConversationsByRecency(filtered));
    setConversationTotal((prev) => Math.max(0, prev - 1));
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
      setActiveConversationId(null);
      router.replace('/assistant' as any);
    }
    setDeleteConversationId(null);
  };

  const saveRename = async (conversationId: string) => {
    const title = renameText.trim();
    if (!title) return;
    const ok = await renameConversation(conversationId, title);
    if (!ok) return;
    setConversations((prev) =>
      sortConversationsByRecency(
        prev.map((c) =>
          c.conversation_id === conversationId
            ? { ...c, title, updated_at: new Date().toISOString() }
            : c
        )
      )
    );
    setRenameConversationId(null);
    setRenameText('');
  };

  const openConversation = (id: string) => {
    setActiveConversationId(id);
    setMobileSidebarOpen(false);
    router.push(`/assistant/${id}` as any);
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMobileSidebarOpen(false);
    router.push('/assistant' as any);
  };

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

    const rows: ConversationRow[] = [];

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
      rows.push({
        type: 'header',
        key: 'header_yesterday',
        label: 'Yesterday',
        count: yesterday.length,
      });
      yesterday.forEach((conversation) => {
        rows.push({
          type: 'conversation',
          key: `yesterday_${conversation.conversation_id}`,
          conversation,
        });
      });
    }

    if (last7Days.length > 0) {
      rows.push({
        type: 'header',
        key: 'header_last7days',
        label: 'Last 7 Days',
        count: last7Days.length,
      });
      last7Days.forEach((conversation) => {
        rows.push({
          type: 'conversation',
          key: `last7days_${conversation.conversation_id}`,
          conversation,
        });
      });
    }

    if (earlier.length > 0) {
      rows.push({
        type: 'header',
        key: 'header_earlier',
        label: 'Earlier',
        count: earlier.length,
      });
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
    () =>
      groupedThreadRows
        .map((row, index) => (row.type === 'header' ? index : -1))
        .filter((index) => index >= 0),
    [groupedThreadRows]
  );

  const value = {
    conversations,
    conversationTotal,
    loadingConversations,
    hasMoreConversations,
    searchQuery,
    setSearchQuery,
    loadConversations,
    activeConversationId,
    setActiveConversationId,
    messagePages,
    setMessagePages,
    messageTotals,
    setMessageTotals,
    messageCursors,
    loadMessages,
    loadingMessages,
    loadingMoreMessages,
    upsertConversationLocal,
    sortConversationsByRecency,
    deleteConversationId,
    setDeleteConversationId,
    confirmDeleteConversation,
    renameConversationId,
    setRenameConversationId,
    renameText,
    setRenameText,
    saveRename,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    groupedThreadRows,
    stickySectionIndices,
    openConversation,
    startNewChat,
  };

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistantContext() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistantContext must be used within an AssistantProvider');
  }
  return context;
}
