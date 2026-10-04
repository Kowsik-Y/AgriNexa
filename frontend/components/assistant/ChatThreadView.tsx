import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from 'expo-audio';
import {
  ArrowLeft,
  ArrowUp,
  AudioLines,
  Bot,
  Bug,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CloudSun,
  Droplets,
  Info,
  Menu,
  Mic,
  Plus,
  Reply,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  TrendingUp,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/reusables/button';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { Badge } from '@/components/reusables/badge';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '@/context/AppProvider';
import { MessageItem } from '@/components/assistant/MessageItem';
import { ChatMessage, useAssistantContext } from '@/components/assistant/AssistantContext';
import { streamChatQuery, StreamChunk } from '@/services/chat-stream';

const SUGGESTIONS = [
  {
    icon: CloudSun,
    text: "What's the weather outlook for my crops this week?",
    title: 'Weather Outlook',
  },
  {
    icon: Bug,
    text: 'How can I prevent and treat pest attacks naturally?',
    title: 'Pest Remedy',
  },
  {
    icon: Droplets,
    text: 'What is the optimal irrigation schedule right now?',
    title: 'Irrigation Advice',
  },
  {
    icon: TrendingUp,
    text: 'What are current wholesale mandi market prices?',
    title: 'Market Prices',
  },
];

type Props = {
  conversationId: string | null;
};

export function ChatThreadView({ conversationId }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const rippleColor = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.12)';
  const ripplePrimary = 'rgba(16, 185, 129, 0.28)';
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 960;
  const { responseLanguage } = useAppContext();
  const { voiceQuery, sendChatMessage } = useApi();

  const {
    conversations,
    conversationTotal,
    messagePages,
    setMessagePages,
    setMessageTotals,
    messageCursors,
    loadMessages,
    loadingMessages,
    loadingMoreMessages,
    upsertConversationLocal,
    setMobileSidebarOpen,
    startNewChat,
    openConversation,
    setActiveConversationId,
  } = useAssistantContext();

  const scrollRef = useRef<FlatList<ChatMessage>>(null);
  const sendTextQueryRef = useRef<(msg: string) => Promise<void>>(async () => { });
  const [text, setText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [pendingThreadMessages, setPendingThreadMessages] = useState<ChatMessage[]>([]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const isAtBottomRef = useRef(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const prevConvIdRef = useRef<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow = (e: any) => {
      const h = e?.endCoordinates?.height || 0;
      if (Platform.OS === 'android') {
        try {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        } catch {}
      }
      setIsKeyboardVisible(true);
      setKeyboardHeight(h);
      if (isAtBottomRef.current) {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    const onHide = () => {
      if (Platform.OS === 'android') {
        try {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        } catch {}
      }
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Sync active id in context
  useEffect(() => {
    setActiveConversationId(conversationId);
  }, [conversationId, setActiveConversationId]);

  // Load messages only when conversationId actually changes
  useEffect(() => {
    if (conversationId) {
      if (prevConvIdRef.current !== conversationId) {
        prevConvIdRef.current = conversationId;
        setPendingThreadMessages([]);
        isAtBottomRef.current = true;
        loadMessages(conversationId, true);
      }
    } else {
      prevConvIdRef.current = null;
      if (!isSendingMessage) {
        setPendingThreadMessages([]);
      }
    }
  }, [conversationId, isSendingMessage, loadMessages]);

  const activeMessages = useMemo(() => {
    if (!conversationId) return pendingThreadMessages;
    return messagePages[conversationId] || [];
  }, [conversationId, messagePages, pendingThreadMessages]);

  const handleScroll = useCallback(
    (event: any) => {
      const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
      const distanceToBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const atBottom = distanceToBottom < 80;
      isAtBottomRef.current = atBottom;
      setShowScrollBottom(!atBottom && activeMessages.length > 3);
    },
    [activeMessages.length]
  );

  const handleContentSizeChange = useCallback(() => {
    if (isAtBottomRef.current) {
      scrollRef.current?.scrollToEnd({ animated: false });
    }
  }, []);

  const hasMoreMessages = conversationId ? Boolean(messageCursors[conversationId]) : false;

  const currentTitle = useMemo(() => {
    if (!conversationId) return 'New Chat';
    const found = conversations.find((c) => c.conversation_id === conversationId);
    return found?.title || 'Chat';
  }, [conversationId, conversations]);

  const summarizeTitle = (raw: string) => {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (!cleaned) return 'New chat';
    const firstSentence = cleaned.split(/[.!?]/)[0].trim();
    const words = firstSentence.split(' ').filter(Boolean);
    const short = words.slice(0, 7).join(' ').slice(0, 48).trim();
    if (!short) return 'New chat';
    return words.length > 7 ? `${short}...` : short;
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const handlePlusPress = () => {
    Alert.alert(
      'Agri Intelligence Shortcuts',
      'Choose an action to analyze with AI:',
      [
        {
          text: 'Crop Disease Scan',
          onPress: () => router.push('/scan'),
        },
        {
          text: 'Daily Health Check',
          onPress: () => router.push('/daily-check'),
        },
        {
          text: 'Weather Forecast',
          onPress: () => router.push('/weather-hourly'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const sendTextQuery = async (msg: string) => {
    if (!msg || isSendingMessage) return;

    const targetConversationId = conversationId;
    const isBrandNewChat = !targetConversationId;

    const pendingUser: ChatMessage = {
      message_id: `local_user_${Date.now()}`,
      role: 'user',
      content: msg,
      source: 'text',
      language: responseLanguage,
      created_at: new Date().toISOString(),
      pending: false,
    };

    const pendingAssistantId = `local_assistant_${Date.now()}`;
    const pendingAssistant: ChatMessage = {
      message_id: pendingAssistantId,
      role: 'assistant',
      content: '',
      source: 'agrinexa',
      language: responseLanguage,
      created_at: new Date().toISOString(),
      pending: true,
      statusText: 'Analyzing crop & field context...',
    };

    if (targetConversationId) {
      setMessagePages((prev) => ({
        ...prev,
        [targetConversationId]: [...(prev[targetConversationId] || []), pendingUser, pendingAssistant],
      }));
    } else {
      setPendingThreadMessages([pendingUser, pendingAssistant]);
    }

    isAtBottomRef.current = true;
    setShowScrollBottom(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);
    setIsSendingMessage(true);

    let streamedText = '';
    let activeConvId = targetConversationId || '';
    let didStreamTokens = false;

    const updateAssistantMsg = (patch: Partial<ChatMessage>, convId?: string) => {
      const cid = convId || activeConvId;
      if (cid) {
        setMessagePages((prev) => {
          const list = prev[cid] || [];
          return {
            ...prev,
            [cid]: list.map((m) => (m.message_id === pendingAssistantId ? { ...m, ...patch } : m)),
          };
        });
      }
      setPendingThreadMessages((prev) =>
        prev.map((m) => (m.message_id === pendingAssistantId ? { ...m, ...patch } : m))
      );
    };

    try {
      await streamChatQuery({
        query: msg,
        conversationId: targetConversationId || undefined,
        language: responseLanguage,
        onChunk: (chunk: StreamChunk) => {
          if (chunk.type === 'conversation_created' && chunk.conversation?.conversation_id) {
            activeConvId = chunk.conversation.conversation_id;
            upsertConversationLocal({
              conversationId: activeConvId,
              title: summarizeTitle(msg),
              lastMessagePreview: '...',
              updatedAt: new Date().toISOString(),
            });
            setMessagePages((prev) => ({
              ...prev,
              [activeConvId]: [pendingUser, { ...pendingAssistant, statusText: 'Analyzing crop & field context...' }],
            }));
            setPendingThreadMessages([
              pendingUser,
              { ...pendingAssistant, statusText: 'Analyzing crop & field context...' },
            ]);
          } else if (chunk.type === 'status') {
            updateAssistantMsg({
              statusText: chunk.text || 'Researching agronomy & farm data...',
            });
          } else if (chunk.type === 'token' && chunk.token) {
            didStreamTokens = true;
            streamedText += chunk.token;
            updateAssistantMsg({
              content: streamedText,
              pending: true,
              statusText: undefined,
            });
            if (isAtBottomRef.current) {
              scrollRef.current?.scrollToEnd({ animated: false });
            }
          } else if (chunk.type === 'done') {
            const finalConvId = chunk.conversation_id || activeConvId;
            const finalContent = chunk.full_text || streamedText;
            const finalMsgId = chunk.message?.message_id || pendingAssistantId;
            const finalSource = chunk.source || 'agrinexa';

            updateAssistantMsg(
              {
                content: finalContent,
                pending: false,
                message_id: finalMsgId,
                source: finalSource,
              },
              finalConvId
            );

            if (finalConvId) {
              upsertConversationLocal({
                conversationId: finalConvId,
                title: summarizeTitle(msg),
                lastMessagePreview: finalContent,
                updatedAt: new Date().toISOString(),
              });

              if (isBrandNewChat) {
                prevConvIdRef.current = finalConvId;
                setActiveConversationId(finalConvId);
                router.replace(`/assistant/${finalConvId}` as any);
              }
            }
            if (isAtBottomRef.current) {
              scrollRef.current?.scrollToEnd({ animated: true });
            }
            setIsSendingMessage(false);
          }
        },
        onError: async (err) => {
          console.warn('Streaming WS failed, falling back to HTTP...', err);
          if (!didStreamTokens) {
            try {
              updateAssistantMsg({ statusText: 'Synthesizing agronomic advisory...' });
              const res = await sendChatMessage(
                {
                  query: msg,
                  language: responseLanguage,
                  conversation_id: targetConversationId || undefined,
                  use_rag: true,
                },
                { skipLoading: true }
              );

              if (res) {
                const resConvId = res.conversation_id || activeConvId;
                const resContent = res.message?.content || res.response || res.answer || '';
                const assistantMessage: ChatMessage = {
                  message_id: res.message?.message_id || pendingAssistantId,
                  role: 'assistant',
                  content: resContent,
                  source: res.message?.source || res.source || 'agrinexa',
                  language: res.message?.language || responseLanguage,
                  created_at: res.message?.created_at || new Date().toISOString(),
                  pending: false,
                };

                updateAssistantMsg(
                  {
                    content: resContent,
                    pending: false,
                    message_id: assistantMessage.message_id,
                    source: assistantMessage.source,
                  },
                  resConvId
                );

                if (resConvId) {
                  upsertConversationLocal({
                    conversationId: resConvId,
                    title: summarizeTitle(msg),
                    lastMessagePreview: resContent,
                    updatedAt: assistantMessage.created_at,
                  });

                  if (isBrandNewChat && resConvId) {
                    prevConvIdRef.current = resConvId;
                    setActiveConversationId(resConvId);
                    router.replace(`/assistant/${resConvId}` as any);
                  }
                }
              } else {
                throw new Error('No response from fallback');
              }
            } catch (fallbackErr) {
              updateAssistantMsg({
                content: 'Failed to send message. Tap here to retry.',
                pending: false,
                failed: true,
                retryQuery: msg,
              });
            } finally {
              setIsSendingMessage(false);
            }
          } else {
            updateAssistantMsg({ pending: false });
            setIsSendingMessage(false);
          }
        },
      });
    } catch (outerErr) {
      console.error('Error starting chat stream:', outerErr);
      setIsSendingMessage(false);
    }
  };

  const handleSendText = async () => {
    const msg = text.trim();
    if (!msg || isSendingMessage) return;
    setText('');
    await sendTextQuery(msg);
  };

  useEffect(() => {
    sendTextQueryRef.current = sendTextQuery;
  }, [sendTextQuery]);

  const handleRetryMessage = useCallback(
    async (item: ChatMessage) => {
      const retryQuery = item.retryQuery?.trim();
      if (!retryQuery || isSendingMessage) return;
      await sendTextQueryRef.current(retryQuery);
    },
    [isSendingMessage]
  );

  const renderMessageItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      return <MessageItem item={item} onRetry={handleRetryMessage} />;
    },
    [handleRetryMessage]
  );

  const messageKeyExtractor = useCallback((item: ChatMessage) => item.message_id, []);

  // ── Voice recording ──
  async function startRecording() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.granted) {
        await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!isRecording) return;
    setIsRecording(false);
    try {
      const duration = recorder.currentTime;
      await recorder.stop();
      const uri = recorder.uri;
      if (duration > 0.1 && uri) {
        const res = await voiceQuery(uri, {
          conversationId: conversationId || undefined,
          language: responseLanguage,
        });
        if (res) {
          const nextConvId = res.conversation_id || conversationId;
          if (nextConvId) {
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
              const existingTitle =
                conversations.find((c) => c.conversation_id === nextConvId)?.title || '';
              const shouldAutoSetTitle =
                !existingTitle || existingTitle.trim().toLowerCase() === 'new chat';

              setMessagePages((prev) => ({
                ...prev,
                [nextConvId]: [...(prev[nextConvId] || []), ...voiceMessages],
              }));
              setMessageTotals((prev: { [x: string]: any }) => ({
                ...prev,
                [nextConvId]: (prev[nextConvId] || 0) + voiceMessages.length,
              }));
              upsertConversationLocal({
                conversationId: nextConvId,
                title: shouldAutoSetTitle ? 'Voice chat' : undefined,
                lastMessagePreview: assistantReply || transcript,
                updatedAt: nowIso,
              });

              if (!conversationId && nextConvId) {
                openConversation(nextConvId);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Messages Stream & Floating Header Container */}
      <View
        className="flex-1 relative">
        <FlatList
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingTop: (isWideScreen ? 12 : Math.max(insets.top - 20, 12)) + 58,
            paddingBottom: 24,
            paddingHorizontal: 16,
            flexGrow: 1,
          }}
        data={activeMessages}
        renderItem={renderMessageItem}
        keyExtractor={messageKeyExtractor}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        onScroll={handleScroll}
        scrollEventThrottle={32}
        onContentSizeChange={handleContentSizeChange}
        ListHeaderComponent={
          conversationId && hasMoreMessages ? (
            <View className="py-2 items-center">
              {loadingMoreMessages ? (
                <View className="flex-row items-center gap-2 py-2">
                  <Spinner size={14} color={colors.primary} />
                  <Text variant="muted" className="text-xs">
                    Loading older messages...
                  </Text>
                </View>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => loadMessages(conversationId, false)}
                  className="self-center mb-2 flex-row items-center gap-1.5 rounded-full px-4 h-8"
                >
                  <Icon as={ChevronUp} size={12} className="text-muted-foreground" />
                  <Text className="text-xs text-foreground">Load Older Messages</Text>
                </Button>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          loadingMessages ? (
            <View className="flex-1 items-center justify-center py-20">
              <Spinner size={24} color={colors.primary} />
              <Text variant="muted" className="mt-3 text-xs">
                Loading conversation...
              </Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-12 px-4">
              <View className="h-16 w-16 rounded-full bg-primary/10 items-center justify-center mb-4 border border-primary/20">
                <Icon as={Bot} size={32} className="text-primary" />
              </View>

              <Text variant="h3" className="text-xl font-bold text-foreground text-center mb-2">
                How can I help with your farm today?
              </Text>

              <Text variant="muted" className="text-sm text-center max-w-sm mb-6">
                Ask about crop diseases, fertilizers, weather impact, or mandi prices.
              </Text>

              <View className="w-full max-w-md gap-2">
                {SUGGESTIONS.map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => sendTextQuery(item.text)}
                      android_ripple={{ color: colors.primary + '18', borderless: false }}
                      className="flex-row items-center gap-3 p-3.5 rounded-xl border border-border/70 bg-card active:bg-secondary/40 shadow-xs overflow-hidden"
                    >
                      <View className="h-8 w-8 rounded-lg bg-primary/10 items-center justify-center">
                        <Icon as={IconComp} size={16} className="text-primary" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-semibold text-foreground">{item.title}</Text>
                        <Text className="text-[11px] text-muted-foreground mt-0.5" numberOfLines={1}>
                          {item.text}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )
        }
      />

      {/* Floating Top Header - Completely transparent, no background bar */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          paddingTop: isWideScreen ? 12 : Math.max(insets.top - 20, 12),
        }}
        className="px-4 pb-2 bg-transparent"
      >
        <View className="flex-row items-center justify-between" pointerEvents="box-none">
          {/* Left: Back button & Side menu toggle */}
          <View className="flex-row items-center bg-secondary border border-border/50 rounded-full overflow-hidden" pointerEvents="auto">
            <Pressable
              onPress={handleBack}
              android_ripple={{ color: rippleColor, borderless: false, foreground: true }}
              className="items-center justify-center rounded-full overflow-hidden active:opacity-70 p-3"
            >
              <Icon as={ChevronLeft} size={18} className="text-foreground" />
            </Pressable>

            {!isWideScreen && (
              <Pressable
                onPress={() => setMobileSidebarOpen(true)}
                android_ripple={{ color: rippleColor, borderless: false, foreground: true }}
                className="items-center justify-center rounded-full overflow-hidden active:opacity-70 relative p-3"
              >
                <Icon as={Menu} size={18} className="text-foreground" />
                {conversationTotal > 0 && (
                  <View className="absolute top-1 right-1 min-w-[15px] h-3.5 rounded-full bg-primary items-center justify-center px-1 pointer-events-none">
                    <Text className="text-[8px] font-black text-primary-foreground leading-none">
                      {conversationTotal > 99 ? '99+' : conversationTotal}
                    </Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>

          {/* Right: New Chat button */}
          <View className="flex-row items-center bg-secondary border border-border/50 rounded-full overflow-hidden" pointerEvents="auto">
            <Pressable
              onPress={startNewChat}
              android_ripple={{ color: rippleColor, borderless: false, foreground: true }}
              className="items-center justify-center rounded-full overflow-hidden active:opacity-70 p-3"
            >
              <Icon as={SquarePen} size={18} className="text-foreground" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Scroll to bottom button */}
      {showScrollBottom && (
        <Pressable
          onPress={() => {
            isAtBottomRef.current = true;
            setShowScrollBottom(false);
            scrollRef.current?.scrollToEnd({ animated: true });
          }}
          android_ripple={{ color: ripplePrimary, borderless: false, foreground: true }}
          className="absolute right-5 bottom-4 h-9 w-9 rounded-full bg-card border border-border/80 shadow-md items-center justify-center z-20 overflow-hidden active:bg-muted"
        >
          <Icon as={ChevronDown} size={18} className="text-primary" />
        </Pressable>
      )}
      </View>

      {/* Floating Input Card (ChatGPT Style) - In normal flex flow so KeyboardAvoidingView & Android adjustResize smoothly lift it above keyboard */}
      <View
        style={{
          paddingBottom: isKeyboardVisible
            ? (Platform.OS === 'android' ? (keyboardHeight > 0 ? keyboardHeight : 280) + 8 : 8)
            : Math.max(insets.bottom, 12),
        }}
        className="px-4 pt-1 bg-transparent w-full max-w-3xl mx-auto z-30"
      >
        <View className="rounded-2xl bg-secondary/95 dark:bg-[#212121] border border-border/60 px-3.5 pt-2 pb-2.5 shadow-xl backdrop-blur-md">
          {/* Top text input */}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Ask AgriNexa..."
            placeholderTextColor={colors.mutedForeground}
            className="w-full border-none  text-base text-foreground px-1.5 pt-1 pb-2 min-h-[38px] max-h-28"
            multiline
            onSubmitEditing={handleSendText}
            returnKeyType="send"
            editable={!isSendingMessage && !isRecording}
          />

          {/* Bottom actions row (Plus on left, Mic + Send/Voice on right) */}
          <View className="flex-row items-center justify-between pt-0.5">
            {/* Plus action button on left */}
            <Pressable
              onPress={handlePlusPress}
              android_ripple={{ color: rippleColor, borderless: false, foreground: true }}
              className="h-8 w-8 rounded-full bg-muted/60 items-center justify-center overflow-hidden active:opacity-70"
            >
              <Icon as={Plus} size={19} className="text-foreground" />
            </Pressable>

            {/* Right actions: Mic and Send/Voice */}
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={isRecording ? stopRecording : startRecording}
                android_ripple={{ color: rippleColor, borderless: false, foreground: true }}
                className={`h-8 w-8 rounded-full items-center justify-center overflow-hidden active:opacity-70 ${isRecording ? 'bg-destructive/20' : ''
                  }`}
              >
                <Icon
                  as={Mic}
                  size={19}
                  className={isRecording ? 'text-destructive' : 'text-muted-foreground'}
                />
              </Pressable>

              {text.trim() ? (
                <Pressable
                  onPress={handleSendText}
                  disabled={isSendingMessage}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.35)', borderless: false, foreground: true }}
                  className="h-8 w-8 rounded-full bg-primary items-center justify-center active:opacity-80 shadow-xs overflow-hidden"
                >
                  {isSendingMessage ? (
                    <Spinner size={15} color={colors.primaryForeground} />
                  ) : (
                    <Icon as={ArrowUp} size={16} className="text-primary-foreground" />
                  )}
                </Pressable>
              ) : (
                <Pressable
                  onPress={isRecording ? stopRecording : startRecording}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.35)', borderless: false, foreground: true }}
                  className={`h-8 w-8 rounded-full items-center justify-center shadow-xs overflow-hidden ${isRecording ? 'bg-destructive' : 'bg-primary'
                    }`}
                >
                  <Icon
                    as={AudioLines}
                    size={17}
                    className="text-primary-foreground"
                  />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
