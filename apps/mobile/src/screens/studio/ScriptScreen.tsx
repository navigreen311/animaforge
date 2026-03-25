import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

interface ShotBreakdown {
  shotNumber: number;
  description: string;
  duration: string;
  cameraAngle: string;
}

export default function ScriptScreen() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [shots, setShots] = useState<ShotBreakdown[]>([]);

  const handleGenerate = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      Alert.alert('No Input', 'Please describe your video concept.');
      return;
    }

    setIsGenerating(true);
    setGeneratedScript('');
    setShots([]);

    // Simulate AI script generation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const script = `TITLE: "${trimmedPrompt.substring(0, 40)}..."

SCENE 1 - ESTABLISHING
A sweeping wide shot introduces the setting. The atmosphere is vivid, drawing the viewer into the world of the story.

SCENE 2 - CHARACTER INTRODUCTION
The main subject appears in frame, presented through a medium close-up that reveals key personality traits and emotional state.

SCENE 3 - RISING ACTION
Dynamic movement builds tension as the narrative progresses. Quick cuts between angles heighten the sense of momentum.

SCENE 4 - CLIMAX
The visual peak of the sequence. Bold composition and dramatic lighting converge to deliver the emotional payoff.

SCENE 5 - RESOLUTION
A calm denouement with a slow pull-back, leaving the audience with a lasting visual impression.`;

    const shotBreakdown: ShotBreakdown[] = [
      {
        shotNumber: 1,
        description: 'Wide establishing shot of the setting',
        duration: '3s',
        cameraAngle: 'Wide / Aerial',
      },
      {
        shotNumber: 2,
        description: 'Medium close-up of the main subject',
        duration: '4s',
        cameraAngle: 'Medium Close-Up',
      },
      {
        shotNumber: 3,
        description: 'Dynamic tracking shot with quick cuts',
        duration: '5s',
        cameraAngle: 'Tracking / Multi-angle',
      },
      {
        shotNumber: 4,
        description: 'Dramatic hero shot at the climax',
        duration: '4s',
        cameraAngle: 'Low Angle / Close-Up',
      },
      {
        shotNumber: 5,
        description: 'Slow pull-back for resolution',
        duration: '3s',
        cameraAngle: 'Wide / Pull-Back',
      },
    ];

    setGeneratedScript(script);
    setShots(shotBreakdown);
    setIsGenerating(false);
  }, [prompt]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Script AI</Text>
        <Text style={styles.headerSubtitle}>
          Describe your concept and get a shot-by-shot script
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Text input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video Concept</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe your video idea in detail... e.g. 'A cinematic trailer for a fantasy adventure set in a floating city above the clouds'"
            placeholderTextColor="#666680"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={prompt}
            onChangeText={setPrompt}
          />
          <Text style={styles.charCount}>
            {prompt.length} / 2000 characters
          </Text>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            (!prompt.trim() || isGenerating) && styles.buttonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          activeOpacity={0.7}
        >
          {isGenerating ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.generateButtonText}>Generating Script...</Text>
            </View>
          ) : (
            <Text style={styles.generateButtonText}>Generate Script</Text>
          )}
        </TouchableOpacity>

        {/* Generated script */}
        {generatedScript !== '' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Generated Script</Text>
            <View style={styles.scriptCard}>
              <Text style={styles.scriptText}>{generatedScript}</Text>
            </View>
          </View>
        )}

        {/* Shot breakdown */}
        {shots.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shot Breakdown</Text>
            {shots.map((shot) => (
              <View key={shot.shotNumber} style={styles.shotCard}>
                <View style={styles.shotHeader}>
                  <View style={styles.shotNumberBadge}>
                    <Text style={styles.shotNumberText}>{shot.shotNumber}</Text>
                  </View>
                  <View style={styles.shotMeta}>
                    <Text style={styles.shotDuration}>{shot.duration}</Text>
                    <Text style={styles.shotAngle}>{shot.cameraAngle}</Text>
                  </View>
                </View>
                <Text style={styles.shotDescription}>{shot.description}</Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Duration</Text>
              <Text style={styles.totalValue}>
                {shots.reduce((sum, s) => sum + parseInt(s.duration, 10), 0)}s
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e0e0ff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666680',
    marginTop: 4,
  },
  content: {
    padding: 16,
    gap: 24,
    paddingBottom: 40,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#e0e0ff',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    minHeight: 120,
  },
  charCount: {
    color: '#666680',
    fontSize: 12,
    textAlign: 'right',
  },
  generateButton: {
    backgroundColor: '#7c4dff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scriptCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  scriptText: {
    color: '#ccccdd',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  shotCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#7c4dff',
  },
  shotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shotNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7c4dff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shotNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  shotMeta: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  shotDuration: {
    color: '#ff9800',
    fontSize: 13,
    fontWeight: '600',
  },
  shotAngle: {
    color: '#666680',
    fontSize: 12,
  },
  shotDescription: {
    color: '#ccccdd',
    fontSize: 14,
    lineHeight: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  totalLabel: {
    color: '#e0e0ff',
    fontSize: 15,
    fontWeight: '600',
  },
  totalValue: {
    color: '#7c4dff',
    fontSize: 18,
    fontWeight: '700',
  },
});
