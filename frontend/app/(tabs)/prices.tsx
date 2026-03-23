import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Dimensions, RefreshControl } from 'react-native';
import { TrendingUp, TrendingDown, MapPin, Calendar, LayoutList, RefreshCcw, Info } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApi } from '@/hooks/use-api';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAppContext } from '@/context/AppProvider';

const CROPS = ['Rice', 'Tomato', 'Onion', 'Corn', 'Wheat', 'Coconut'];
const { width } = Dimensions.get('window');

export default function PricesScreen() {
  const colors = useThemeColors();
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
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.header}>
        <View style={styles.headerTop}>
          <ThemedText type="title" style={styles.headerTitle}>Market Prices</ThemedText>
          <TouchableOpacity onPress={() => fetchPrice(selectedCrop)}>
            <RefreshCcw size={24} color={colors.tint} />
          </TouchableOpacity>
        </View>
        <ThemedText style={[styles.headerSubtitle, { color: colors.icon }]}>
          Track real-time commodity prices in your local area.
        </ThemedText>
      </ThemedView>

      <View style={styles.selectorWrapper}>
        <FlatList
          horizontal
          data={CROPS}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedCrop(item)}
              style={[
                styles.cropTab,
                { 
                  backgroundColor: selectedCrop === item ? colors.tint : colors.card, 
                  borderColor: selectedCrop === item ? colors.tint : colors.border 
                }
              ]}
            >
              <ThemedText style={[
                styles.tabText, 
                { color: selectedCrop === item ? '#fff' : colors.text }
              ]}>
                {item}
              </ThemedText>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.selectorContent}
        />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => fetchPrice(selectedCrop)} tintColor={colors.tint} />
        }
      >
        {loading && !priceData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText style={{ marginTop: 12, color: colors.icon }}>Updating market data...</ThemedText>
          </View>
        ) : priceData ? (
          <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.priceHeader}>
              <View style={styles.cropInfo}>
                <ThemedText type="subtitle" style={[styles.cropName, { color: colors.text }]}>
                  {isTamil ? (priceData.tamil_crop || priceData.crop) : priceData.crop}
                </ThemedText>
                <View style={styles.marketRow}>
                  <MapPin size={14} color={colors.icon} />
                  <ThemedText style={[styles.marketName, { color: colors.icon }]}>
                    {isTamil ? (priceData.tamil_market || priceData.market) : priceData.market}
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.trendBadge, { backgroundColor: (priceData.trend === 'Up' || priceData.trend === 'Upward' ? colors.success : colors.notification) + '15' }]}>
                {(priceData.trend === 'Up' || priceData.trend === 'Upward') ? (
                  <TrendingUp size={16} color={colors.success} />
                ) : (
                  <TrendingDown size={16} color={colors.notification} />
                )}
                <ThemedText style={[styles.trendText, { color: (priceData.trend === 'Up' || priceData.trend === 'Upward') ? colors.success : colors.notification }]}>
                  {priceData.trend}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.priceMain}>
              <View style={styles.priceRow}>
                <ThemedText style={[styles.currency, { color: colors.icon }]}>₹</ThemedText>
                <ThemedText style={[styles.priceVal, { color: colors.text }]}>{priceData.price_per_kg}</ThemedText>
              </View>
              <ThemedText style={[styles.unitText, { color: colors.icon }]}>per {priceData.unit === 'INR' ? 'kg' : priceData.unit?.toLowerCase() || 'kg'}</ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.footerRow}>
              <View style={styles.infoRow}>
                <Calendar size={16} color={colors.icon} />
                <ThemedText style={[styles.infoText, { color: colors.icon }]}>Verified: Today</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <RefreshCcw size={16} color={colors.icon} />
                <ThemedText style={[styles.infoText, { color: colors.icon }]}>Daily Update</ThemedText>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Info size={40} color={colors.icon} />
            <ThemedText style={[styles.emptyText, { color: colors.icon }]}>No live market data available for this crop.</ThemedText>
          </View>
        )}

        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <LayoutList size={20} color={colors.icon} />
            <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.text }]}>Historical Trend</ThemedText>
          </View>
          <View style={[styles.chartPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ThemedText style={[styles.placeholderText, { color: colors.icon }]}>Analytics dashboard coming soon</ThemedText>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 30, paddingTop: 70, backgroundColor: 'transparent' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  headerSubtitle: { fontSize: 16, marginTop: 4, fontWeight: '500' },
  selectorWrapper: { marginVertical: 12 },
  selectorContent: { paddingHorizontal: 20 },
  cropTab: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 20, marginRight: 12, borderWidth: 1, elevation: 1 },
  tabText: { fontSize: 15, fontWeight: '700' },
  content: { flex: 1 },
  loadingContainer: { marginTop: 80, alignItems: 'center' },
  priceCard: { margin: 20, padding: 28, borderRadius: 32, borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  priceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cropInfo: { gap: 4 },
  cropName: { fontSize: 24, fontWeight: '800' },
  marketRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  marketName: { fontSize: 14, fontWeight: '500' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
  trendText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  priceMain: { alignItems: 'center', marginVertical: 32 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end' },
  currency: { fontSize: 32, fontWeight: '500', marginBottom: 8, marginRight: 4 },
  priceVal: { fontSize: 72, fontWeight: '800', letterSpacing: -2 },
  unitText: { fontSize: 16, fontWeight: '500', marginTop: 4 },
  divider: { height: 1, marginVertical: 24, opacity: 0.4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { marginTop: 100, alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', marginTop: 16, fontSize: 16, lineHeight: 22 },
  historySection: { paddingHorizontal: 20, marginTop: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 20 },
  chartPlaceholder: { height: 160, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 14, fontWeight: '500' },
});
