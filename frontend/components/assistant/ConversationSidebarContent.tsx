import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
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
        <>
            <Button variant="secondary" onPress={onCreateConversation} style={styles.newChatBtn}>
                <View style={styles.inlineBtnContent}>
                    <Plus size={16} color={colors.secondaryForeground} />
                    <Typography.Small style={{ color: colors.secondaryForeground, fontWeight: '700' }} translate={false}>
                        New Chat
                    </Typography.Small>
                </View>
            </Button>

            <View style={styles.searchTitleRow}>
                <Search size={14} color={colors.mutedForeground} />
                <Typography.Small style={{ color: colors.mutedForeground, fontWeight: '700' }}>
                    Search
                </Typography.Small>
            </View>

            <View style={styles.searchRow}>
                <Input
                    containerStyle={styles.searchWrap}
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    placeholder="Search conversations"
                    returnKeyType="search"
                    clearable
                    leftIcon={<Search size={16} color={colors.mutedForeground} />}
                    onSubmitEditing={onSearchSubmit}
                />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={isDesktop ? stickySectionIndices : undefined}
            >
                {groupedThreadRows.length === 0 ? (
                    <Typography.Small style={{ color: colors.mutedForeground }}>
                        No conversations yet
                    </Typography.Small>
                ) : (
                    groupedThreadRows.map((row) => {
                        if (row.type === 'header') {
                            return (
                                <View
                                    key={row.key}
                                    style={[
                                        styles.sectionHeader,
                                        isDesktop && styles.desktopSectionHeader,
                                        { backgroundColor: colors.card },
                                    ]}
                                >
                                    <Typography.Small style={{ color: colors.mutedForeground, fontWeight: '700' }}>
                                        {row.label}
                                    </Typography.Small>
                                    <Badge variant="secondary">{row.count}</Badge>
                                </View>
                            );
                        }

                        const conversation = row.conversation;
                        return (
                            <Card
                                key={conversation.conversation_id}
                                style={[
                                    styles.threadCard,
                                    {
                                        borderColor:
                                            activeConversationId === conversation.conversation_id ? colors.primary : colors.border,
                                        backgroundColor:
                                            activeConversationId === conversation.conversation_id
                                                ? `${colors.primary}12`
                                                : colors.card,
                                    },
                                ]}
                            >
                                <Pressable
                                    onPress={() => onConversationPress(conversation.conversation_id)}
                                    style={styles.threadMain}
                                >
                                    {renameConversationId === conversation.conversation_id ? (
                                        <TextInput
                                            autoFocus
                                            value={renameText}
                                            onChangeText={onRenameTextChange}
                                            onSubmitEditing={() => onSaveRename(conversation.conversation_id)}
                                            onBlur={onRenameClose}
                                            style={[styles.renameInput, { color: colors.foreground, borderColor: colors.border }]}
                                        />
                                    ) : (
                                        <Typography.Small style={{ color: colors.foreground, fontWeight: '700' }} translate={false}>
                                            {conversation.title}
                                        </Typography.Small>
                                    )}
                                </Pressable>

                                <View style={styles.threadActions}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onPress={() => onRenameStart(conversation.conversation_id, conversation.title)}
                                    >
                                        <Pencil size={14} color={colors.mutedForeground} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onPress={() => onDeleteConversation(conversation.conversation_id)}
                                    >
                                        <Trash2 size={14} color={colors.destructive} />
                                    </Button>
                                </View>
                            </Card>
                        );
                    })
                )}

                {!searchQuery && hasMoreConversations && (
                    <Button
                        variant="outline"
                        size="sm"
                        onPress={onLoadMore}
                        loading={loadingConversations}
                        style={styles.moreThreadsBtn}
                    >
                        More
                    </Button>
                )}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    inlineBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    newChatBtn: {
        marginTop: 10,
        justifyContent: 'flex-start',
    },
    searchTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    searchWrap: {
        flex: 1,
    },
    scroll: { flex: 1, marginTop: 10 },
    listContainer: { gap: 8, paddingBottom: 12 },
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
    renameInput: { borderWidth: 1, borderRadius: 8, fontSize: 12, paddingHorizontal: 6, height: 28 },
    moreThreadsBtn: {
        alignSelf: 'center',
        marginTop: 6,
    },
});
