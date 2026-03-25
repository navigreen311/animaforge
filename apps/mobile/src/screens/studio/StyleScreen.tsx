import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import GenerationProgress from '../../components/GenerationProgress';

export default function StyleScreen() {
  const [url, setUrl] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [resultPreview, setResultPreview] = useState<{
    styleId: string;
    thumbnailUrl: string;
    name: string;
  } | null>(null);

  const isValidUrl = useCallback((text: string): boolean => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleConvert = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      Alert.alert('No URL', 'Please enter a reference image URL.');
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://.');
      return;
    }

    setIsConverting(true);
    setProgress(0);
    setStage('Downloading reference...');
    setResultPreview(null);

    const stages = [
      { at: 20, label: 'Analyzing color palette...' },
      { at: 40, label: 'Extracting style features...' },
      { at: 60, label: 'Building style embedding...' },
      { at: 80, label: 'Generating preview...' },
      { at: 95, label: 'Saving style profile...' },
    ];

    for (const s of stages) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setProgress(s.at);
      setStage(s.label);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    setProgress(100);
    setStage('Complete');

    setResultPreview({
      styleId: `style_${Date.now()}`,
      thumbnailUrl: trimmedUrl,
      name: 'Custom Style',
    });

    setIsConverting(false);
  }, [url, isValidUrl]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clone Style</Text>
        <Text style={styles.headerSubtitle}>
          Extract visual style from a reference image
        </Text>
      </View>

      {isConverting && (
        <GenerationProgress progress={progress} stage={stage} />
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* URL input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reference Image URL</Text>
          <TextInput
            style={styles.urlInput}
            placeholder="https://example.com/reference.jpg"
            placeholderTextColor="#666680"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>
            Paste a URL to any image whose visual style you want to replicate.
          </Text>
        </View>

        {/* URL preview */}
        {url.trim() && isValidUrl(url.trim()) && !isConverting && !resultPreview && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Source Preview</Text>
            <View style={styles.previewCard}>
              <Image
                source={{ uri: url.trim() }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            </View>
          </View>
        )}

        {/* Convert button */}
        <TouchableOpacity
          style={[
            styles.convertButton,
            (!url.trim() || isConverting) && styles.buttonDisabled,
          ]}
          onPress={handleConvert}
          disabled={!url.trim() || isConverting}
          activeOpacity={0.7}
        >
          {isConverting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.convertButtonText}>Extract Style</Text>
          )}
        </TouchableOpacity>

        {/* Result preview */}
        {resultPreview && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Style Extracted</Text>
            <View style={styles.resultCard}>
              <Image
                source={{ uri: resultPreview.thumbnailUrl }}
                style={styles.resultThumbnail}
                resizeMode="cover"
              />
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{resultPreview.name}</Text>
                <Text style={styles.resultId}>ID: {resultPreview.styleId}</Text>
                <View style={styles.successBadge}>
                  <Text style={styles.successText}>Ready to use</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.applyButton} activeOpacity={0.7}>
              <Text style={styles.applyButtonText}>Apply to Project</Text>
            </TouchableOpacity>
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
  urlInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#e0e0ff',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  hint: {
    color: '#666680',
    fontSize: 13,
    lineHeight: 18,
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  convertButton: {
    backgroundColor: '#00bcd4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  convertButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  resultThumbnail: {
    width: 100,
    height: 100,
  },
  resultInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 4,
  },
  resultName: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultId: {
    color: '#666680',
    fontSize: 12,
  },
  successBadge: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  successText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  applyButton: {
    backgroundColor: '#7c4dff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
