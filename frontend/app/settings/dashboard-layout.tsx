import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
    ChevronLeft, LayoutGrid, GripVertical,
    Save, Info
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Typography } from '@/components/ui/Typography';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/components/ui/Toast';

export default function DashboardLayoutScreen() {
    const { colors } = useTheme();
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
        setLayout(layout.map(item =>
            item.id === id ? { ...item, visible: !item.visible } : item
        ));
    };

    const handleSave = async () => {
        await AsyncStorage.setItem('dashboard_layout', JSON.stringify(layout));
        toast({ title: 'Layout Saved', description: 'Your dashboard has been updated.', type: 'success' });
        router.back();
    };

    return (
        <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
            <ResponsiveContainer>
                <View style={styles.header}>
                    <Button variant="ghost" size="icon" onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={28} color={colors.foreground} />
                    </Button>
                    <Typography.H1 style={styles.title}>Dashboard Layout</Typography.H1>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
                    <View style={styles.intro}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.tint + '10' }]}>
                            <LayoutGrid size={32} color={colors.tint} />
                        </View>
                        <Typography.P style={styles.introText}>
                            Customize your home screen by choosing which modules you want to see.
                        </Typography.P>
                    </View>

                    <View style={styles.section}>
                        <Typography.Small style={styles.sectionTitle}>ACTIVE MODULES</Typography.Small>
                        <Card>
                            <CardContent style={{ padding: 0 }}>
                                {layout.map((item, index) => (
                                    <View key={item.id} style={[styles.itemRow, index < layout.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border + '50' }]}>
                                        <View style={styles.itemLeft}>
                                            <GripVertical size={20} color={colors.mutedForeground} opacity={0.5} />
                                            <Typography.P style={{ fontWeight: '600' }}>{item.label}</Typography.P>
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

                    <View style={styles.tip}>
                        <Info size={18} color={colors.tint} />
                        <Typography.Small style={{ flex: 1, color: colors.mutedForeground }}>
                            Tip: Turning off modules you don&apos;t use can make the app load faster and use less data.
                        </Typography.Small>
                    </View>

                    <Button style={styles.saveBtn} onPress={handleSave}>
                        <Save size={20} color={colors.primaryForeground} />
                        <Typography.Large style={{ color: colors.primaryForeground, fontWeight: '700' }}>Apply Changes</Typography.Large>
                    </Button>
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
    intro: { alignItems: 'center', marginTop: 20, marginBottom: 32, gap: 12 },
    iconCircle: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    introText: { textAlign: 'center', opacity: 0.7, paddingHorizontal: 30 },
    section: { gap: 12 },
    sectionTitle: { letterSpacing: 1.5, marginBottom: 4, marginLeft: 4, fontWeight: '800', opacity: 0.6 },
    itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20, paddingHorizontal: 20 },
    itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tip: { flexDirection: 'row', gap: 12, marginTop: 24, paddingHorizontal: 12, alignItems: 'center' },
    saveBtn: { marginTop: 40, height: 56, borderRadius: 18, gap: 12 },
});
