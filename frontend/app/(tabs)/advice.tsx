import React, { useState, useEffect } from 'react';
import { StyleSheet, View, RefreshControl } from 'react-native';
import { Sprout, CheckCircle2, RefreshCcw } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { Spinner } from '@/components/ui/Spinner';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '@/context/AppProvider';

export default function AdviceScreen() {
  const { colors } = useTheme();
  const { getAdvice, loading } = useApi();
  const { appLanguage } = useAppContext();
  const [adviceList, setAdviceList] = useState<any[]>([]);

  useEffect(() => { fetchAdvice(); }, []);

  const fetchAdvice = async () => {
    const list = await getAdvice();
    setAdviceList(list);
  };

  return (
    <KeyboardResponsiveView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      scrollViewProps={{
        refreshControl: <RefreshControl refreshing={loading} onRefresh={fetchAdvice} tintColor={colors.tint} />,
      }}
    >
      <ResponsiveContainer>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography.H2 style={[styles.title, { color: colors.foreground, borderBottomWidth: 0 }]}>Expert Advice</Typography.H2>
            <Button variant="ghost" size="icon" onPress={fetchAdvice}>
              <RefreshCcw size={20} color={colors.mutedForeground} />
            </Button>
          </View>
          <Typography.P style={{ color: colors.mutedForeground, marginTop: 2 }}>
            Personalized AI recommendations for your crop.
          </Typography.P>
        </View>

        <View style={styles.content}>
          {loading && adviceList.length === 0 ? (
            <View style={styles.loading}>
              <Spinner size={28} color={colors.tint} />
              <Typography.P style={{ marginTop: 10, color: colors.mutedForeground }}>Generating insights...</Typography.P>
            </View>
          ) : (
            adviceList.map((item) => (
              <View key={item.id} style={[styles.card, { borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Sprout size={18} color={colors.tint} />
                  <Typography.P style={{ fontWeight: '700', flex: 1 }}>{item.title}</Typography.P>
                </View>
                <Typography.P style={{ lineHeight: 22, color: colors.foreground }}>{item.text}</Typography.P>
                {typeof item.confidence === 'number' && (
                  <Typography.Small style={{ color: colors.tint, marginTop: 6 }}>
                    Confidence: {Math.round(item.confidence * 100)}%
                  </Typography.Small>
                )}
                {item.timing && (
                  <Typography.Small style={{ color: colors.mutedForeground, marginTop: 2 }}>
                    Timing: {item.timing}
                  </Typography.Small>
                )}
                {item.tamil && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <Typography.P style={{ color: colors.mutedForeground, lineHeight: 22 }}>{item.tamil}</Typography.P>
                  </>
                )}
              </View>
            ))
          )}

          {/* Tip */}
          <View style={[styles.card, { borderColor: colors.tint, backgroundColor: colors.tint + '08' }]}>
            <Typography.P style={{ fontWeight: '700', color: colors.tint, marginBottom: 6 }}>💡 Tip of the Day</Typography.P>
            <Typography.P style={{ color: colors.foreground, lineHeight: 22 }}>
              Crop rotation helps maintain soil health and reduces pest build-up. Consider planting legumes after rice.
            </Typography.P>
          </View>
        </View>
      </ResponsiveContainer>
    </KeyboardResponsiveView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { fontWeight: '800', fontSize: 24, letterSpacing: -0.5 },
  content: { paddingHorizontal: 20, gap: 14 },
  loading: { marginTop: 80, alignItems: 'center' },
  card: { borderRadius: 12, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  divider: { height: 1, marginVertical: 10 },
});
