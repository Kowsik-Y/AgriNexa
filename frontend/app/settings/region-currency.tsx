import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Globe, Banknote, Check } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '@/context/AppProvider';

export default function RegionCurrencyScreen() {
    const { colors } = useTheme();
    const { region, currency, setRegion, setCurrency } = useAppContext();
    const router = useRouter();

    const regions = ['India', 'Sri Lanka', 'Bangladesh', 'Nepal'];
    const currencies = [
        { code: 'INR', name: 'Indian Rupee (₹)' },
        { code: 'USD', name: 'US Dollar ($)' },
        { code: 'LKR', name: 'Sri Lankan Rupee (₨)' },
        { code: 'BDT', name: 'Bangladeshi Taka (৳)' }
    ];

    return (
        <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
            <ResponsiveContainer>
                <View style={styles.header}>
                    <Button variant="ghost" size="icon" onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={28} color={colors.foreground} />
                    </Button>
                    <Typography.H1 style={styles.title}>Region & Currency</Typography.H1>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Globe size={20} color={colors.tint} />
                            <Typography.Small style={styles.sectionTitle}>SELECT REGION</Typography.Small>
                        </View>
                        <Card>
                            <CardContent style={{ padding: 0 }}>
                                {regions.map((r, i) => (
                                    <View key={r}>
                                        <Button
                                            variant="ghost"
                                            style={styles.selectBtn}
                                            onPress={() => setRegion(r)}
                                        >
                                            <Typography.P style={{ fontWeight: region === r ? '700' : '400' }}>{r}</Typography.P>
                                            {region === r && <Check size={20} color={colors.tint} />}
                                        </Button>
                                        {i < regions.length - 1 && <Separator />}
                                    </View>
                                ))}
                            </CardContent>
                        </Card>
                        <Typography.Muted style={styles.infoText}>
                            Your region determines the market price data sources and local news.
                        </Typography.Muted>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Banknote size={20} color={colors.tint} />
                            <Typography.Small style={styles.sectionTitle}>PREFERRED CURRENCY</Typography.Small>
                        </View>
                        <Card>
                            <CardContent style={{ padding: 0 }}>
                                {currencies.map((c, i) => (
                                    <View key={c.code}>
                                        <Button
                                            variant="ghost"
                                            style={styles.selectBtn}
                                            onPress={() => setCurrency(c.code)}
                                        >
                                            <View>
                                                <Typography.P style={{ fontWeight: currency === c.code ? '700' : '400' }}>{c.name}</Typography.P>
                                                <Typography.Small style={{ color: colors.mutedForeground }}>{c.code}</Typography.Small>
                                            </View>
                                            {currency === c.code && <Check size={20} color={colors.tint} />}
                                        </Button>
                                        {i < currencies.length - 1 && <Separator />}
                                    </View>
                                ))}
                            </CardContent>
                        </Card>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </ResponsiveContainer>
        </KeyboardResponsiveView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20, gap: 12 },
    backBtn: { width: 44, height: 44 },
    title: { letterSpacing: -1 },
    scrollBody: { paddingHorizontal: 20 },
    section: { marginTop: 32 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginLeft: 8 },
    sectionTitle: { letterSpacing: 1.5, fontWeight: '800', opacity: 0.6 },
    selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 20, height: 'auto' },
    infoText: { marginTop: 12, marginLeft: 8, fontSize: 13, lineHeight: 18 },
});
