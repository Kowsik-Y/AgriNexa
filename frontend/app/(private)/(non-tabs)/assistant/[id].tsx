import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ChatThreadView } from '@/components/assistant/ChatThreadView';

export default function AssistantConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChatThreadView conversationId={id || null} />;
}
