import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, CloudSun, ShieldAlert, TrendingUp, Tractor, Tablet } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/components/ui/Toast';
import { useAppContext } from '@/context/AppProvider';

export default function NotificationSettingsScreen() {
    const { colors } = useTheme();
    const { toast } = useToast();
    const { notifications, updateNotificationSetting } = useAppContext();
    const router = useRouter();

    const toggleSetting = (key: string) => {
        const val = !(notifications as any)[key];
        updateNotificationSetting(key, val);

        if (key === 'enabled' && !val) {
            toast({
                title: 'Notifications Disabled',
                description: 'You will no longer receive real-time alerts.',
                type: 'warning'
            });
        }
    };

    return (
        <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent}>
            <ResponsiveContainer>
                <View style={styles.header}>
                    <Button variant="ghost" size="icon" onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={28} color={colors.foreground} />
                    </Button>
                    <View style={styles.headerText}>
                        <Typography.H3 style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Typography.H3>
                        <Typography.Small style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>Alerts and reminders</Typography.Small>
                    </View>
                </View>

                <View style={styles.content}>
                    <View style={styles.section}>
                        <SettingsSection
                            title="MASTER SWITCH"
                            rows={[
                                {
                                    kind: 'switch',
                                    icon: Bell,
                                    label: 'Push Notifications',
                                    description: 'Allow AgriNexa to send you alerts',
                                    color: colors.tint,
                                    checked: notifications.enabled,
                                    onCheckedChange: () => toggleSetting('enabled'),
                                },
                            ]}
                        />
                    </View>

                    <View style={styles.section}>
                        <SettingsSection
                            title="ALERT PREFERENCES"
                            rows={[
                                {
                                    kind: 'switch',
                                    icon: CloudSun,
                                    label: 'Weather Alerts',
                                    description: 'Storms, rain, and temperature shifts',
                                    color: '#64748B',
                                    checked: notifications.weather,
                                    onCheckedChange: () => toggleSetting('weather'),
                                    disabled: !notifications.enabled,
                                },
                                {
                                    kind: 'switch',
                                    icon: ShieldAlert,
                                    label: 'Pest & Disease',
                                    description: 'Local outbreaks and risk levels',
                                    color: '#64748B',
                                    checked: notifications.pest,
                                    onCheckedChange: () => toggleSetting('pest'),
                                    disabled: !notifications.enabled,
                                },
                                {
                                    kind: 'switch',
                                    icon: TrendingUp,
                                    label: 'Market Prices',
                                    description: 'Daily updates on your key crops',
                                    color: '#64748B',
                                    checked: notifications.price,
                                    onCheckedChange: () => toggleSetting('price'),
                                    disabled: !notifications.enabled,
                                },
                                {
                                    kind: 'switch',
                                    icon: Tractor,
                                    label: 'Agri Flow',
                                    description: 'Task reminders and stage updates',
                                    color: '#64748B',
                                    checked: notifications.agriFlow,
                                    onCheckedChange: () => toggleSetting('agriFlow'),
                                    disabled: !notifications.enabled,
                                },
                            ]}
                        />
                    </View>

                    <View style={styles.footer}>
                        <Tablet size={20} color={colors.mutedForeground} />
                        <Typography.Muted style={{ textAlign: 'center' }}>
                            We respect your focus. AgriNexa only sends critical alerts to help you manage your farm effectively.
                        </Typography.Muted>
                    </View>
                </View>
            </ResponsiveContainer>
        </KeyboardResponsiveView>
    );
}

const styles = StyleSheet.create({
    scrollContent: { paddingBottom: 40 },
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
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    section: { marginBottom: 8 },
    footer: { marginTop: 24, alignItems: 'center', paddingHorizontal: 20, gap: 12, opacity: 0.7 },
});
