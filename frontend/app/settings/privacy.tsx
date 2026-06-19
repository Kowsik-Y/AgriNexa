import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
    ChevronLeft, Shield, Lock, Trash2,
    Eye, Smartphone, Scroll
} from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { useTheme } from '@/hooks/use-theme';

export default function PrivacySecurityScreen() {
    const { colors } = useTheme();
    const router = useRouter();

    return (
        <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
            <ResponsiveContainer>
                <View style={styles.header}>
                    <Button variant="ghost" size="icon" onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={28} color={colors.foreground} />
                    </Button>
                    <View style={styles.headerText}>
                        <Typography.H3 style={[styles.headerTitle, { color: colors.foreground }]}>Privacy & Security</Typography.H3>
                        <Typography.Small style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>Account protection controls</Typography.Small>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
                    <View style={styles.section}>
                        <SettingsSection
                            title="SECURITY"
                            rows={[
                                { icon: Lock, label: 'Change Password', color: '#3B82F6', onPress: () => router.push('/settings/change-password') },
                                { icon: Smartphone, label: 'Manage Devices', color: '#3B82F6', value: '1 Active' },
                                { icon: Eye, label: 'Login Activity', color: '#3B82F6' },
                            ]}
                        />
                    </View>

                    <View style={styles.section}>
                        <SettingsSection
                            title="PRIVACY"
                            rows={[
                                { icon: Shield, label: 'Data Privacy', description: 'Manage your data usage', color: '#3B82F6' },
                                { icon: Scroll, label: 'Privacy Policy', color: '#3B82F6' },
                            ]}
                        />
                    </View>

                    <View style={styles.section}>
                        <Typography.Small style={styles.sectionTitle}>DANGER ZONE</Typography.Small>
                        <Card style={{ borderColor: colors.destructive + '40' }}>
                            <CardContent style={{ padding: 0 }}>
                                <Button variant="ghost" style={styles.dangerBtn}>
                                    <View style={styles.itemLeft}>
                                        <View style={[styles.iconBox, { backgroundColor: colors.destructive + '10' }]}>
                                            <Trash2 size={20} color={colors.destructive} />
                                        </View>
                                        <View>
                                            <Typography.P style={{ fontWeight: '600', color: colors.destructive }}>Delete Account</Typography.P>
                                            <Typography.Small style={{ color: colors.mutedForeground }}>Permanently erase your data</Typography.Small>
                                        </View>
                                    </View>
                                </Button>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 20,
    },
    backBtn: { width: 40, height: 40, borderRadius: 12 },
    headerText: { gap: 1 },
    headerTitle: { fontWeight: '800', letterSpacing: -0.2, lineHeight: 30 },
    headerSubtitle: { lineHeight: 18 },
    scrollBody: { paddingHorizontal: 20, paddingTop: 20 },
    section: { marginBottom: 8 },
    sectionTitle: { letterSpacing: 1.5, marginTop: 16, marginBottom: 4, marginLeft: 4, fontWeight: '800', opacity: 0.6 },
    dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingVertical: 18, paddingHorizontal: 16, height: 'auto' },
    itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
