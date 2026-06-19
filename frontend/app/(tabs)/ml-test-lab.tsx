import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { FlaskConical, Leaf, ShieldAlert, FileSearch, Bug } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';

const STAGE_ONLY_OPTIONS = [
    'land_preparation',
    'sowing',
    'vegetative',
    'flowering',
    'harvest',
    'post_harvest',
] as const;

const STAGE_DAY_MAP: Record<(typeof STAGE_ONLY_OPTIONS)[number], number> = {
    land_preparation: 7,
    sowing: 14,
    vegetative: 35,
    flowering: 60,
    harvest: 105,
    post_harvest: 120,
};

export default function MlTestLabScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { predictCrop, predictDisease, testStageModel, uploadFile, loading, error } = useApi();

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [stageCrop, setStageCrop] = useState('Rice');
    const [stageLocation, setStageLocation] = useState('');
    const [selectedStage, setSelectedStage] = useState<(typeof STAGE_ONLY_OPTIONS)[number]>('vegetative');
    const [stageOnlyResult, setStageOnlyResult] = useState<any>(null);
    const [cropResult, setCropResult] = useState<any>(null);
    const [diseaseResult, setDiseaseResult] = useState<any>(null);
    const [pestResult, setPestResult] = useState<any>(null);
    const [showRawJson, setShowRawJson] = useState(false);

    const completedChecks = [stageOnlyResult, cropResult, diseaseResult, pestResult].filter(Boolean).length;

    const pickImageFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.9,
        });
        if (result.canceled) return;
        const nextUri = result.assets[0]?.uri;
        if (!nextUri) return;
        setImageUri(nextUri);
        setCropResult(null);
        setDiseaseResult(null);
        setPestResult(null);
    };

    const pickImageFromCamera = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') {
            Alert.alert('Permission required', 'Camera access is needed for testing predictions.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.9,
        });
        if (result.canceled) return;
        const nextUri = result.assets[0]?.uri;
        if (!nextUri) return;
        setImageUri(nextUri);
        setCropResult(null);
        setDiseaseResult(null);
        setPestResult(null);
    };

    const runCropTest = async () => {
        if (!imageUri) {
            Alert.alert('Image required', 'Choose an image before running crop test.');
            return;
        }
        const response = await predictCrop(imageUri);
        setCropResult(response || null);
    };

    const runDiseaseTest = async () => {
        if (!imageUri) {
            Alert.alert('Image required', 'Choose an image before running disease test.');
            return;
        }
        const response = await predictDisease(imageUri);
        setDiseaseResult(response || null);
    };

    const runPestTest = async () => {
        if (!imageUri) {
            Alert.alert('Image required', 'Choose an image before running pest detection test.');
            return;
        }
        const response = await uploadFile('/agri-flow/pest-detection', imageUri, 'file', 'crop.jpg', 'image/jpeg');
        setPestResult(response || null);
    };

    const runStageOnlyTest = async () => {
        const mappedDay = STAGE_DAY_MAP[selectedStage];
        const response = await testStageModel({
            crop: stageCrop || 'Rice',
            location: stageLocation,
            growth_stage_day: mappedDay,
            health_score: 3,
            temperature: 28,
            humidity: 70,
            nitrogen: 80,
            phosphorus: 40,
            potassium: 40,
            ph: 6.5,
        });
        setStageOnlyResult(response || null);
    };

    const runAllImageTests = async () => {
        if (!imageUri) {
            Alert.alert('Image required', 'Choose an image before running all image tests.');
            return;
        }
        const [cropRes, diseaseRes, pestRes] = await Promise.all([
            predictCrop(imageUri),
            predictDisease(imageUri),
            uploadFile('/agri-flow/pest-detection', imageUri, 'file', 'crop.jpg', 'image/jpeg'),
        ]);
        setCropResult(cropRes || null);
        setDiseaseResult(diseaseRes || null);
        setPestResult(pestRes || null);
    };

    const debugPayload = {
        stage_only_test: stageOnlyResult,
        crop_prediction: cropResult,
        disease_prediction: diseaseResult,
        pest_detection: pestResult,
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.container}>
                <Typography.H2 style={[styles.title, { color: colors.foreground, borderBottomWidth: 0 }]}>ML Test Lab</Typography.H2>
                <Typography.Small style={{ color: colors.mutedForeground, marginBottom: 12 }}>
                    Stage-based testing first. Pick a stage and run the stage model test.
                </Typography.Small>

                <View style={[styles.heroCard, { borderColor: colors.border, backgroundColor: colors.muted + '35' }]}>
                    <View style={styles.headerRow}>
                        <FlaskConical size={18} color={colors.tint} />
                        <Typography.P style={{ fontWeight: '800' }}>Testing Dashboard</Typography.P>
                    </View>
                    <View style={styles.badgeRow}>
                        <Badge variant="outline">Completed checks: {completedChecks}/4</Badge>
                        <Badge variant="outline">Stage day: {STAGE_DAY_MAP[selectedStage]}</Badge>
                    </View>
                    <Typography.Small style={{ color: colors.mutedForeground }}>
                        Run stage tests first, then image-based tests for crop, disease, and pest validation.
                    </Typography.Small>
                </View>

                <View style={[styles.card, { borderColor: colors.border }]}>
                    <View style={styles.headerRow}>
                        <FileSearch size={18} color={colors.tint} />
                        <Typography.P style={{ fontWeight: '700' }}>Stage-Only Test</Typography.P>
                    </View>
                    <Input label="Crop" value={stageCrop} onChangeText={setStageCrop} />
                    <Input label="Location" value={stageLocation} onChangeText={setStageLocation} />
                    <Typography.Small style={{ color: colors.mutedForeground, marginTop: 4 }}>
                        Select Stage
                    </Typography.Small>
                    <View style={styles.stageWrap}>
                        {STAGE_ONLY_OPTIONS.map((stage) => {
                            const selected = selectedStage === stage;
                            return (
                                <Pressable
                                    key={stage}
                                    onPress={() => setSelectedStage(stage)}
                                    style={[
                                        styles.stagePill,
                                        {
                                            borderColor: selected ? colors.tint : colors.border,
                                            backgroundColor: selected ? `${colors.tint}1A` : colors.background,
                                        },
                                    ]}
                                >
                                    <Typography.Small style={{ color: selected ? colors.tint : colors.foreground, fontWeight: selected ? '700' : '500' }}>
                                        {stage.replace(/_/g, ' ')}
                                    </Typography.Small>
                                </Pressable>
                            );
                        })}
                    </View>
                    <Typography.Small style={{ color: colors.mutedForeground }}>
                        Growth day used for this stage: {STAGE_DAY_MAP[selectedStage]}
                    </Typography.Small>
                    <View style={styles.row}>
                        <Button style={styles.btn} onPress={runStageOnlyTest}>Run Stage-Only Test</Button>
                        <Button variant="outline" style={styles.btn} onPress={() => router.push('/(tabs)/stage-model-test' as any)}>
                            Detailed Route
                        </Button>
                    </View>

                    {stageOnlyResult && (
                        <View style={[styles.resultBox, { borderColor: colors.border, backgroundColor: colors.muted + '55' }]}>
                            <Typography.Small style={{ color: colors.foreground, fontWeight: '700' }}>
                                Predicted stage: {stageOnlyResult?.model?.runtime?.predicted_stage || 'N/A'}
                            </Typography.Small>
                            <Typography.Small style={{ color: colors.mutedForeground, marginTop: 4 }}>
                                Confidence: {stageOnlyResult?.model?.runtime?.confidence ?? 'N/A'}
                            </Typography.Small>
                            <Typography.Small style={{ color: colors.mutedForeground, marginTop: 4 }}>
                                {stageOnlyResult?.explanation || 'No explanation available'}
                            </Typography.Small>
                        </View>
                    )}
                </View>

                <View style={[styles.card, { borderColor: colors.border }]}>
                    <View style={styles.headerRow}>
                        <FlaskConical size={18} color={colors.tint} />
                        <Typography.P style={{ fontWeight: '700' }}>Test Image</Typography.P>
                    </View>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.preview} />
                    ) : (
                        <View style={[styles.placeholder, { borderColor: colors.border }]}>
                            <Typography.Small style={{ color: colors.mutedForeground }}>No test image selected</Typography.Small>
                        </View>
                    )}
                    <View style={styles.row}>
                        <Button style={styles.btn} onPress={pickImageFromCamera}>Camera</Button>
                        <Button variant="outline" style={styles.btn} onPress={pickImageFromGallery}>Gallery</Button>
                    </View>
                    <Button variant="outline" onPress={runAllImageTests}>Run All Image Tests</Button>
                </View>

                <View style={[styles.card, { borderColor: colors.border }]}>
                    <View style={styles.headerRow}>
                        <Leaf size={18} color={colors.tint} />
                        <Typography.P style={{ fontWeight: '700' }}>Crop Test</Typography.P>
                    </View>
                    <Button variant="outline" onPress={runCropTest}>Run Crop Prediction</Button>
                    {cropResult && (
                        <View style={[styles.resultBox, { borderColor: colors.border, backgroundColor: colors.muted + '55' }]}>
                            <Typography.Small style={{ color: colors.foreground }}>
                                Predicted crop: {cropResult?.predicted_crop || cropResult?.crop || 'Unknown'}
                            </Typography.Small>
                            {cropResult?.confidence != null && (
                                <Badge variant="outline">Confidence: {(Number(cropResult.confidence) * 100).toFixed(1)}%</Badge>
                            )}
                        </View>
                    )}
                </View>

                <View style={[styles.card, { borderColor: colors.border }]}>
                    <View style={styles.headerRow}>
                        <ShieldAlert size={18} color={colors.tint} />
                        <Typography.P style={{ fontWeight: '700' }}>Disease Test</Typography.P>
                    </View>
                    <Button variant="outline" onPress={runDiseaseTest}>Run Disease Prediction</Button>
                    {diseaseResult && (
                        <View style={[styles.resultBox, { borderColor: colors.border, backgroundColor: colors.muted + '55' }]}>
                            <Typography.Small style={{ color: colors.foreground }}>
                                Disease: {diseaseResult?.disease || 'Unknown'}
                            </Typography.Small>
                            {diseaseResult?.confidence != null && (
                                <Badge variant="outline">Confidence: {(Number(diseaseResult.confidence) * 100).toFixed(1)}%</Badge>
                            )}
                            {!!diseaseResult?.solution && (
                                <Typography.Small style={{ color: colors.mutedForeground }}>
                                    Solution: {diseaseResult.solution}
                                </Typography.Small>
                            )}
                        </View>
                    )}
                </View>

                <View style={[styles.card, { borderColor: colors.border }]}>
                    <View style={styles.headerRow}>
                        <Bug size={18} color={colors.tint} />
                        <Typography.P style={{ fontWeight: '700' }}>Pest Detection Test</Typography.P>
                    </View>
                    <Button variant="outline" onPress={runPestTest}>Run Pest Detection</Button>
                    {pestResult && (
                        <View style={[styles.resultBox, { borderColor: colors.border, backgroundColor: colors.muted + '55' }]}>
                            <Typography.Small style={{ color: colors.foreground }}>
                                Pest: {pestResult?.pest || pestResult?.pest_name || 'Unknown'}
                            </Typography.Small>
                            {pestResult?.confidence != null && (
                                <Badge variant="outline">Confidence: {(Number(pestResult.confidence) * 100).toFixed(1)}%</Badge>
                            )}
                            {!!pestResult?.recommendation && (
                                <Typography.Small style={{ color: colors.mutedForeground }}>
                                    Recommendation: {pestResult.recommendation}
                                </Typography.Small>
                            )}
                        </View>
                    )}
                </View>

                <View style={[styles.card, { borderColor: colors.border }]}>
                    <View style={styles.headerRow}>
                        <FileSearch size={18} color={colors.tint} />
                        <Typography.P style={{ fontWeight: '700' }}>Raw Response Debug</Typography.P>
                    </View>
                    <Button variant="outline" onPress={() => setShowRawJson((prev) => !prev)}>
                        {showRawJson ? 'Hide Raw JSON' : 'Show Raw JSON'}
                    </Button>
                    {showRawJson && (
                        <View style={[styles.jsonBox, { borderColor: colors.border, backgroundColor: colors.muted + '55' }]}>
                            <Typography.Small style={{ color: colors.foreground }}>
                                {JSON.stringify(debugPayload, null, 2)}
                            </Typography.Small>
                        </View>
                    )}
                </View>

                <View style={[styles.card, { borderColor: colors.border }]}>
                    <View style={styles.headerRow}>
                        <FileSearch size={18} color={colors.tint} />
                        <Typography.P style={{ fontWeight: '700' }}>More Tests</Typography.P>
                    </View>
                    <Button variant="outline" onPress={() => router.push('/(tabs)/stage-model-test' as any)}>
                        Open Stage Model Test
                    </Button>
                    <Button variant="outline" style={{ marginTop: 8 }} onPress={() => router.push('/(tabs)/scan' as any)}>
                        Open Combined Scan Route
                    </Button>
                </View>

                {loading && (
                    <View style={styles.loadingBox}>
                        <Spinner size={26} color={colors.tint} />
                        <Typography.Small style={{ color: colors.mutedForeground, marginTop: 8 }}>Running test...</Typography.Small>
                    </View>
                )}

                {!!error && (
                    <View style={[styles.errorBox, { borderColor: colors.destructive }]}>
                        <Typography.Small style={{ color: colors.destructive }}>{error}</Typography.Small>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, gap: 12, paddingBottom: 40 },
    title: { fontWeight: '800', fontSize: 24, marginTop: 56 },
    heroCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
    card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    preview: { width: '100%', height: 210, borderRadius: 10 },
    placeholder: {
        height: 120,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    row: { flexDirection: 'row', gap: 8 },
    btn: { flex: 1, height: 44, borderRadius: 10 },
    stageWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    stagePill: { borderWidth: 1, borderRadius: 14, paddingVertical: 7, paddingHorizontal: 10 },
    resultBox: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 10, gap: 6 },
    jsonBox: { borderWidth: 1, borderRadius: 10, padding: 10 },
    loadingBox: { marginTop: 4, alignItems: 'center', justifyContent: 'center' },
    errorBox: { borderWidth: 1, borderRadius: 10, padding: 10 },
});
