import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { FileText, CalendarDays, Camera, Mic, Lightbulb, LayoutGrid, Tractor } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/use-theme';
import { MoreToolsItem, MoreToolsSection } from '@/components/home/MoreToolsSection';

const TOOL_ITEMS: MoreToolsItem[] = [
  { label: 'Crop Scan', sub: 'AI disease & pest detection', icon: Camera, color: '#10B981', route: '/scan' },
  { label: 'Assistant', sub: 'Talk to your AI farming agent', icon: Mic, color: '#3B82F6', route: '/assistant' },
  { label: 'Crop Advice', sub: 'Personalised AI recommendations', icon: Lightbulb, color: '#8B5CF6', route: '/advice' },
  { label: 'Reports', sub: 'Monitoring summaries & export', icon: FileText, color: '#F97316', route: '/reports' },
  { label: 'Daily Check', sub: 'Log daily crop health', icon: CalendarDays, color: '#06B6D4', route: '/daily-check' },
  { label: 'Update Farming Flow', sub: 'Separate route to update crop stage flow', icon: Tractor, color: '#14B8A6', route: '/update-farming-flow' },
  { label: 'Stage Model Test', sub: 'Test imported Colab stage model + LLM explain', icon: FileText, color: '#6366F1', route: '/stage-model-test' },
  { label: 'ML Test Lab', sub: 'Test crop and disease predictions quickly', icon: Camera, color: '#0EA5E9', route: '/ml-test-lab' },
];

export default function ToolsScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Typography.H2 style={[styles.title, { color: colors.foreground, borderBottomWidth: 0 }]}>Tools</Typography.H2>
          <Typography.P style={{ color: colors.mutedForeground, marginTop: 2 }}>All farming tools in one place.</Typography.P>
        </View>
        <MoreToolsSection label="Tools" labelIcon={LayoutGrid} items={TOOL_ITEMS} marginBottom={110} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 0 },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { fontWeight: '800', fontSize: 24, letterSpacing: -0.5 },
});
