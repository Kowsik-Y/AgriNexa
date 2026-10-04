import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Sprout, RefreshCcw, Lightbulb } from 'lucide-react-native';

import { Button } from '@/components/reusables/button';
import { Card, CardContent } from '@/components/reusables/card';
import { Separator } from '@/components/reusables/separator';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { Spinner } from '@/components/Spinner';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';

export default function AdviceScreen() {
  const { colors } = useTheme();
  const { getAdvice, loading } = useApi();
  const [adviceList, setAdviceList] = useState<any[]>([]);

  useEffect(() => {
    fetchAdvice();
  }, []);

  const fetchAdvice = async () => {
    const list = await getAdvice();
    setAdviceList(list || []);
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: 'Expert Advice',
          headerRight: () => (
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-xl"
              onPress={fetchAdvice}
            >
              <Icon as={RefreshCcw} size={18} className="text-foreground" />
            </Button>
          ),
        }}
      />
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-16 gap-4"
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchAdvice}
              tintColor={colors.tint}
            />
          }
        >
          <Text variant="muted" className="text-sm -mt-1">
            Personalized AI recommendations for your crop.
          </Text>

          {loading && adviceList.length === 0 ? (
            <View className="items-center justify-center py-20 gap-3">
              <Spinner size={32} />
              <Text variant="muted" className="text-sm">Generating insights...</Text>
            </View>
          ) : (
            adviceList.map((item) => (
              <Card
                key={item.id}
                className="p-4 rounded-2xl border border-border bg-card gap-2.5"
              >
                <View className="flex-row items-center gap-2.5">
                  <View className="w-8 h-8 rounded-lg items-center justify-center bg-primary/10 shrink-0">
                    <Icon as={Sprout} size={18} className="text-primary" />
                  </View>
                  <Text className="font-bold text-foreground text-base flex-1">
                    {item.title}
                  </Text>
                </View>

                <Text className="text-sm leading-relaxed text-foreground/90">
                  {item.text}
                </Text>

                <View className="flex-row items-center gap-3 mt-1 flex-wrap">
                  {typeof item.confidence === 'number' && (
                    <Text className="text-xs font-semibold text-primary">
                      Confidence: {Math.round(item.confidence * 100)}%
                    </Text>
                  )}
                  {item.timing && (
                    <Text variant="muted" className="text-xs">
                      Timing: {item.timing}
                    </Text>
                  )}
                </View>

                {item.tamil && (
                  <>
                    <Separator className="my-1.5" />
                    <Text variant="muted" className="text-sm leading-relaxed">
                      {item.tamil}
                    </Text>
                  </>
                )}
              </Card>
            ))
          )}

          {/* Tip of the Day */}
          <Card className="p-4 rounded-2xl border border-primary/30 bg-primary/5 gap-2">
            <View className="flex-row items-center gap-2">
              <Icon as={Lightbulb} size={18} className="text-primary" />
              <Text className="font-bold text-primary text-sm">Tip of the Day</Text>
            </View>
            <Text className="text-xs leading-relaxed text-foreground/80">
              Crop rotation helps maintain soil health and reduces pest build-up. Consider planting legumes after rice.
            </Text>
          </Card>
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}
