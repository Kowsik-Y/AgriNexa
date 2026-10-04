import React from 'react';
import {
  Modal,
  useWindowDimensions,
  View,
} from 'react-native';
import { Slot } from 'expo-router';
import { Drawer } from 'react-native-drawer-layout';
import { MessageSquare, X } from 'lucide-react-native';

import { Text } from '@/components/reusables/text';
import { Badge } from '@/components/reusables/badge';
import { Button } from '@/components/reusables/button';
import { Input } from '@/components/reusables/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/reusables/alert-dialog';
import { useTheme } from '@/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConversationSidebarContent } from '@/components/assistant/ConversationSidebarContent';
import {
  AssistantProvider,
  useAssistantContext,
} from '@/components/assistant/AssistantContext';

function AssistantLayoutContent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 960;

  const {
    conversationTotal,
    hasMoreConversations,
    loadingConversations,
    searchQuery,
    setSearchQuery,
    loadConversations,
    activeConversationId,
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
  } = useAssistantContext();

  const drawerWidth = Math.min(360, Math.round(width * 0.85));

  const renderDrawerSidebar = () => (
    <View className="flex-1 bg-card">
      <View
        style={{ paddingTop: Math.max(insets.top-20, 14) }}
        className="flex-row items-center justify-between px-4 pb-3 border-b border-border/60 bg-card"
      >
        <View className="flex-row items-center gap-2">
          <MessageSquare size={16} color={colors.primary} />
          <Text className="font-bold text-foreground text-sm">Conversations</Text>
        </View>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onPress={() => setMobileSidebarOpen(false)}
        >
          <X size={16} color={colors.foreground} />
        </Button>
      </View>

      <View className="flex-1 p-3 bg-card">
        <ConversationSidebarContent
          groupedThreadRows={groupedThreadRows}
          stickySectionIndices={stickySectionIndices}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={() => loadConversations(true, searchQuery)}
          onCreateConversation={() => {
            setMobileSidebarOpen(false);
            startNewChat();
          }}
          hasMoreConversations={hasMoreConversations}
          loadingConversations={loadingConversations}
          onLoadMore={() => loadConversations(false)}
          activeConversationId={activeConversationId}
          renameConversationId={renameConversationId}
          renameText={renameText}
          onRenameTextChange={setRenameText}
          onSaveRename={saveRename}
          onRenameClose={() => setRenameConversationId(null)}
          onRenameStart={(convId, title) => {
            setRenameConversationId(convId);
            setRenameText(title);
          }}
          onConversationPress={(id) => {
            setMobileSidebarOpen(false);
            openConversation(id);
          }}
          onDeleteConversation={setDeleteConversationId}
          isDesktop={false}
        />
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      {isWideScreen ? (
        <View className="flex-1 flex-row">
          {/* Desktop Left Sidebar */}
          <View className="w-80 border-r border-border bg-card p-4 shadow-xs">
            <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
              <View className="flex-row items-center gap-2">
                <MessageSquare size={16} color={colors.primary} />
                <Text className="font-bold text-foreground text-sm">Conversations</Text>
              </View>
              <Badge variant="outline" className="rounded-full px-2 py-0.5">
                <Text className="text-[10px] font-semibold">{conversationTotal} chats</Text>
              </Badge>
            </View>

            <ConversationSidebarContent
              groupedThreadRows={groupedThreadRows}
              stickySectionIndices={stickySectionIndices}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSearchSubmit={() => loadConversations(true, searchQuery)}
              onCreateConversation={startNewChat}
              hasMoreConversations={hasMoreConversations}
              loadingConversations={loadingConversations}
              onLoadMore={() => loadConversations(false)}
              activeConversationId={activeConversationId}
              renameConversationId={renameConversationId}
              renameText={renameText}
              onRenameTextChange={setRenameText}
              onSaveRename={saveRename}
              onRenameClose={() => setRenameConversationId(null)}
              onRenameStart={(convId, title) => {
                setRenameConversationId(convId);
                setRenameText(title);
              }}
              onConversationPress={openConversation}
              onDeleteConversation={setDeleteConversationId}
              isDesktop
            />
          </View>

          {/* Desktop Center / Right Route Area */}
          <View className="flex-1">
            <Slot />
          </View>
        </View>
      ) : (
        /* Small screen / Mobile: Gesture-driven Drawer Sidebar */
        <Drawer
          open={mobileSidebarOpen}
          onOpen={() => setMobileSidebarOpen(true)}
          onClose={() => setMobileSidebarOpen(false)}
          drawerPosition="left"
          drawerType="back"
          swipeEnabled={true}
          swipeEdgeWidth={60}
          drawerStyle={{
            width: drawerWidth,
            backgroundColor: colors.card,
            borderRightWidth: 1,
            borderColor: colors.border,
          }}
          overlayStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
          }}
          renderDrawerContent={renderDrawerSidebar}
        >
          <View className="flex-1 bg-background">
            <Slot />
          </View>
        </Drawer>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(deleteConversationId)}
        onOpenChange={(open) => !open && setDeleteConversationId(null)}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This conversation will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row items-center justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onPress={() => setDeleteConversationId(null)}
              className="rounded-full px-4"
            >
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onPress={confirmDeleteConversation}
              className="rounded-full px-4"
            >
              <Text className="text-white font-medium">Delete</Text>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <AlertDialog
        open={Boolean(renameConversationId)}
        onOpenChange={(open) => !open && setRenameConversationId(null)}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Rename conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a descriptive title for this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <View className="py-2">
            <Input
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Conversation title"
              className="w-full text-sm rounded-xl"
              autoFocus
              onSubmitEditing={() => {
                if (renameConversationId && renameText.trim()) {
                  saveRename(renameConversationId);
                }
              }}
            />
          </View>
          <AlertDialogFooter className="flex-row items-center justify-end gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onPress={() => setRenameConversationId(null)}
              className="rounded-full px-4"
            >
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="default"
              size="sm"
              onPress={() => {
                if (renameConversationId && renameText.trim()) {
                  saveRename(renameConversationId);
                }
              }}
              disabled={!renameText.trim()}
              className="rounded-full px-4"
            >
              <Text className="text-primary-foreground font-medium">Save</Text>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

export default function AssistantLayout() {
  return (
    <AssistantProvider>
      <AssistantLayoutContent />
    </AssistantProvider>
  );
}
