import { cn } from '@/lib/utils';
import { Button } from '@/components/reusables/button';
import { useColorScheme } from 'nativewind';
import { Image, Platform, View } from 'react-native';

const SOCIAL_CONNECTION_STRATEGIES = [
  {
    type: 'oauth_google',
    source: { uri: 'https://img.clerk.com/static/google.png?width=160' },
    useTint: false,
  },
];

export interface SocialConnectionsProps {
  onGooglePress?: () => void;
  loading?: boolean;
}

export function SocialConnections({ onGooglePress, loading }: SocialConnectionsProps = {}) {
  const { colorScheme } = useColorScheme();

  return (
    <View className="gap-2 sm:flex-row sm:gap-3">
      {SOCIAL_CONNECTION_STRATEGIES.map((strategy) => {
        return (
          <Button
            key={strategy.type}
            variant="outline"
            size="sm"
            className="sm:flex-1"
            disabled={loading}
            onPress={() => {
              if (strategy.type === 'oauth_google' && onGooglePress) {
                onGooglePress();
              }
            }}>
            <Image
              className={cn('size-4', strategy.useTint && Platform.select({ web: 'dark:invert' }))}
              tintColor={Platform.select({
                native: strategy.useTint ? (colorScheme === 'dark' ? 'white' : 'black') : undefined,
              })}
              source={strategy.source}
            />
          </Button>
        );
      })}
    </View>
  );
}
