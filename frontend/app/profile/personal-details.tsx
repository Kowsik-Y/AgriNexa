import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
    User, MapPin, Sprout, ChevronLeft,
    Edit3, Globe, Tractor, Beaker, CircleDot
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Typography } from '@/components/ui/Typography';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { Spinner } from '@/components/ui/Spinner';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useTheme } from '@/hooks/use-theme';

export default function PersonalDetailsScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profileStr = await AsyncStorage.getItem('user_profile');
                if (profileStr) {
                    setProfile(JSON.parse(profileStr));
                }
            } catch (e) {
                console.error('Error loading profile:', e);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <Spinner size={40} color={colors.tint} />
            </View>
        );
    }

    return (
        <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
            <ResponsiveContainer>
                <View style={styles.header}>
                    <Button variant="ghost" size="icon" onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={28} color={colors.foreground} />
                    </Button>
                    <Typography.H2 style={styles.title}>Personal Details</Typography.H2>
                    <Button variant="ghost" size="icon" onPress={() => router.push('/profile/edit-profile')} style={styles.editBtn}>
                        <Edit3 size={24} color={colors.tint} />
                    </Button>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
                    <DetailSection title="Basic Information" icon={User}>
                        <Card>
                            <CardContent style={styles.cardContent}>
                                <InfoRow label="Full Name" value={profile?.name || 'Not set'} />
                                <Separator />
                                <InfoRow label="App Language" value={profile?.appLang || 'English'} />
                            </CardContent>
                        </Card>
                    </DetailSection>

                    <DetailSection title="Farm Location" icon={MapPin}>
                        <Card>
                            <CardContent style={styles.cardContent}>
                                <InfoRow label="Village / Town" value={profile?.village || 'Not set'} icon={CircleDot} />
                                <Separator />
                                <InfoRow label="District" value={profile?.district || 'Not set'} icon={MapPin} />
                                <Separator />
                                <InfoRow label="State" value={profile?.state || 'Not set'} icon={Globe} />
                            </CardContent>
                        </Card>
                    </DetailSection>

                    <DetailSection title="Agriculture Profile" icon={Tractor}>
                        <Card>
                            <CardContent style={styles.cardContent}>
                                <InfoRow label="Primary Crops" value={profile?.crops || 'Not set'} icon={Sprout} />
                                <Separator />
                                <View style={styles.row}>
                                    <Typography.P style={styles.label}>Farming Stage</Typography.P>
                                    <Badge variant="secondary">{profile?.flow_stage || 'Land Preparation'}</Badge>
                                </View>
                            </CardContent>
                        </Card>
                    </DetailSection>

                    <DetailSection title="Soil Health Data" icon={Beaker}>
                        <Card>
                            <CardContent style={styles.gridCard}>
                                <View style={styles.grid}>
                                    <GridItem label="Nitrogen (N)" value={profile?.nitrogen} unit="mg/kg" />
                                    <GridItem label="Phosphorus (P)" value={profile?.phosphorus} unit="mg/kg" />
                                    <GridItem label="Potassium (K)" value={profile?.potassium} unit="mg/kg" />
                                    <GridItem label="Soil pH" value={profile?.ph} unit="pH" />
                                </View>
                            </CardContent>
                        </Card>
                    </DetailSection>

                    <Button
                        onPress={() => router.push('/profile/edit-profile')}
                        style={styles.bottomEditBtn}
                    >
                        <Edit3 size={20} color={colors.primaryForeground} />
                        <Typography.Large style={{ color: colors.primaryForeground }}>Edit Details</Typography.Large>
                    </Button>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </ResponsiveContainer>
        </KeyboardResponsiveView>
    );
}

const DetailSection = ({ title, icon: Icon, children }: any) => {
    const { colors } = useTheme();
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Icon size={20} color={colors.tint} />
                <Typography.H4 style={{ marginLeft: 8, color: colors.mutedForeground, letterSpacing: 0.5 }}>{title.toUpperCase()}</Typography.H4>
            </View>
            {children}
        </View>
    );
};

const InfoRow = ({ label, value, icon: Icon }: any) => {
    const { colors } = useTheme();
    return (
        <View style={styles.row}>
            <View style={{ flex: 1 }}>
                <Typography.Small style={styles.label}>{label}</Typography.Small>
                <Typography.P style={styles.value}>{value}</Typography.P>
            </View>
            {Icon && <Icon size={18} color={colors.mutedForeground} opacity={0.5} />}
        </View>
    );
};

const GridItem = ({ label, value, unit }: any) => {
    const { colors } = useTheme();
    return (
        <View style={styles.gridItem}>
            <Typography.Small style={{ color: colors.mutedForeground, textAlign: 'center' }}>{label}</Typography.Small>
            <Typography.H3 style={{ marginTop: 4, textAlign: 'center' }}>{value || '--'}</Typography.H3>
            <Typography.Muted style={{ fontSize: 10, textAlign: 'center' }}>{unit}</Typography.Muted>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 20
    },
    backBtn: { width: 44, height: 44 },
    editBtn: { width: 44, height: 44 },
    title: { letterSpacing: -1 },
    scrollBody: { paddingHorizontal: 20 },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: 8 },
    cardContent: { paddingVertical: 8 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 4
    },
    label: { opacity: 0.6, marginBottom: 2 },
    value: { fontWeight: '700' },
    gridCard: { padding: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
    gridItem: { width: '45%', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.02)' },
    bottomEditBtn: { borderRadius: 18, height: 56, gap: 12, marginTop: 10 },
});
