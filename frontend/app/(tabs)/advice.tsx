import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Sprout, Lightbulb, CheckCircle2, ChevronRight, RefreshCcw } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '@/context/AppProvider';

export default function AdviceScreen() {
  const { colors } = useTheme();
  const { getAdvice, loading } = useApi();
  const { language } = useAppContext();
  const [adviceList, setAdviceList] = useState<any[]>([]);

  useEffect(() => {
    fetchAdvice();
  }, []);

  const fetchAdvice = async () => {
    const list = await getAdvice();
    setAdviceList(list);
  };

  return (
    <KeyboardResponsiveView 
      style={{ backgroundColor: colors.background }} 
      contentContainerStyle={styles.scrollContent}
      scrollViewProps={{
        refreshControl: (
          <RefreshControl refreshing={loading} onRefresh={fetchAdvice} tintColor={colors.tint} />
        )
      }}
    >
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.H1 style={styles.headerTitle}>Expert Advice</Typography.H1>
          <Button variant="ghost" size="icon" onPress={fetchAdvice}>
            <RefreshCcw size={24} color={colors.tint} />
          </Button>
        </View>
        <Typography.P style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          Personalized AI recommendations based on your crop and local weather.
        </Typography.P>
      </View>

      <View style={styles.content}>
        {loading && adviceList.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Typography.P style={{ marginTop: 12, color: colors.mutedForeground }}>
              Generating farming insights...
            </Typography.P>
          </View>
        ) : (
          adviceList.map((item) => (
            <Card key={item.id} style={styles.adviceCard}>
              <CardHeader style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: colors.tint + '15' }]}>
                  <Sprout size={22} color={colors.tint} />
                </View>
                <Typography.H3 style={styles.cardTitle}>
                  {item.title}
                </Typography.H3>
              </CardHeader>
              <CardContent style={styles.cardBody}>
                <Typography.P style={styles.adviceText}>
                  {item.text}
                </Typography.P>
                <View style={[styles.langDivider, { backgroundColor: colors.border }]} />
                <Typography.P style={[styles.tamilText, { color: colors.mutedForeground }]}>
                  {item.tamil}
                </Typography.P>
              </CardContent>
              <CardFooter>
                <Button variant="outline" style={styles.actionBtn}>
                  <CheckCircle2 size={18} color={colors.tint} />
                  <Typography.Small style={{ color: colors.tint, fontWeight: '700' }}>
                    Mark as Read
                  </Typography.Small>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        
        {/* Tip of the Day */}
        <Card style={[styles.tipCard, { backgroundColor: colors.tint, borderColor: colors.tint }]}>
          <CardHeader style={styles.tipHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Lightbulb size={24} color="#fff" />
              <Typography.H3 style={{ color: '#fff' }}>Tip of the Day</Typography.H3>
            </View>
          </CardHeader>
          <CardContent>
            <Typography.P style={{ color: '#fff', opacity: 0.9 }}>
              Crop rotation helps maintain soil health and reduces pest build-up. Consider planting legumes after rice.
            </Typography.P>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" style={styles.learnMoreBtn}>
              <Typography.Small style={{ color: '#fff', fontWeight: '700', textDecorationLine: 'underline' }}>
                Learn more about crop rotation
              </Typography.Small>
              <ChevronRight size={16} color="#fff" />
            </Button>
          </CardFooter>
        </Card>
      </View>
    </KeyboardResponsiveView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  header: { padding: 30, paddingTop: 60 },
  headerTitle: { letterSpacing: -1 },
  headerSubtitle: { marginTop: 4, fontWeight: '500' },
  content: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { marginTop: 80, alignItems: 'center' },
  adviceCard: { marginBottom: 20, borderRadius: 24 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16 },
  iconCircle: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { marginLeft: 16 },
  cardBody: { gap: 12 },
  adviceText: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  langDivider: { height: 1, marginVertical: 4, opacity: 0.4 },
  tamilText: { fontSize: 15, lineHeight: 22 },
  actionBtn: { flex: 1, flexDirection: 'row', gap: 10, borderRadius: 16, height: 48 },
  tipCard: { marginVertical: 20, borderRadius: 24, elevation: 4 },
  tipHeader: { paddingBottom: 12 },
  learnMoreBtn: { padding: 0, height: 'auto', gap: 4 },
});
