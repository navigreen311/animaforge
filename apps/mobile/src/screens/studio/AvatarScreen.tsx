import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import GenerationProgress from '../../components/GenerationProgress';

type AvatarStyle = 'realistic' | 'anime' | 'cartoon' | 'painterly';

interface StyleOption {
  key: AvatarStyle;
  label: string;
  color: string;
}

const styleOptions: StyleOption[] = [
  { key: 'realistic', label: 'Realistic', color: '#7c4dff' },
  { key: 'anime', label: 'Anime', color: '#e040fb' },
  { key: 'cartoon', label: 'Cartoon', color: '#00bcd4' },
  { key: 'painterly', label: 'Painterly', color: '#ff9800' },
];

export default function AvatarScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>('realistic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setResultUrl(null);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setResultUrl(null);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedImage) {
      Alert.alert('No Photo', 'Please select or take a photo first.');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStage('Uploading photo...');

    // Simulate reconstruction progress
    const stages = [
      { at: 15, label: 'Analyzing facial features...' },
      { at: 35, label: 'Building 3D mesh...' },
      { at: 55, label: 'Applying style transfer...' },
      { at: 75, label: 'Generating textures...' },
      { at: 90, label: 'Finalizing avatar...' },
    ];

    for (const s of stages) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setProgress(s.at);
      setStage(s.label);
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
    setProgress(100);
    setStage('Complete');
    setResultUrl(selectedImage); // Placeholder: in production this would be the server result
    setIsGenerating(false);
  }, [selectedImage, selectedStyle]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Avatar</Text>
        <Text style={styles.headerSubtitle}>Upload a photo and choose a style</Text>
      </View>

      {isGenerating && (
        <GenerationProgress progress={progress} stage={stage} />
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Photo picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reference Photo</Text>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage} activeOpacity={0.7}>
              <Text style={styles.photoButtonIcon}>+</Text>
              <Text style={styles.photoButtonLabel}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto} activeOpacity={0.7}>
              <Text style={styles.photoButtonIcon}>C</Text>
              <Text style={styles.photoButtonLabel}>Camera</Text>
            </TouchableOpacity>
          </View>

          {selectedImage && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            </View>
          )}
        </View>

        {/* Style selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avatar Style</Text>
          <View style={styles.styleGrid}>
            {styleOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.styleCard,
                  selectedStyle === option.key && {
                    borderColor: option.color,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSelectedStyle(option.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.styleIcon, { backgroundColor: option.color }]}>
                  <Text style={styles.styleIconText}>
                    {option.label.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.styleLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Result preview */}
        {resultUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Result</Text>
            <View style={styles.resultContainer}>
              <Image source={{ uri: resultUrl }} style={styles.resultImage} />
              <Text style={styles.resultHint}>
                Avatar generated with {selectedStyle} style
              </Text>
            </View>
          </View>
        )}

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateButton, (!selectedImage || isGenerating) && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={!selectedImage || isGenerating}
          activeOpacity={0.7}
        >
          {isGenerating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Avatar</Text>
          )}
        </TouchableOpacity>
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
  photoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    borderStyle: 'dashed',
  },
  photoButtonIcon: {
    color: '#7c4dff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  photoButtonLabel: {
    color: '#666680',
    fontSize: 13,
    fontWeight: '600',
  },
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  styleCard: {
    width: '47%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  styleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  styleIconText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  styleLabel: {
    color: '#e0e0ff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
  },
  resultImage: {
    width: '100%',
    aspectRatio: 1,
  },
  resultHint: {
    color: '#666680',
    fontSize: 13,
    textAlign: 'center',
    padding: 12,
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
});
