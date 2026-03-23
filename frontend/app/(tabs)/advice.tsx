import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Sprout, Lightbulb, CheckCircle2, ChevronRight, Info, AlertCircle, Bookmark, RefreshCcw } from 'lucide-react-native';
import { RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApi } from '@/hooks/use-api';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAppContext } from '@/context/AppProvider';

export default function AdviceScreen() {
  const colors = useThemeColors();
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
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <ThemedText type="title" style={styles.headerTitle}>Expert Advice</ThemedText>
          <TouchableOpacity onPress={fetchAdvice}>
            <RefreshCcw size={24} color={colors.tint} />
          </TouchableOpacity>
        </View>
        <ThemedText style={[styles.headerSubtitle, { color: colors.icon }]}>
          Personalized AI recommendations based on your crop and local weather.
        </ThemedText>
      </ThemedView>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchAdvice} tintColor={colors.tint} />
        }
      >
        {loading && adviceList.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText style={{ marginTop: 12, color: colors.icon }}>Generating farming insights...</ThemedText>
          </View>
        ) : (
          adviceList.map((item) => (
            <View key={item.id} style={[styles.adviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: colors.tint + '15' }]}>
                  <Sprout size={22} color={colors.tint} />
                </View>
                <ThemedText type="subtitle" style={[styles.cardTitle, { color: colors.text }]}>
                  {item.title}
                </ThemedText>
              </View>
              
              <View style={styles.cardBody}>
                <ThemedText style={[styles.adviceText, { color: colors.text }]}>
                  {item.text}
                </ThemedText>
                <View style={[styles.langDivider, { backgroundColor: colors.border }]} />
                <ThemedText style={[styles.tamilText, { color: colors.icon }]}>
                  {item.tamil}
                </ThemedText>
              </View>
              
              <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.tint }]}>
                <CheckCircle2 size={18} color={colors.tint} />
                <ThemedText style={[styles.actionBtnText, { color: colors.tint }]}>Mark as Read</ThemedText>
              </TouchableOpacity>
            </View>
          ))
        )}
        
        {/* Tip of the Day */}
        <View style={[styles.tipCard, { backgroundColor: colors.tint }]}>
          <View style={styles.tipHeader}>
            <Lightbulb size={24} color="#fff" />
            <ThemedText style={styles.tipLabel}>Tip of the Day</ThemedText>
          </View>
          <ThemedText style={styles.tipContent}>
            Crop rotation helps maintain soil health and reduces pest build-up. Consider planting legumes after rice.
          </ThemedText>
          <TouchableOpacity style={styles.learnMoreBtn}>
            <ThemedText style={styles.learnMoreText}>Learn more about crop rotation</ThemedText>
            <ChevronRight size={16} color="#fff" />
          </TouchableOpacity>
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
  content: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { marginTop: 80, alignItems: 'center' },
  adviceCard: { marginBottom: 20, padding: 24, borderRadius: 32, borderWidth: 1, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { marginLeft: 16, fontSize: 18, fontWeight: '700' },
  cardBody: { gap: 12, marginBottom: 20 },
  adviceText: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  langDivider: { height: 1, marginVertical: 4, opacity: 0.4 },
  tamilText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16, borderWidth: 1.5, gap: 10 },
  actionBtnText: { fontWeight: '700', fontSize: 15 },
  tipCard: { marginVertical: 20, padding: 28, borderRadius: 32, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  tipLabel: { color: '#fff', fontWeight: '800', fontSize: 20 },
  tipContent: { color: '#fff', fontSize: 16, lineHeight: 24, fontWeight: '500', opacity: 0.95 },
  learnMoreBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 4 },
  learnMoreText: { color: '#fff', fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
});
