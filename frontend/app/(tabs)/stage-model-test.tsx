import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';

export default function StageModelTestScreen() {
    const { colors } = useTheme();
    const { testStageModel } = useApi();

    const [crop, setCrop] = useState('Rice');
    const [location, setLocation] = useState('');
    const [growthStageDay, setGrowthStageDay] = useState('35');
    const [healthScore, setHealthScore] = useState('3');
    const [temperature, setTemperature] = useState('28');
    const [humidity, setHumidity] = useState('70');
    const [nitrogen, setNitrogen] = useState('80');
    const [phosphorus, setPhosphorus] = useState('40');
    const [potassium, setPotassium] = useState('40');
    const [ph, setPh] = useState('6.5');

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const runTest = async () => {
        setLoading(true);
        try {
            const res = await testStageModel({
                crop,
                location,
                growth_stage_day: Number(growthStageDay) || 1,
                health_score: Number(healthScore) || 3,
                temperature: Number(temperature) || 28,
                humidity: Number(humidity) || 70,
                nitrogen: Number(nitrogen) || 80,
                phosphorus: Number(phosphorus) || 40,
                potassium: Number(potassium) || 40,
                ph: Number(ph) || 6.5,
            });

            if (!res?.status) {
                Alert.alert('Error', 'Stage model test failed.');
                return;
            }
            setResult(res);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.container}>
                <Typography.H2 style={[styles.title, { color: colors.foreground, borderBottomWidth: 0 }]}>Stage Model Test</Typography.H2>
                <Typography.Small style={{ color: colors.mutedForeground, marginBottom: 14 }}>
                    Test your imported Colab model and get LLM explanation.
                </Typography.Small>

                <Input label="Crop" value={crop} onChangeText={setCrop} />
                <Input label="Location" value={location} onChangeText={setLocation} />
                <Input label="Growth Stage Day" value={growthStageDay} onChangeText={setGrowthStageDay} keyboardType="numeric" />
                <Input label="Health Score (1-5)" value={healthScore} onChangeText={setHealthScore} keyboardType="numeric" />
                <Input label="Temperature" value={temperature} onChangeText={setTemperature} keyboardType="numeric" />
                <Input label="Humidity" value={humidity} onChangeText={setHumidity} keyboardType="numeric" />
                <Input label="Nitrogen" value={nitrogen} onChangeText={setNitrogen} keyboardType="numeric" />
                <Input label="Phosphorus" value={phosphorus} onChangeText={setPhosphorus} keyboardType="numeric" />
                <Input label="Potassium" value={potassium} onChangeText={setPotassium} keyboardType="numeric" />
                <Input label="pH" value={ph} onChangeText={setPh} keyboardType="numeric" />

                <Button onPress={runTest} disabled={loading} style={styles.actionBtn}>
                    {loading ? 'Testing...' : 'Run Stage Test'}
                </Button>

                {result && (
                    <View style={[styles.card, { borderColor: colors.border }]}>
                        <Typography.P style={{ fontWeight: '700' }}>Predicted Stage: {result?.model?.runtime?.predicted_stage}</Typography.P>
                        <Typography.Small style={{ color: colors.mutedForeground, marginTop: 6 }}>
                            Confidence: {result?.model?.runtime?.confidence}
                        </Typography.Small>
                        <Typography.Small style={{ color: colors.mutedForeground }}>
                            Model Status: {result?.model?.runtime?.model_status}
                        </Typography.Small>
                        <Typography.Small style={{ color: colors.mutedForeground }}>
                            Loader: {result?.model?.loader?.loaded ? 'loaded' : 'not loaded'}
                        </Typography.Small>
                        <Typography.Small style={{ color: colors.mutedForeground, marginTop: 8, fontWeight: '700' }}>
                            LLM Explanation
                        </Typography.Small>
                        <Typography.P style={{ marginTop: 6 }}>{result?.explanation}</Typography.P>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, gap: 10, paddingBottom: 40 },
    title: { fontWeight: '800', fontSize: 24, marginTop: 56 },
    actionBtn: { marginTop: 8, height: 46, borderRadius: 12 },
    card: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
});
