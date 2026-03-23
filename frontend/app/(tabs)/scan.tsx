import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, Scan as ScanIcon, CheckCircle2, AlertCircle, Info } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApi } from '@/hooks/use-api';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function ScanScreen() {
  const colors = useThemeColors();
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>Crop Scan</ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: colors.icon }]}>
          Analyze plant health using AI-powered detection.
        </ThemedText>
      </ThemedView>

      <View style={styles.actionContainer}>
        {image ? (
          <View style={[styles.previewWrapper, { borderColor: colors.border }]}>
            <Image source={{ uri: image }} style={styles.preview} />
            <TouchableOpacity 
              style={[styles.retakeBtn, { backgroundColor: colors.card }]} 
              onPress={() => setImage(null)}
            >
              <ImageIcon size={20} color={colors.tint} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.placeholder, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={takePhoto}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.tint + '10' }]}>
              <Camera size={48} color={colors.tint} />
            </View>
            <ThemedText style={[styles.placeholderText, { color: colors.icon }]}>
              Tap to capture or upload a photo
            </ThemedText>
          </TouchableOpacity>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: colors.tint }]} 
            onPress={takePhoto}
          >
            <Camera size={20} color="#fff" />
            <ThemedText style={styles.btnText}>Camera</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} 
            onPress={pickImage}
          >
            <ImageIcon size={20} color={colors.text} />
            <ThemedText style={[styles.btnText, { color: colors.text }]}>Gallery</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={{ marginTop: 12, color: colors.icon }}>Analyzing crop health...</ThemedText>
        </View>
      )}

      {result && (
        <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.resultHeader}>
            <CheckCircle2 size={24} color={colors.success} />
            <ThemedText type="subtitle" style={[styles.resultTitle, { color: colors.success }]}>
              Analysis Complete
            </ThemedText>
          </View>
          
          <ThemedText type="defaultSemiBold" style={[styles.diseaseName, { color: colors.text }]}>
            {result.disease}
          </ThemedText>
          <ThemedText style={[styles.confidence, { color: colors.icon }]}>
            Confidence Score: {(result.confidence * 100).toFixed(1)}%
          </ThemedText>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.solutionSection}>
            <View style={styles.langHeader}>
              <Info size={16} color={colors.tint} />
              <ThemedText type="defaultSemiBold" style={{ marginLeft: 8 }}>Recommended Action</ThemedText>
            </View>
            <ThemedText style={[styles.solutionText, { color: colors.text }]}>
              {result.solution}
            </ThemedText>
            
            <View style={[styles.langHeader, { marginTop: 16 }]}>
              <ThemedText type="defaultSemiBold">தீர்வு (Tamil)</ThemedText>
            </View>
            <ThemedText style={[styles.solutionText, { color: colors.text }]}>
              {result.tamil_solution}
            </ThemedText>
          </View>
        </View>
      )}

      {error && (
        <View style={[styles.errorBox, { backgroundColor: colors.notification + '15', borderColor: colors.notification }]}>
          <AlertCircle size={24} color={colors.notification} />
          <ThemedText style={[styles.errorText, { color: colors.notification }]}>
            {error}
          </ThemedText>
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 30, paddingTop: 70, backgroundColor: 'transparent' },
  headerTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  headerSubtitle: { fontSize: 16, marginTop: 4, fontWeight: '500' },
  actionContainer: { padding: 20, alignItems: 'center' },
  previewWrapper: { width: '100%', borderRadius: 28, borderWidth: 1, overflow: 'hidden', elevation: 4 },
  preview: { width: '100%', height: 300 },
  retakeBtn: { position: 'absolute', bottom: 16, right: 16, padding: 12, borderRadius: 16, elevation: 4 },
  placeholder: { width: '100%', height: 300, borderRadius: 28, borderStyle: 'dashed', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { padding: 24, borderRadius: 40, marginBottom: 16 },
  placeholderText: { fontSize: 16, fontWeight: '500' },
  buttonRow: { flexDirection: 'row', marginTop: 24, gap: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 20, gap: 10, elevation: 3 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  loadingBox: { marginTop: 40, alignItems: 'center' },
  resultCard: { margin: 20, padding: 24, borderRadius: 32, borderWidth: 1, elevation: 2 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  resultTitle: { marginLeft: 12, fontSize: 18, fontWeight: '700' },
  diseaseName: { fontSize: 24, fontWeight: '800' },
  confidence: { fontSize: 15, marginTop: 4, fontWeight: '500' },
  divider: { height: 1, marginVertical: 24, opacity: 0.5 },
  solutionSection: { gap: 8 },
  langHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  solutionText: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  errorBox: { margin: 20, padding: 20, borderRadius: 24, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 16, fontWeight: '600', flex: 1 },
});
