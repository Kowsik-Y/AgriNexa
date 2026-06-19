import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { RefreshCcw } from 'lucide-react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/use-theme';

export type ChatMessageItem = {
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

type Props = {
    item: ChatMessageItem;
    onRetry: (item: ChatMessageItem) => void;
};

function formatTime(iso: string) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageItemBase({ item, onRetry }: Props) {
    const { colors } = useTheme();

    return (
        <View style={styles.msgPair}>
            <Card
                style={[
                    item.role === 'user'
                        ? [styles.userBubble, { backgroundColor: colors.primary }]
                        : [styles.aiBubble, { borderColor: item.failed ? colors.destructive : colors.border }],
                ]}
            >
                <Pressable
                    disabled={!(item.failed && item.role === 'assistant')}
                    onPress={() => onRetry(item)}
                >
                    <View style={styles.messageMetaRow}>
                        <Badge variant={item.role === 'user' ? 'default' : 'outline'}>
                            {item.role === 'user' ? 'You' : item.source.toUpperCase()}
                        </Badge>
                    </View>

                    {item.pending && item.role === 'assistant' ? (
                        <View style={styles.typingRow}>
                            <Spinner size={14} color={colors.primary} />
                            <Typography.Small style={{ color: colors.mutedForeground, marginLeft: 6 }} translate={false}>
                                Thinking...
                            </Typography.Small>
                        </View>
                    ) : (
                        <>
                            {item.failed && item.role === 'assistant' && (
                                <View style={styles.retryRow}>
                                    <RefreshCcw size={12} color={colors.destructive} />
                                    <Typography.Small style={{ color: colors.destructive, marginLeft: 4 }}>
                                        Retry
                                    </Typography.Small>
                                </View>
                            )}
                            <Typography.P
                                style={{
                                    color: item.role === 'user' ? '#fff' : colors.foreground,
                                    lineHeight: 22,
                                }}
                                translate={false}
                            >
                                {item.content}
                            </Typography.P>
                            <Typography.Small
                                style={{
                                    color: item.role === 'user' ? '#ffffffcc' : colors.mutedForeground,
                                    alignSelf: 'flex-end',
                                    marginTop: 4,
                                }}
                                translate={false}
                            >
                                {formatTime(item.created_at)}
                            </Typography.Small>
                        </>
                    )}
                </Pressable>
            </Card>
        </View>
    );
}

export const MessageItem = memo(MessageItemBase, (prev, next) => {
    return prev.item === next.item && prev.onRetry === next.onRetry;
});

const styles = StyleSheet.create({
    msgPair: { marginBottom: 16 },
    messageMetaRow: { marginBottom: 8 },
    userBubble: {
        alignSelf: 'flex-end',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderBottomRightRadius: 4,
        maxWidth: '80%',
        borderWidth: 0,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        maxWidth: '85%',
        marginTop: 2,
        padding: 12,
        borderWidth: 1,
    },
    typingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingLeft: 4 },
    retryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
});
