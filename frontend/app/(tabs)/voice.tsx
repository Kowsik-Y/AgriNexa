import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, MessageSquare, History, Play, Pause, AlertCircle, Info } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useApi } from '@/hooks/use-api';
import { useThemeColors } from '@/hooks/use-theme-colors';

import { useAppContext } from '@/context/AppProvider';

export default function VoiceScreen() {
  const colors = useThemeColors();
  const { voiceQuery, loading, error } = useApi();
  const { language } = useAppContext();
  const isTamil = language === 'Tamil';
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setIsRecording(false);
    try {
      const status = await recording.getStatusAsync();
      if (status.canRecord && status.durationMillis > 100) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
          handleVoiceQuery(uri);
        }
      } else {
        // Recording was too short or never started properly
        await recording.stopAndUnloadAsync().catch(() => {}); 
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    } finally {
      setRecording(null);
    }
  }

  const handleVoiceQuery = async (uri: string) => {
    const res = await voiceQuery(uri);
    if (res) {
      setHistory(prev => [{
        q: res.transcription,
        a: isTamil ? res.tamil_response : res.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, ...prev]);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>AI Assistant</ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: colors.icon }]}>
          Ask about weather, pests, or market prices in Tamil.
        </ThemedText>
      </ThemedView>

      <ScrollView 
        style={styles.chatContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {history.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <View style={[styles.iconCircle, { backgroundColor: colors.tint + '10' }]}>
              <Mic size={48} color={colors.tint} />
            </View>
            <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
              Press and hold the microphone to speak
            </ThemedText>
          </View>
        )}

        {history.map((item, index) => (
          <View key={index} style={styles.msgPair}>
            <View style={[styles.userBubble, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.userText}>{item.q}</ThemedText>
            </View>
            <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ThemedText style={[styles.aiText, { color: colors.text }]}>{item.a}</ThemedText>
              <ThemedText style={[styles.time, { color: colors.icon }]}>{item.time}</ThemedText>
            </View>
          </View>
        ))}

        {loading && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color={colors.tint} />
            <ThemedText style={[styles.loadingText, { color: colors.icon }]}>Thinking...</ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Recording Controls */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.micWrapper}>
          <TouchableOpacity
            onLongPress={startRecording}
            onPressOut={stopRecording}
            style={[
              styles.micBtn,
              { backgroundColor: isRecording ? colors.notification : colors.tint }
            ]}
          >
            <Mic size={32} color="#fff" />
          </TouchableOpacity>
          {isRecording && <View style={[styles.pulseCircle, { borderColor: colors.notification }]} />}
        </View>
        <ThemedText style={[styles.hint, { color: colors.icon }]}>
          {isRecording ? 'Listening... Release to send' : 'Hold to speak (Tamil supported)'}
        </ThemedText>
      </View>

      {error && (
        <View style={[styles.errorPopup, { backgroundColor: colors.notification }]}>
          <AlertCircle size={20} color="#fff" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 30, paddingTop: 70, backgroundColor: 'transparent' },
  headerTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  headerSubtitle: { fontSize: 16, marginTop: 4, fontWeight: '500' },
  chatContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 150 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  iconCircle: { padding: 24, borderRadius: 40, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '500', textAlign: 'center' },
  msgPair: { marginVertical: 12 },
  userBubble: { alignSelf: 'flex-end', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24, borderBottomRightRadius: 4, maxWidth: '85%', elevation: 2 },
  userText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  aiBubble: { alignSelf: 'flex-start', padding: 16, borderRadius: 24, borderBottomLeftRadius: 4, borderWidth: 1, maxWidth: '85%', marginTop: 8, elevation: 1 },
  aiText: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  time: { fontSize: 11, marginTop: 6, alignSelf: 'flex-end', fontWeight: '600' },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', padding: 12, borderRadius: 20, gap: 8, marginTop: 10 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 32, alignItems: 'center', borderTopWidth: 1 },
  micWrapper: { alignItems: 'center', justifyContent: 'center' },
  micBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, zIndex: 10 },
  pulseCircle: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 2, opacity: 0.5 },
  hint: { marginTop: 16, fontSize: 14, fontWeight: '600' },
  errorPopup: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, gap: 10, elevation: 5 },
  errorText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
