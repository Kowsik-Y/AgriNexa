import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Globe, Banknote, Check } from 'lucide-react-native';

import { Card, CardContent } from '@/components/reusables/card';
import { Separator } from '@/components/reusables/separator';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { useAppContext } from '@/context/AppProvider';

export default function RegionCurrencyScreen() {
  const { region, currency, setRegion, setCurrency } = useAppContext();

  const regions = ['India', 'Sri Lanka', 'Bangladesh', 'Nepal'];
  const currencies = [
    { code: 'INR', name: 'Indian Rupee (₹)' },
    { code: 'USD', name: 'US Dollar ($)' },
    { code: 'LKR', name: 'Sri Lankan Rupee (₨)' },
    { code: 'BDT', name: 'Bangladeshi Taka (৳)' },
  ];

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Region & Currency' }} />
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-16 gap-6"
        >
          {/* Select Region */}
          <View className="gap-2">
            <View className="flex-row items-center gap-2 ml-1">
              <Icon as={Globe} size={16} className="text-primary" />
              <Text variant="muted" className="text-xs font-bold uppercase tracking-wider">
                SELECT REGION
              </Text>
            </View>
            <Card className="p-0 border border-border bg-card overflow-hidden">
              <CardContent className="p-0">
                {regions.map((r, i) => (
                  <React.Fragment key={r}>
                    <Pressable
                      className="flex-row items-center justify-between px-4 py-3.5 active:bg-muted/40"
                      onPress={() => setRegion(r)}
                    >
                      <Text
                        className={`text-sm ${
                          region === r
                            ? 'font-bold text-foreground'
                            : 'font-normal text-foreground'
                        }`}
                      >
                        {r}
                      </Text>
                      {region === r && (
                        <Icon as={Check} size={18} className="text-primary" />
                      )}
                    </Pressable>
                    {i < regions.length - 1 && <Separator />}
                  </React.Fragment>
                ))}
              </CardContent>
            </Card>
            <Text variant="muted" className="text-xs ml-1 leading-relaxed">
              Your region determines the market price data sources and local news.
            </Text>
          </View>

          {/* Select Currency */}
          <View className="gap-2">
            <View className="flex-row items-center gap-2 ml-1">
              <Icon as={Banknote} size={16} className="text-primary" />
              <Text variant="muted" className="text-xs font-bold uppercase tracking-wider">
                PREFERRED CURRENCY
              </Text>
            </View>
            <Card className="p-0 border border-border bg-card overflow-hidden">
              <CardContent className="p-0">
                {currencies.map((c, i) => (
                  <React.Fragment key={c.code}>
                    <Pressable
                      className="flex-row items-center justify-between px-4 py-3.5 active:bg-muted/40"
                      onPress={() => setCurrency(c.code)}
                    >
                      <View>
                        <Text
                          className={`text-sm ${
                            currency === c.code
                              ? 'font-bold text-foreground'
                              : 'font-normal text-foreground'
                          }`}
                        >
                          {c.name}
                        </Text>
                        <Text variant="muted" className="text-xs mt-0.5">
                          {c.code}
                        </Text>
                      </View>
                      {currency === c.code && (
                        <Icon as={Check} size={18} className="text-primary" />
                      )}
                    </Pressable>
                    {i < currencies.length - 1 && <Separator />}
                  </React.Fragment>
                ))}
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}
