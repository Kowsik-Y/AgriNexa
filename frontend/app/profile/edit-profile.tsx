import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
    User, MapPin, Sprout, ChevronLeft, Save,
    CircleDot, Globe, Tractor, CheckCircle2
} from 'lucide-react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { Typography } from '@/components/ui/Typography';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { Spinner } from '@/components/ui/Spinner';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useTheme } from '@/hooks/use-theme';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/components/ui/Toast';

const FLOW_STAGES = [
    'Land Preparation',
    'Sowing',
    'Vegetative',
    'Flowering',
    'Harvesting',
    'Marketing'
];

export default function EditProfileScreen() {
    const { colors } = useTheme();
    const { toast } = useToast();
    const router = useRouter();
    const { saveProfileRemote } = useApi();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile State
    const [name, setName] = useState('');
    const [village, setVillage] = useState('');
    const [district, setDistrict] = useState('');
    const [state, setState] = useState('');
    const [mainCrops, setMainCrops] = useState('');
    const [flowStage, setFlowStage] = useState('');
    const [nitrogen, setNitrogen] = useState('');
    const [phosphorus, setPhosphorus] = useState('');
    const [potassium, setPotassium] = useState('');
    const [ph, setPh] = useState('');

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profileStr = await AsyncStorage.getItem('user_profile');
                if (profileStr) {
                    const p = JSON.parse(profileStr);
                    setName(p.name || '');
                    setVillage(p.village || '');
                    setDistrict(p.district || '');
                    setState(p.state || '');
                    setMainCrops(p.crops || '');
                    setFlowStage(p.flow_stage || 'Land Preparation');
                    setNitrogen(String(p.nitrogen || '80'));
                    setPhosphorus(String(p.phosphorus || '40'));
                    setPotassium(String(p.potassium || '40'));
                    setPh(String(p.ph || '6.5'));
                }
            } catch (e) {
                console.error('Error loading profile:', e);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleGetLocation = async () => {
        setSaving(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                toast({ title: 'Permission Denied', description: 'Location access is required.', type: 'warning' });
                return;
            }

            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            let detectedVillage = '';
            let detectedDistrict = '';
            let detectedState = '';

            if (Platform.OS === 'web') {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${loc.coords.latitude}&lon=${loc.coords.longitude}`);
                const data = await res.json();
                console.log('Web Geocoding Data:', data);
                if (data.address) {
                    detectedVillage = data.address.suburb || data.address.village || data.address.town || data.address.neighbourhood || '';
                    detectedDistrict = data.address.county || data.address.city_district || data.address.city || '';
                    detectedState = data.address.state || '';
                }
            } else {
                const reverse = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude
                });

                if (reverse.length > 0) {
                    const place = reverse[0];
                    console.log('Detailed Location JSON:', JSON.stringify(place));
                    detectedVillage = place.name || place.city || place.street || '';
                    detectedDistrict = place.district || place.subregion || place.city || '';
                    detectedState = place.region || '';
                }
            }

            if (detectedVillage || detectedDistrict || detectedState) {
                setVillage(detectedVillage);
                setDistrict(detectedDistrict);
                setState(detectedState);

                toast({
                    title: 'Location updated',
                    description: `Set to ${detectedVillage || detectedDistrict}`,
                    type: 'success'
                });
            } else {
                toast({ title: 'Location Error', description: 'Could not resolve location address.', type: 'warning' });
            }
        } catch (e) {
            console.error('Location error:', e);
            toast({ title: 'Error', description: 'Could not fetch location.', type: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const sessionStr = await AsyncStorage.getItem('user_session');
            const session = sessionStr ? JSON.parse(sessionStr) : null;

            if (!session) {
                toast({ title: 'Error', description: 'Session not found. Please login again.', type: 'destructive' });
                return;
            }

            const updatedProfile = {
                user_id: session.id,
                name,
                village,
                district,
                state,
                crops: mainCrops,
                flow_stage: flowStage,
                nitrogen: parseFloat(nitrogen),
                phosphorus: parseFloat(phosphorus),
                potassium: parseFloat(potassium),
                ph: parseFloat(ph),
                onboarded: true
            };

            await saveProfileRemote(updatedProfile);
            await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));

            toast({ title: 'Profile Updated', description: 'Your changes have been saved successfully.', type: 'success' });
            router.back();
        } catch (e) {
            console.error('Error saving profile:', e);
            toast({ title: 'Save Failed', description: 'An error occurred while saving your profile.', type: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

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
                    <Typography.H2 style={styles.title}>Edit Profile</Typography.H2>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
                    <Section title="Personal Information" icon={User}>
                        <Input
                            placeholder="Full Name"
                            value={name}
                            onChangeText={setName}
                            leftIcon={<User size={20} color={colors.mutedForeground} />}
                        />
                    </Section>

                    <Section title="Farm Location" icon={MapPin}>
                        <Button
                            variant="outline"
                            onPress={handleGetLocation}
                            disabled={saving}
                            style={styles.locationBtn}
                        >
                            <MapPin size={20} color={colors.tint} />
                            <Typography.Large style={{ color: colors.tint }}>Auto-detect Location</Typography.Large>
                        </Button>
                        <View style={styles.inputStack}>
                            <Input
                                placeholder="Village"
                                value={village}
                                onChangeText={setVillage}
                                leftIcon={<CircleDot size={20} color={colors.mutedForeground} />}
                            />
                            <Input
                                placeholder="District"
                                value={district}
                                onChangeText={setDistrict}
                                leftIcon={<MapPin size={20} color={colors.mutedForeground} />}
                            />
                            <Input
                                placeholder="State"
                                value={state}
                                onChangeText={setState}
                                leftIcon={<Globe size={20} color={colors.mutedForeground} />}
                            />
                            <Input
                                placeholder="Main Crops"
                                value={mainCrops}
                                onChangeText={setMainCrops}
                                leftIcon={<Sprout size={20} color={colors.mutedForeground} />}
                            />
                        </View>
                    </Section>

                    <Section title="Farming Stage" icon={Tractor}>
                        <View style={styles.flowStages}>
                            {FLOW_STAGES.map((s) => (
                                <Pressable
                                    key={s}
                                    onPress={() => setFlowStage(s)}
                                    android_ripple={{ color: colors.tint + '30' }}
                                    style={({ pressed }) => [
                                        styles.stageItem,
                                        { borderColor: flowStage === s ? colors.tint : colors.border },
                                        flowStage === s && { backgroundColor: colors.tint + '10' },
                                        pressed && { opacity: 0.7 }
                                    ]}
                                >
                                    <Typography.Small style={{ color: flowStage === s ? colors.tint : colors.foreground, fontWeight: '600' }}>
                                        {s}
                                    </Typography.Small>
                                    {flowStage === s && <CheckCircle2 size={16} color={colors.tint} />}
                                </Pressable>
                            ))}
                        </View>
                    </Section>

                    <Section title="Soil Data" icon={Sprout}>
                        <View style={styles.grid}>
                            <View style={styles.gridItem}>
                                <Typography.Small style={styles.inputLabel}>Nitrogen (N)</Typography.Small>
                                <Input placeholder="e.g. 80" value={nitrogen} onChangeText={setNitrogen} keyboardType="numeric" />
                            </View>
                            <View style={styles.gridItem}>
                                <Typography.Small style={styles.inputLabel}>Phosphorus (P)</Typography.Small>
                                <Input placeholder="e.g. 40" value={phosphorus} onChangeText={setPhosphorus} keyboardType="numeric" />
                            </View>
                            <View style={styles.gridItem}>
                                <Typography.Small style={styles.inputLabel}>Potassium (K)</Typography.Small>
                                <Input placeholder="e.g. 40" value={potassium} onChangeText={setPotassium} keyboardType="numeric" />
                            </View>
                            <View style={styles.gridItem}>
                                <Typography.Small style={styles.inputLabel}>Soil pH</Typography.Small>
                                <Input placeholder="e.g. 6.5" value={ph} onChangeText={setPh} keyboardType="numeric" />
                            </View>
                        </View>
                    </Section>

                    <Button
                        onPress={handleSave}
                        loading={saving}
                        disabled={saving}
                        style={styles.saveBtn}
                    >
                        <Save size={20} color={colors.primaryForeground} />
                        <Typography.Large style={{ color: colors.primaryForeground }}>Save Changes</Typography.Large>
                    </Button>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </ResponsiveContainer>
        </KeyboardResponsiveView>
    );
}

const Section = ({ title, icon: Icon, children }: any) => {
    const { colors } = useTheme();
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Icon size={20} color={colors.tint} />
                <Typography.H4 style={{ marginLeft: 8 }}>{title}</Typography.H4>
            </View>
            {children}
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
    title: { letterSpacing: -1 },
    scrollBody: { paddingHorizontal: 24 },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    locationBtn: { marginBottom: 16, borderRadius: 16, height: 48, gap: 8 },
    inputStack: { gap: 16 },
    flowStages: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    stageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: '45%'
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    gridItem: { width: '45%' },
    inputLabel: { marginBottom: 4, marginLeft: 4, color: '#666' },
    saveBtn: { borderRadius: 18, height: 56, gap: 12, marginTop: 10 },
});
