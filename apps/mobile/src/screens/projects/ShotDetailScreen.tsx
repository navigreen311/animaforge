import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectStackParamList } from '../../navigation';
import { api } from '../../lib/api';
import GenerationProgress from '../../components/GenerationProgress';

type ScreenRouteProp = RouteProp<ProjectStackParamList, 'ShotDetail'>;

interface ShotDetail {
  id: string;
  name: string;
  prompt: string;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  progress?: number;
  stage?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  settings: {
    model: string;
    resolution: string;
    fps: number;
    seed?: number;
  };
}

interface Props {
  route: ScreenRouteProp;
}

export default function ShotDetailScreen({ route }: Props) {
  const { projectId, shotId } = route.params;
  const queryClient = useQueryClient();

  const { data: shot, isLoading } = useQuery({
    queryKey: ['shot', projectId, shotId],
    queryFn: () => api.get<ShotDetail>(`/projects/${projectId}/shots/${shotId}`),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'generating' ? 3000 : false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      api.post(`/projects/${projectId}/shots/${shotId}/generate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shot', projectId, shotId] });
    },
  });

  if (isLoading || !shot) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c4dff" />
      </View>
    );
  }

  const statusColor =
    shot.status === 'complete'
      ? '#4caf50'
      : shot.status === 'failed'
        ? '#f44336'
        : shot.status === 'generating'
          ? '#ff9800'
          : '#666680';

  return (
    <ScrollView style={styles.container}>
      {/* Video preview area */}
      <View style={styles.preview}>
        {shot.status === 'complete' ? (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoText}>Video Player</Text>
            <Text style={styles.videoDuration}>{shot.duration}s</Text>
          </View>
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoText}>No video yet</Text>
          </View>
        )}
      </View>

      {/* Generation progress */}
      {shot.status === 'generating' && shot.progress !== undefined && (
        <GenerationProgress progress={shot.progress} stage={shot.stage} />
      )}

      {/* Status badge */}
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{shot.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Prompt */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prompt</Text>
        <Text style={styles.promptText}>{shot.prompt}</Text>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsGrid}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Model</Text>
            <Text style={styles.settingValue}>{shot.settings.model}</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Resolution</Text>
            <Text style={styles.settingValue}>{shot.settings.resolution}</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>FPS</Text>
            <Text style={styles.settingValue}>{shot.settings.fps}</Text>
          </View>
          {shot.settings.seed !== undefined && (
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Seed</Text>
              <Text style={styles.settingValue}>{shot.settings.seed}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Generate button */}
      {(shot.status === 'pending' || shot.status === 'failed') && (
        <TouchableOpacity
          style={[styles.generateButton, generateMutation.isPending && styles.buttonDisabled]}
          onPress={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.generateButtonText}>
              {shot.status === 'failed' ? 'Retry Generation' : 'Generate Video'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0f0f23',
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    aspectRatio: 16 / 9,
    backgroundColor: '#1a1a2e',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    color: '#666680',
    fontSize: 16,
  },
  videoDuration: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    padding: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  sectionTitle: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  promptText: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
  },
  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  settingItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    minWidth: '45%',
  },
  settingLabel: {
    color: '#666680',
    fontSize: 12,
    marginBottom: 4,
  },
  settingValue: {
    color: '#e0e0ff',
    fontSize: 14,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: '#7c4dff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
