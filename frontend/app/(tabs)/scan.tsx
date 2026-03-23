import React, { useState } from 'react';
import { StyleSheet, View, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, CheckCircle2, AlertCircle, Info } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { Separator } from '@/components/ui/Separator';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';

export default function ScanScreen() {
  const { colors } = useTheme();
  const { predictDisease, loading, error } = useApi();
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      handlePredict(uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission is required!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      handlePredict(uri);
    }
  };

  const handlePredict = async (uri: string) => {
    setResult(null);
    const res = await predictDisease(uri);
    setResult(res);
  };

  return (
    <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Typography.H1 style={styles.headerTitle}>Crop Scan</Typography.H1>
        <Typography.P style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          Analyze plant health using AI-powered detection.
        </Typography.P>
      </View>

      <View style={styles.actionContainer}>
        {image ? (
          <Card style={styles.previewCard}>
            <Image source={{ uri: image }} style={styles.preview} />
            <Button 
              variant="secondary" 
              size="icon" 
              style={styles.retakeBtn} 
              onPress={() => setImage(null)}
            >
              <ImageIcon size={20} color={colors.tint} />
            </Button>
          </Card>
        ) : (
          <Button 
            variant="ghost" 
            style={styles.placeholder}
            onPress={takePhoto}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.tint + '10' }]}>
              <Camera size={48} color={colors.tint} />
            </View>
            <Typography.P style={{ color: colors.mutedForeground, fontWeight: '500' }}>
              Tap to capture or upload a photo
            </Typography.P>
          </Button>
        )}

        <View style={styles.buttonRow}>
          <Button 
            style={styles.actionBtn} 
            onPress={takePhoto}
          >
            <Camera size={20} color="#fff" />
            <Typography.Large style={{ color: '#fff', fontWeight: '700' }}>Camera</Typography.Large>
          </Button>
          <Button 
            variant="outline" 
            style={styles.actionBtn} 
            onPress={pickImage}
          >
            <ImageIcon size={20} color={colors.foreground} />
            <Typography.Large style={{ fontWeight: '700' }}>Gallery</Typography.Large>
          </Button>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Typography.P style={{ marginTop: 12, color: colors.mutedForeground }}>
            Analyzing crop health...
          </Typography.P>
        </View>
      )}

      {result && (
        <Card style={styles.resultCard}>
          <CardHeader style={styles.resultHeader}>
            <CheckCircle2 size={24} color={colors.success} />
            <Typography.H3 style={{ color: colors.success, marginLeft: 12 }}>
              Analysis Complete
            </Typography.H3>
          </CardHeader>
          
          <CardContent>
            <Typography.H2 style={styles.diseaseName}>
              {result.disease}
            </Typography.H2>
            <Badge variant="outline" style={{ marginTop: 8 }}>
              <Typography.Small style={{ fontWeight: '700' }}>
                Confidence: {(result.confidence * 100).toFixed(1)}%
              </Typography.Small>
            </Badge>
            
            <Separator style={{ marginVertical: 24 }} />
            
            <View style={styles.solutionSection}>
              <View style={styles.langHeader}>
                <Info size={18} color={colors.tint} />
                <Typography.H3 style={{ marginLeft: 8 }}>Recommended Action</Typography.H3>
              </View>
              <Typography.P style={styles.solutionText}>
                {result.solution}
              </Typography.P>
              
              <Separator style={{ marginVertical: 16 }} />
              
              <View style={styles.langHeader}>
                <Typography.H3>தீர்வு (Tamil)</Typography.H3>
              </View>
              <Typography.P style={styles.solutionText}>
                {result.tamil_solution}
              </Typography.P>
            </View>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card style={[styles.errorCard, { backgroundColor: colors.destructive + '10', borderColor: colors.destructive }]}>
          <CardContent style={styles.errorContent}>
            <AlertCircle size={24} color={colors.destructive} />
            <Typography.P style={{ color: colors.destructive, fontWeight: '600', flex: 1 }}>
              {error}
            </Typography.P>
          </CardContent>
        </Card>
      )}
    </KeyboardResponsiveView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  header: { padding: 30, paddingTop: 60 },
  headerTitle: { letterSpacing: -1 },
  headerSubtitle: { marginTop: 4, fontWeight: '500' },
  actionContainer: { padding: 20, alignItems: 'center' },
  previewCard: { width: '100%', borderRadius: 28, overflow: 'hidden', elevation: 4 },
  preview: { width: '100%', height: 300 },
  retakeBtn: { position: 'absolute', bottom: 16, right: 16, borderRadius: 16 },
  placeholder: { width: '100%', borderRadius: 28, borderStyle: 'dashed', borderWidth: 2, flexDirection: 'column', gap: 16, height: 'auto', paddingVertical: 40 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  buttonRow: { flexDirection: 'row', marginTop: 24, gap: 16 },
  actionBtn: { flex: 1, height: 56, borderRadius: 16, flexDirection: 'row', gap: 10 },
  loadingBox: { marginTop: 40, alignItems: 'center' },
  resultCard: { margin: 20, borderRadius: 32 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16 },
  diseaseName: { fontWeight: '800' },
  solutionSection: { gap: 12 },
  langHeader: { flexDirection: 'row', alignItems: 'center' },
  solutionText: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  errorCard: { margin: 20, borderRadius: 24, borderWidth: 1 },
  errorContent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
});
