import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LayoutGrid, GripVertical, Save, Info } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Card, CardContent } from '@/components/reusables/card';
import { Button } from '@/components/reusables/button';
import { Switch } from '@/components/reusables/switch';
import { Text } from '@/components/reusables/text';
import { Icon } from '@/components/reusables/icon';
import { ResponsiveContainer } from '@/components/ResponsiveContainer';
import { useToast } from '@/components/Toast';

export default function DashboardLayoutScreen() {
  const { toast } = useToast();
  const router = useRouter();

  const [layout, setLayout] = useState([
    { id: 'weather', label: 'Weather Forecast', visible: true },
    { id: 'pest', label: 'Pest Detection', visible: true },
    { id: 'prices', label: 'Market Prices', visible: true },
    { id: 'flow', label: 'Agri Flow Timeline', visible: true },
    { id: 'news', label: 'Agriculture News', visible: true },
    { id: 'iot', label: 'IoT Sensor Data', visible: false },
  ]);

  useEffect(() => {
    const loadLayout = async () => {
      const stored = await AsyncStorage.getItem('dashboard_layout');
      if (stored) setLayout(JSON.parse(stored));
    };
    loadLayout();
  }, []);

  const toggleVisibility = (id: string) => {
    setLayout(
      layout.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const handleSave = async () => {
    await AsyncStorage.setItem('dashboard_layout', JSON.stringify(layout));
    toast({
      title: 'Layout Saved',
      description: 'Your dashboard has been updated.',
      type: 'success',
    });
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Dashboard Layout' }} />
      <ResponsiveContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-5 pb-16 gap-6"
        >
          {/* Intro */}
          <View className="items-center mt-2 mb-2 gap-3">
            <View className="w-16 h-16 rounded-2xl items-center justify-center bg-primary/10">
              <Icon as={LayoutGrid} size={32} className="text-primary" />
            </View>
            <Text variant="muted" className="text-center px-6 text-sm">
              Customize your home screen by choosing which modules you want to see.
            </Text>
          </View>

          {/* Active Modules */}
          <View className="gap-2">
            <Text variant="muted" className="text-xs font-bold uppercase tracking-wider ml-1">
              ACTIVE MODULES
            </Text>
            <Card className="p-0 border border-border bg-card overflow-hidden">
              <CardContent className="p-0">
                {layout.map((item, index) => (
                  <View
                    key={item.id}
                    className={`flex-row items-center justify-between px-4 py-4 ${
                      index < layout.length - 1 ? 'border-b border-border/60' : ''
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <Icon as={GripVertical} size={20} className="text-muted-foreground/50" />
                      <Text className="font-semibold text-foreground text-sm">{item.label}</Text>
                    </View>
                    <Switch
                      checked={item.visible}
                      onCheckedChange={() => toggleVisibility(item.id)}
                    />
                  </View>
                ))}
              </CardContent>
            </Card>
          </View>

          {/* Tip */}
          <View className="flex-row gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/50 items-center">
            <Icon as={Info} size={18} className="text-primary shrink-0" />
            <Text variant="muted" className="flex-1 text-xs leading-relaxed">
              Tip: Turning off modules you don&apos;t use can make the app load faster and use less data.
            </Text>
          </View>

          {/* Save Button */}
          <Button
            className="h-12 rounded-xl flex-row items-center justify-center gap-2 mt-2"
            onPress={handleSave}
          >
            <Icon as={Save} size={18} className="text-primary-foreground" />
            <Text className="font-bold text-primary-foreground">Apply Changes</Text>
          </Button>
        </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}
