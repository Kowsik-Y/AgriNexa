import React, { useState } from 'react';
import { StyleSheet, View, Image, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, CheckCircle2, AlertCircle, Info } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { Spinner } from '@/components/ui/Spinner';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';

export default function ScanScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { predictDisease, predictCrop, loading, error } = useApi();
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const pickImage = async () => {
    let res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 1,
    });
    if (!res.canceled) { const uri = res.assets[0].uri; setImage(uri); handlePredict(uri); }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { alert('Camera permission required'); return; }
    let res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 1 });
    if (!res.canceled) { const uri = res.assets[0].uri; setImage(uri); handlePredict(uri); }
  };

  const handlePredict = async (uri: string) => {
    setResult(null);
    const [diseaseResult, cropResult] = await Promise.all([predictDisease(uri), predictCrop(uri)]);
    if (!diseaseResult && !cropResult) return;
    setResult({ ...(diseaseResult || {}), crop_prediction: cropResult || null });
  };

  return (
    <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>
      <ResponsiveContainer>
        <View style={styles.header}>
          <Typography.H2 style={[styles.title, { color: colors.foreground, borderBottomWidth: 0 }]}>Crop Scan</Typography.H2>
          <Typography.P style={{ color: colors.mutedForeground, marginTop: 2 }}>Analyze plant health with AI.</Typography.P>
        </View>

        <View style={styles.body}>
          {image ? (
            <View style={[styles.previewWrap, { borderColor: colors.border }]}>
              <Image source={{ uri: image }} style={styles.preview} />
            </View>
          ) : (
            <View style={[styles.placeholder, { borderColor: colors.border }]}>
              <Camera size={36} color={colors.mutedForeground} />
              <Typography.P style={{ color: colors.mutedForeground }}>Tap Camera or Gallery below</Typography.P>
            </View>
          )}

          <View style={styles.btnRow}>
            <Button style={styles.actionBtn} onPress={takePhoto}>
              <Camera size={18} color="#fff" />
              <Typography.P style={{ color: '#fff', fontWeight: '600' }}>Camera</Typography.P>
            </Button>
            <Button variant="outline" style={styles.actionBtn} onPress={pickImage}>
              <ImageIcon size={18} color={colors.foreground} />
              <Typography.P style={{ fontWeight: '600' }}>Gallery</Typography.P>
            </Button>
          </View>
        </View>

        {loading && (
          <View style={styles.loading}>
            <Spinner size={28} color={colors.tint} />
            <Typography.P style={{ marginTop: 10, color: colors.mutedForeground }}>Analyzing...</Typography.P>
          </View>
        )}

        {result && (
          <View style={[styles.resultCard, { borderColor: colors.border }]}>
            <View style={styles.resultHeader}>
              <CheckCircle2 size={18} color={colors.success} />
              <Typography.P style={{ color: colors.success, fontWeight: '700' }}>Analysis Complete</Typography.P>
            </View>

            <Typography.P style={{ fontWeight: '700' }}>Disease: {result.disease || 'Unknown'}</Typography.P>
            <Typography.P style={{ fontWeight: '700' }}>Crop: {result.crop_prediction?.predicted_crop || 'Unknown'}</Typography.P>

            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <Badge variant={result.confidence < 0.5 ? 'destructive' : 'outline'}>
                Confidence: {(result.confidence * 100).toFixed(1)}%
              </Badge>
              {result.is_healthy && <Badge>✓ Healthy</Badge>}
            </View>

            {result.confidence < 0.5 && (
              <View style={[styles.noteBox, { backgroundColor: colors.warning + '12' }]}>
                <AlertCircle size={14} color={colors.warning} />
                <Typography.Small style={{ color: colors.warning, flex: 1, marginLeft: 6 }}>
                  Low confidence — consult an expert.
                </Typography.Small>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Info size={16} color={colors.tint} />
                <Typography.P style={{ fontWeight: '700' }}>Recommended Action</Typography.P>
              </View>
              <Typography.P style={{ lineHeight: 22 }}>{result.solution}</Typography.P>
            </View>

            {result.pesticide_recommendation && result.pesticide_recommendation !== 'None required' && (
              <View style={[styles.pesticideBox, { backgroundColor: colors.muted }]}>
                <Typography.Small style={{ color: colors.tint, fontWeight: '700' }}>💊 {result.pesticide_recommendation}</Typography.Small>
                {result.dosage && <Typography.Small style={{ color: colors.mutedForeground }}>Dosage: {result.dosage}</Typography.Small>}
              </View>
            )}

            {result.tamil_solution && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Typography.P style={{ fontWeight: '700' }}>🌿 தீர்வு (Tamil)</Typography.P>
                <Typography.P style={{ lineHeight: 24, color: colors.mutedForeground }}>{result.tamil_solution}</Typography.P>
              </>
            )}
          </View>
        )}

        {error && (
          <View style={[styles.errorBar, { borderColor: colors.destructive }]}>
            <AlertCircle size={16} color={colors.destructive} />
            <Typography.P style={{ color: colors.destructive, flex: 1 }}>{error}</Typography.P>
          </View>
        )}
      </ResponsiveContainer>
    </KeyboardResponsiveView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { fontWeight: '800', fontSize: 24, letterSpacing: -0.5 },
  body: { paddingHorizontal: 20, alignItems: 'center' },
  previewWrap: { width: '100%', borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  preview: { width: '100%', height: 260 },
  placeholder: { width: '100%', borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  btnRow: { flexDirection: 'row', marginTop: 14, gap: 12, width: '100%' },
  actionBtn: { flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', gap: 8 },
  loading: { marginTop: 32, alignItems: 'center' },
  resultCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 12, borderWidth: 1, padding: 16, gap: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  noteBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginTop: 4 },
  divider: { height: 1, marginVertical: 8 },
  pesticideBox: { padding: 12, borderRadius: 8, gap: 2 },
  errorBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 16, padding: 12, borderRadius: 10, borderWidth: 1 },
});
