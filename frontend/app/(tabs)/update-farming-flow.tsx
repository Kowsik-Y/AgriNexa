import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';

const STAGES = [
    'land_preparation',
    'sowing',
    'vegetative',
    'flowering',
    'harvest',
    'post_harvest',
];

export default function UpdateFarmingFlowScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { updateFarmingFlow, error } = useApi();

    const [fieldName, setFieldName] = useState('Primary Field');
    const [location, setLocation] = useState('');
    const [crop, setCrop] = useState('Rice');
    const [flowStage, setFlowStage] = useState('vegetative');
    const [growthStageDay, setGrowthStageDay] = useState('30');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [locating, setLocating] = useState(false);

    const extractFirstCrop = (value: any): string => {
        if (Array.isArray(value) && value.length > 0) {
            return String(value[0]).trim();
        }
        if (typeof value === 'string') {
            const first = value.split(/[;,/]/).map((item) => item.trim()).find(Boolean);
            return first || '';
        }
        return '';
    };

    const isAllowedStage = (value: string): value is (typeof STAGES)[number] => {
        return STAGES.includes(value as (typeof STAGES)[number]);
    };

    const submit = async () => {
        if (!fieldName.trim() || !location.trim() || !crop.trim() || !flowStage.trim()) {
            Alert.alert('Required', 'Please fill all required fields.');
            return;
        }

        setSaving(true);
        try {
            const res = await updateFarmingFlow({
                field_name: fieldName.trim(),
                location: location.trim(),
                crop: crop.trim(),
                flow_stage: flowStage.trim(),
                growth_stage_day: Number(growthStageDay) || 1,
                notes: notes.trim() || undefined,
            });

            if (res?.status !== 'success') {
                const message = res?.message || error || 'Failed to update farming flow. Please retry.';
                Alert.alert('Error', message);
                return;
            }

            const profileRaw = await AsyncStorage.getItem('user_profile');
            const profile = profileRaw ? JSON.parse(profileRaw) : {};
            const nextProfile = {
                ...profile,
                farm_name: fieldName.trim(),
                crops: crop.trim(),
                flow_stage: flowStage.trim(),
                growth_stage_day: Number(growthStageDay) || 1,
            };
            await AsyncStorage.setItem('user_profile', JSON.stringify(nextProfile));
            await AsyncStorage.setItem('agriflow_refresh_nonce', String(Date.now()));

            Alert.alert('Updated', 'Farming flow updated successfully.', [
                { text: 'Go to AgriFlow', onPress: () => router.replace('/(tabs)/agriflow' as any) },
                { text: 'Test Model', onPress: () => router.push('/(tabs)/stage-model-test' as any) },
            ]);
        } finally {
            setSaving(false);
        }
    };

    const fillLocationFromGps = async (options?: { silent?: boolean }) => {
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (!options?.silent) {
                    Alert.alert('Permission required', 'Please allow location access to auto-fill location.');
                }
                return;
            }

            const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const lat = current.coords.latitude;
            const lon = current.coords.longitude;

            const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            const place = places[0];

            if (place) {
                const readable = [
                    place.subregion,
                    place.city || place.district,
                    place.region,
                ]
                    .filter(Boolean)
                    .join(', ');

                setLocation(readable || `${lat.toFixed(5)}, ${lon.toFixed(5)}`);
            } else {
                setLocation(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
            }
        } catch {
            if (!options?.silent) {
                Alert.alert('GPS error', 'Could not fetch current location. Try again.');
            }
        } finally {
            setLocating(false);
        }
    };

    useEffect(() => {
        const prefill = async () => {
            const profileRaw = await AsyncStorage.getItem('user_profile');
            const profile = profileRaw ? JSON.parse(profileRaw) : {};

            const profileFieldName = String(profile?.farm_name || '').trim();
            const profileCrop = extractFirstCrop(profile?.crops);
            const profileStage = String(profile?.flow_stage || '').trim().toLowerCase();
            const profileLocation = [profile?.village, profile?.district, profile?.state].filter(Boolean).join(', ').trim();

            if (profileFieldName) setFieldName(profileFieldName);
            if (profileCrop) setCrop(profileCrop);
            if (profileStage && isAllowedStage(profileStage)) setFlowStage(profileStage);
            if (profileLocation) {
                setLocation(profileLocation);
            } else {
                await fillLocationFromGps({ silent: true });
            }
        };

        prefill();
        // Run once on initial mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.container}>
                <Typography.H2 style={[styles.title, { color: colors.foreground, borderBottomWidth: 0 }]}>Update Farming Flow</Typography.H2>
                <Typography.Small style={{ color: colors.mutedForeground, marginBottom: 14 }}>
                    Separate flow update route for your field and stage progression.
                </Typography.Small>

                <Input label="Field Name" value={fieldName} onChangeText={setFieldName} />
                <Input label="Location" value={location} onChangeText={setLocation} />
                <Button variant="outline" onPress={() => fillLocationFromGps()} disabled={locating} style={styles.inlineActionBtn}>
                    {locating ? 'Fetching GPS...' : 'Use Current GPS Location'}
                </Button>
                <Input label="Crop" value={crop} onChangeText={setCrop} />

                <Typography.Small style={{ color: colors.mutedForeground, marginTop: 8, marginBottom: 6 }}>
                    Flow Stage
                </Typography.Small>
                <View style={styles.stageWrap}>
                    {STAGES.map((stage) => {
                        const selected = flowStage === stage;
                        return (
                            <Pressable
                                key={stage}
                                onPress={() => setFlowStage(stage)}
                                style={[
                                    styles.stageOption,
                                    {
                                        borderColor: selected ? colors.tint : colors.border,
                                        backgroundColor: selected ? `${colors.tint}1A` : colors.background,
                                    },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.radioOuter,
                                        { borderColor: selected ? colors.tint : colors.mutedForeground },
                                    ]}
                                >
                                    {selected && <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />}
                                </View>
                                <Typography.Small style={{ color: colors.foreground, fontWeight: selected ? '700' : '500' }}>
                                    {stage}
                                </Typography.Small>
                            </Pressable>
                        );
                    })}
                </View>
                <Typography.Small style={{ color: colors.mutedForeground, marginBottom: 8 }}>
                    Allowed stages: {STAGES.join(', ')}
                </Typography.Small>
                <Input
                    label="Growth Stage Day"
                    value={growthStageDay}
                    onChangeText={setGrowthStageDay}
                    keyboardType="numeric"
                />
                <Input label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

                <Button onPress={submit} disabled={saving} style={styles.actionBtn}>
                    {saving ? 'Saving...' : 'Save Farming Flow'}
                </Button>

                <Button variant="outline" onPress={() => router.push('/(tabs)/stage-model-test' as any)} style={styles.actionBtn}>
                    Open Stage Model Test Route
                </Button>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, gap: 10, paddingBottom: 40 },
    title: { fontWeight: '800', fontSize: 24, marginTop: 56 },
    inlineActionBtn: { marginTop: -2, height: 40, borderRadius: 10 },
    stageWrap: { gap: 8, marginBottom: 8 },
    stageOption: {
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    radioOuter: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    actionBtn: { marginTop: 8, height: 46, borderRadius: 12 },
});
