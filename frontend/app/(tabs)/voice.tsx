import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, AlertCircle } from 'lucide-react-native';

import { Typography } from '@/components/ui/Typography';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useAppContext } from '@/context/AppProvider';

export default function VoiceScreen() {
  const { colors } = useTheme();
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
    <KeyboardResponsiveView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Typography.H1 style={styles.headerTitle}>AI Assistant</Typography.H1>
        <Typography.P style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          Ask about weather, pests, or market prices in Tamil.
        </Typography.P>
      </View>

      <View style={styles.chatContainer}>
        {history.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <View style={[styles.iconCircle, { backgroundColor: colors.tint + '10' }]}>
              <Mic size={48} color={colors.tint} />
            </View>
            <Typography.P style={{ color: colors.mutedForeground, textAlign: 'center', fontWeight: '500' }}>
              Press and hold the microphone to speak
            </Typography.P>
          </View>
        )}

        {history.map((item, index) => (
          <View key={index} style={styles.msgPair}>
            <View style={[styles.userBubble, { backgroundColor: colors.tint }]}>
              <Typography.P style={{ color: '#fff' }}>{item.q}</Typography.P>
            </View>
            <Card style={styles.aiBubble}>
              <CardContent style={{ padding: 16 }}>
                <Typography.P style={{ fontWeight: '500' }}>{item.a}</Typography.P>
                <Typography.Small style={{ color: colors.mutedForeground, alignSelf: 'flex-end', marginTop: 8 }}>
                  {item.time}
                </Typography.Small>
              </CardContent>
            </Card>
          </View>
        ))}

        {loading && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Typography.Small style={{ color: colors.mutedForeground }}>Thinking...</Typography.Small>
          </View>
        )}
      </View>

      {/* Recording Controls */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <View style={styles.micWrapper}>
          <Button
            variant="default"
            size="icon"
            style={[
              styles.micBtn,
              { backgroundColor: isRecording ? colors.destructive : colors.tint }
            ]}
            onLongPress={startRecording}
            onPressOut={stopRecording}
          >
            <Mic size={32} color="#fff" />
          </Button>
          {isRecording && <View style={[styles.pulseCircle, { borderColor: colors.destructive }]} />}
        </View>
        <Typography.Small style={[styles.hint, { color: colors.mutedForeground }]}>
          {isRecording ? 'Listening... Release to send' : 'Hold to speak (Tamil supported)'}
        </Typography.Small>
      </View>

      {error && (
        <Card style={[styles.errorPopup, { backgroundColor: colors.destructive }]}>
          <CardContent style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
            <AlertCircle size={20} color="#fff" />
            <Typography.Small style={{ color: '#fff', fontWeight: '600' }}>{error}</Typography.Small>
          </CardContent>
        </Card>
      )}
    </KeyboardResponsiveView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 150 },
  header: { padding: 30, paddingTop: 60 },
  headerTitle: { letterSpacing: -1 },
  headerSubtitle: { marginTop: 4, fontWeight: '500' },
  chatContainer: { flex: 1, paddingHorizontal: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  msgPair: { marginVertical: 12 },
  userBubble: { alignSelf: 'flex-end', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24, borderBottomRightRadius: 4, maxWidth: '85%', elevation: 2 },
  aiBubble: { alignSelf: 'flex-start', borderRadius: 24, borderBottomLeftRadius: 4, maxWidth: '85%', marginTop: 8 },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', padding: 12, borderRadius: 20, gap: 8, marginTop: 10 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 32, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  micWrapper: { alignItems: 'center', justifyContent: 'center' },
  micBtn: { width: 72, height: 72, borderRadius: 36, elevation: 8 },
  pulseCircle: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 2, opacity: 0.5 },
  hint: { marginTop: 16, fontWeight: '600' },
  errorPopup: { position: 'absolute', top: 50, left: 20, right: 20, elevation: 5 },
});
