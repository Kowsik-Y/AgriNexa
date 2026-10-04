import React, { memo, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  BookOpen,
  Check,
  Copy,
  RefreshCcw,
  Share2,
  Volume2,
} from 'lucide-react-native';

import { Icon } from '@/components/reusables/icon';
import { Text } from '@/components/reusables/text';
import { Spinner } from '@/components/Spinner';
import { useTheme } from '@/hooks/use-theme';
import { MarkdownContent } from './MarkdownContent';

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
  statusText?: string;
};

type Props = {
  item: ChatMessageItem;
  onRetry: (item: ChatMessageItem) => void;
};

function MessageItemBase({ item, onRetry }: Props) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const rippleColor = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)';
  const isUser = item.role === 'user';

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(item.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy message:', err);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: item.content,
      });
    } catch (err) {
      console.warn('Failed to share message:', err);
    }
  };

  const handleSpeak = () => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(item.content);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.warn('Speech playback not available:', err);
    }
  };

  // User Message (ChatGPT Blue Rounded Bubble)
  if (isUser) {
    return (
      <View className="mb-5 items-end pl-12">
        <View className="max-w-[85%] rounded-[20px] bg-[#1e345b] dark:bg-[#1a3258] px-4 py-3 shadow-xs">
          <Text className="text-[15px] leading-relaxed text-white font-normal">
            {item.content}
          </Text>
        </View>
      </View>
    );
  }

  const isStreamingWithContent = item.pending && Boolean(item.content);

  // Assistant Message (ChatGPT Clean Markdown Stream with Action Buttons)
  return (
    <View className="mb-6 items-start w-full">
      <View
        className={`w-full ${
          item.failed
            ? 'border-destructive/40 bg-destructive/5 border px-4 py-3 rounded-2xl'
            : ''
        }`}
      >
        {item.pending && !item.content ? (
          <View className="flex-row items-center gap-2 py-2">
            <Spinner size={14} color={colors.primary} />
            <Text variant="muted" className="text-xs italic">
              {item.statusText || 'Thinking & researching your farm query...'}
            </Text>
          </View>
        ) : (
          <>
            {item.failed && (
              <Pressable
                onPress={() => onRetry(item)}
                android_ripple={{ color: 'rgba(239, 68, 68, 0.2)', borderless: false, foreground: true }}
                className="mb-3 flex-row items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 overflow-hidden active:opacity-80"
              >
                <Icon as={RefreshCcw} size={14} className="text-destructive" />
                <Text className="text-xs font-semibold text-destructive">
                  Failed to send. Tap here to retry
                </Text>
              </Pressable>
            )}

            <MarkdownContent
              content={item.content}
              isStreaming={isStreamingWithContent}
            />

            {!item.pending && item.content ? (
              <View className="flex-row items-center gap-1 mt-3 pt-1">
                {/* Copy button */}
                <Pressable
                  onPress={handleCopy}
                  hitSlop={6}
                  android_ripple={{ color: rippleColor, borderless: true }}
                  className="h-8 w-8 items-center justify-center rounded-full active:bg-muted/50"
                >
                  <Icon
                    as={copied ? Check : Copy}
                    size={15}
                    className={copied ? 'text-primary' : 'text-muted-foreground'}
                  />
                </Pressable>

                {/* Speaker button */}
                <Pressable
                  onPress={handleSpeak}
                  hitSlop={6}
                  android_ripple={{ color: rippleColor, borderless: true }}
                  className="h-8 w-8 items-center justify-center rounded-full active:bg-muted/50"
                >
                  <Icon as={Volume2} size={15} className="text-muted-foreground" />
                </Pressable>

                {/* Share button */}
                <Pressable
                  onPress={handleShare}
                  hitSlop={6}
                  android_ripple={{ color: rippleColor, borderless: true }}
                  className="h-8 w-8 items-center justify-center rounded-full active:bg-muted/50"
                >
                  <Icon as={Share2} size={15} className="text-muted-foreground" />
                </Pressable>

                {/* Sources pill (like in ChatGPT reference) */}
                <View className="flex-row items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-secondary/80 border border-border/50">
                  <Icon as={BookOpen} size={13} className="text-muted-foreground" />
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    Sources
                  </Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

export const MessageItem = memo(MessageItemBase, (prev, next) => {
  return prev.item === next.item && prev.onRetry === next.onRetry;
});
