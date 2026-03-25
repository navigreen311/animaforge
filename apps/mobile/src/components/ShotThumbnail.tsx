import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface Shot {
  id: string;
  name: string;
  thumbnailUrl?: string;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  duration: number;
}

interface Props {
  shot: Shot;
  onPress: () => void;
}

const statusColors: Record<Shot['status'], string> = {
  pending: '#666680',
  generating: '#ff9800',
  complete: '#4caf50',
  failed: '#f44336',
};

export default function ShotThumbnail({ shot, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.thumbnail}>
        {shot.thumbnailUrl ? (
          <Image source={{ uri: shot.thumbnailUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {shot.status === 'generating' ? '...' : shot.name.charAt(0)}
            </Text>
          </View>
        )}

        {/* Duration badge */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{shot.duration}s</Text>
        </View>

        {/* Status indicator */}
        <View style={[styles.statusIndicator, { backgroundColor: statusColors[shot.status] }]} />
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {shot.name}
      </Text>
      <Text style={styles.status}>{shot.status}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: '50%',
    marginBottom: 16,
  },
  thumbnail: {
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    marginBottom: 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
  },
  placeholderText: {
    color: '#666680',
    fontSize: 18,
    fontWeight: '600',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    color: '#e0e0ff',
    fontSize: 13,
    fontWeight: '600',
  },
  status: {
    color: '#666680',
    fontSize: 11,
    textTransform: 'capitalize',
  },
});
