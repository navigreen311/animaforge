import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface Project {
  id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  shotCount: number;
  status: 'active' | 'archived' | 'draft';
  updatedAt: string;
}

interface Props {
  project: Project;
  onPress: () => void;
}

const statusColors: Record<Project['status'], string> = {
  active: '#4caf50',
  archived: '#666680',
  draft: '#ff9800',
};

export default function ProjectCard({ project, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Thumbnail */}
      <View style={styles.thumbnail}>
        {project.thumbnailUrl ? (
          <Image source={{ uri: project.thumbnailUrl }} style={styles.thumbnailImage} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailText}>
              {project.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {project.name}
          </Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: statusColors[project.status] },
            ]}
          />
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {project.description}
        </Text>

        <View style={styles.meta}>
          <Text style={styles.metaText}>{project.shotCount} shots</Text>
          <Text style={styles.metaDot}>-</Text>
          <Text style={styles.metaText}>
            {new Date(project.updatedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 12,
  },
  thumbnail: {
    width: 100,
    height: 100,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a4e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailText: {
    color: '#7c4dff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  description: {
    color: '#666680',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: '#555',
    fontSize: 12,
  },
  metaDot: {
    color: '#555',
    fontSize: 12,
    marginHorizontal: 6,
  },
});
