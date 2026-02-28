import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { processVoiceCommand } from '@/services/gemini';

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Press the button and tell me what to do');
  const [lastResponse, setLastResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (recording) {
        stopRecording().catch(console.error);
      }
    };
  }, []);

  async function startRecording() {
    try {
      setError(null);
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Microphone permission not granted');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setStatus('Listening...');
    } catch (err: any) {
      console.error('Failed to start recording', err);
      setError('Start recording error: ' + err.message);
      setStatus('Error starting recording');
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      setRecording(null);
      setStatus('Processing...');
      setIsProcessing(true);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('No recording URI');

      // Read file and convert to base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Determine mime type
      const mimeType = 'audio/m4a'; 

      const response = await processVoiceCommand(base64Audio, mimeType);
      
      setLastResponse(response);
      setStatus('Done');
      
      // Vocal response
      Speech.speak(response);

    } catch (err: any) {
      console.error('Failed to stop/process recording', err);
      setError('Processing error: ' + err.message);
      setStatus('Error processing command');
    } finally {
      setIsProcessing(false);
    }
  }

  const handlePress = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (error) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center' }]}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <ThemedText type="subtitle" style={{ color: '#FF3B30', marginTop: 20 }}>Something went wrong</ThemedText>
        <ScrollView style={{ maxHeight: 200, marginTop: 10 }}>
          <ThemedText style={{ color: '#FF3B30', fontSize: 12 }}>{error}</ThemedText>
        </ScrollView>
        <TouchableOpacity 
          style={[styles.recordButton, { width: 100, height: 50, borderRadius: 10, marginTop: 20 }]} 
          onPress={() => setError(null)}
        >
          <ThemedText style={{ color: '#fff' }}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Senior Assistant</ThemedText>
        <ThemedText style={styles.subtitle}>I can help you with calls, weather, and reminders.</ThemedText>
      </View>

      <View style={styles.centerContent}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            recording ? styles.recordingActive : null,
            isProcessing ? styles.processing : null
          ]}
          onPress={handlePress}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Ionicons 
              name={recording ? "stop" : "mic"} 
              size={64} 
              color="#fff" 
            />
          )}
        </TouchableOpacity>
        
        <ThemedText style={styles.statusText}>{status}</ThemedText>
      </View>

      {lastResponse ? (
        <View style={styles.responseContainer}>
          <ThemedText type="defaultSemiBold">Gemini says:</ThemedText>
          <ThemedText style={styles.responseText}>{lastResponse}</ThemedText>
        </View>
      ) : null}
      
      <View style={styles.footer}>
        <ThemedText style={styles.hint}>Try saying: "How is the weather in Paris?" or "Set a reminder for doctor's appointment tomorrow at 10 AM"</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    marginTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recordingActive: {
    backgroundColor: '#FF3B30',
    transform: [{ scale: 1.1 }],
  },
  processing: {
    backgroundColor: '#8E8E93',
  },
  statusText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '500',
  },
  responseContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    marginVertical: 20,
  },
  responseText: {
    marginTop: 5,
    fontSize: 16,
  },
  footer: {
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.5,
  },
});
