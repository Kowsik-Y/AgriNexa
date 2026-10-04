import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { MessageSquare, Pencil, Plus, Search, Trash2 } from 'lucide-react-native';

import { Badge } from '@/components/reusables/badge';
import { Button } from '@/components/reusables/button';
import { Input } from '@/components/reusables/input';
import { Text } from '@/components/reusables/text';
import { useTheme } from '@/hooks/use-theme';

type ConversationSummary = {
  conversation_id: string;
  title: string;
  last_message_preview: string;
  created_at: string;
  updated_at: string;
};

type ConversationRow =
  | { type: 'header'; key: string; label: string; count: number }
  | { type: 'conversation'; key: string; conversation: ConversationSummary };

type Props = {
  groupedThreadRows: ConversationRow[];
  stickySectionIndices?: number[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onCreateConversation: () => void;
  hasMoreConversations: boolean;
  loadingConversations: boolean;
  onLoadMore: () => void;
  activeConversationId: string | null;
  renameConversationId: string | null;
  renameText: string;
  onRenameTextChange: (value: string) => void;
  onSaveRename: (conversationId: string) => void;
  onRenameClose: () => void;
  onRenameStart: (conversationId: string, title: string) => void;
  onConversationPress: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  isDesktop?: boolean;
};

export function ConversationSidebarContent({
  groupedThreadRows,
  stickySectionIndices,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onCreateConversation,
  hasMoreConversations,
  loadingConversations,
  onLoadMore,
  activeConversationId,
  renameConversationId,
  renameText,
  onRenameTextChange,
  onSaveRename,
  onRenameClose,
  onRenameStart,
  onConversationPress,
  onDeleteConversation,
  isDesktop = false,
}: Props) {
  const { colors } = useTheme();

  return (
    <View className="flex-1">
      {/* New chat button */}
      <Button
        variant="default"
        onPress={onCreateConversation}
        className="mb-3 w-full flex-row items-center justify-center gap-2 rounded-xl h-10 bg-primary"
      >
        <Plus size={16} color={colors.primaryForeground} />
        <Text className="font-semibold text-primary-foreground text-sm">
          New Chat
        </Text>
      </Button>

      {/* Search Bar */}
      <View className="relative mb-3 flex-row items-center">
          <Input
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search conversations..."
            returnKeyType="search"
            onSubmitEditing={onSearchSubmit}
            className="flex-1 px-2 text-sm text-foreground"
          />
      </View>

      {/* Thread list */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-1.5 pb-6"
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={isDesktop ? stickySectionIndices : undefined}
      >
        {groupedThreadRows.length === 0 ? (
          <View className="items-center justify-center py-8">
            <MessageSquare size={24} color={colors.mutedForeground} />
            <Text variant="muted" className="mt-2 text-xs text-center">
              No conversations found
            </Text>
          </View>
        ) : (
          groupedThreadRows.map((row) => {
            if (row.type === 'header') {
              return (
                <View
                  key={row.key}
                  className={`mt-2 mb-1 flex-row items-center justify-between py-1 px-1 bg-card ${
                    isDesktop ? 'border-b border-border/40 pb-1.5' : ''
                  }`}
                >
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {row.label}
                  </Text>
                  <Badge variant="secondary" className="px-1.5 py-0 h-4 rounded-full">
                    <Text className="text-[10px] font-bold text-muted-foreground">
                      {row.count}
                    </Text>
                  </Badge>
                </View>
              );
            }

            const conversation = row.conversation;
            const isActive = activeConversationId === conversation.conversation_id;

            return (
              <View
                key={conversation.conversation_id}
                className={`group flex-row items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border/50 bg-card/60 active:bg-muted/40'
                }`}
              >
                <Pressable
                  onPress={() => onConversationPress(conversation.conversation_id)}
                  className="flex-1 mr-2"
                >
                  <Text
                    numberOfLines={1}
                    className={`text-sm font-medium ${
                      isActive ? 'text-primary font-semibold' : 'text-foreground'
                    }`}
                  >
                    {conversation.title}
                  </Text>
                  {conversation.last_message_preview ? (
                    <Text
                      numberOfLines={1}
                      variant="muted"
                      className="text-[11px] mt-0.5 text-muted-foreground/80"
                    >
                      {conversation.last_message_preview}
                    </Text>
                  ) : null}
                </Pressable>

                <View className="flex-row items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      onRenameStart(conversation.conversation_id, conversation.title);
                    }}
                  >
                    <Pencil size={12} color={colors.mutedForeground} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      onDeleteConversation(conversation.conversation_id);
                    }}
                  >
                    <Trash2 size={12} color={colors.foreground} />
                  </Button>
                </View>
              </View>
            );
          })
        )}

        {!searchQuery && hasMoreConversations && (
          <Button
            variant="outline"
            size="sm"
            onPress={onLoadMore}
            disabled={loadingConversations}
            className="self-center mt-2 rounded-xl h-8 px-4"
          >
            <Text className="text-xs text-foreground">
              {loadingConversations ? 'Loading...' : 'Load More'}
            </Text>
          </Button>
        )}
      </ScrollView>
    </View>
  );
}

