import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { TrendingUp, TrendingDown, MapPin, Calendar, LayoutList, RefreshCcw, Info } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { Separator } from '@/components/ui/Separator';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '@/context/AppProvider';

const CROPS = ['Rice', 'Tomato', 'Onion', 'Corn', 'Wheat', 'Coconut'];

export default function PricesScreen() {
  const { colors } = useTheme();
  const { getPrices, loading } = useApi();
  const { language } = useAppContext();
  const isTamil = language === 'Tamil';
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const [priceData, setPriceData] = useState<any>(null);

  useEffect(() => {
    fetchPrice(selectedCrop);
  }, [selectedCrop]);

  const fetchPrice = async (crop: string) => {
    const res = await getPrices(crop);
    setPriceData(res);
  };

  return (
    <KeyboardResponsiveView 
      style={{ backgroundColor: colors.background }} 
      contentContainerStyle={styles.scrollContent}
      scrollViewProps={{
        refreshControl: (
          <RefreshControl refreshing={loading} onRefresh={() => fetchPrice(selectedCrop)} tintColor={colors.tint} />
        )
      }}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Typography.H1 style={styles.headerTitle}>Market Prices</Typography.H1>
          <Button variant="ghost" size="icon" onPress={() => fetchPrice(selectedCrop)}>
            <RefreshCcw size={24} color={colors.tint} />
          </Button>
        </View>
        <Typography.P style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          Track real-time commodity prices in your local area.
        </Typography.P>
      </View>

      <View style={styles.selectorWrapper}>
        <FlatList
          horizontal
          data={CROPS}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Button
              variant={selectedCrop === item ? 'default' : 'outline'}
              onPress={() => setSelectedCrop(item)}
              style={styles.cropTab}
            >
              <Typography.P style={{ 
                color: selectedCrop === item ? '#fff' : colors.foreground,
                fontWeight: '700'
              }}>
                {item}
              </Typography.P>
            </Button>
          )}
          contentContainerStyle={styles.selectorContent}
        />
      </View>

      <View style={styles.content}>
        {loading && !priceData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Typography.P style={{ marginTop: 12, color: colors.mutedForeground }}>
              Updating market data...
            </Typography.P>
          </View>
        ) : priceData ? (
          <Card style={styles.priceCard}>
            <CardHeader style={styles.priceHeader}>
              <View style={styles.cropInfo}>
                <Typography.H3 style={styles.cropName}>
                  {isTamil ? (priceData.tamil_crop || priceData.crop) : priceData.crop}
                </Typography.H3>
                <View style={styles.marketRow}>
                  <MapPin size={14} color={colors.mutedForeground} />
                  <Typography.Muted>
                    {isTamil ? (priceData.tamil_market || priceData.market) : priceData.market}
                  </Typography.Muted>
                </View>
              </View>
              <Badge variant={(priceData.trend === 'Up' || priceData.trend === 'Upward') ? 'default' : 'destructive'} style={styles.trendBadge}>
                {(priceData.trend === 'Up' || priceData.trend === 'Upward') ? (
                  <TrendingUp size={14} color="#fff" />
                ) : (
                  <TrendingDown size={14} color="#fff" />
                )}
                <Typography.Small style={{ color: '#fff', fontWeight: '800', marginLeft: 4, textTransform: 'uppercase' }}>
                  {priceData.trend}
                </Typography.Small>
              </Badge>
            </CardHeader>
            
            <CardContent>
              <View style={styles.priceMain}>
                <View style={styles.priceRow}>
                  <Typography.H1 style={styles.currency}>₹</Typography.H1>
                  <Typography.H1 style={styles.priceVal}>{priceData.price_per_kg}</Typography.H1>
                </View>
                <Typography.P style={{ color: colors.mutedForeground, fontWeight: '500' }}>
                  per {priceData.unit === 'INR' ? 'kg' : priceData.unit?.toLowerCase() || 'kg'}
                </Typography.P>
              </View>

              <Separator style={{ marginVertical: 24 }} />

              <View style={styles.footerRow}>
                <View style={styles.infoRow}>
                  <Calendar size={16} color={colors.mutedForeground} />
                  <Typography.Muted>Verified: Today</Typography.Muted>
                </View>
                <View style={styles.infoRow}>
                  <RefreshCcw size={16} color={colors.mutedForeground} />
                  <Typography.Muted>Daily Update</Typography.Muted>
                </View>
              </View>
            </CardContent>
          </Card>
        ) : (
          <View style={styles.emptyContainer}>
            <Info size={40} color={colors.mutedForeground} />
            <Typography.P style={styles.emptyText}>
              No live market data available for this crop.
            </Typography.P>
          </View>
        )}

        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <LayoutList size={20} color={colors.mutedForeground} />
            <Typography.H3 style={styles.sectionTitle}>Historical Trend</Typography.H3>
          </View>
          <Card style={styles.chartPlaceholder}>
            <Typography.Muted>Analytics dashboard coming soon</Typography.Muted>
          </Card>
        </View>
      </View>
    </KeyboardResponsiveView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  header: { padding: 30, paddingTop: 60 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { letterSpacing: -1 },
  headerSubtitle: { marginTop: 4, fontWeight: '500' },
  selectorWrapper: { marginVertical: 12 },
  selectorContent: { paddingHorizontal: 20, gap: 12 },
  cropTab: { height: 44, borderRadius: 22, paddingHorizontal: 20 },
  content: { flex: 1 },
  loadingContainer: { marginTop: 80, alignItems: 'center' },
  priceCard: { margin: 20, borderRadius: 32 },
  priceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 24 },
  cropInfo: { gap: 4 },
  cropName: { fontWeight: '800' },
  marketRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  priceMain: { alignItems: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  currency: { fontSize: 32, marginBottom: 16 },
  priceVal: { fontSize: 72, letterSpacing: -2 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyContainer: { marginTop: 100, alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', marginTop: 16, fontSize: 16, lineHeight: 22, color: '#666' },
  historySection: { paddingHorizontal: 20, marginTop: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 20 },
  chartPlaceholder: { height: 160, borderRadius: 24, borderStyle: 'dashed', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
