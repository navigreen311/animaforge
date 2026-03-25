import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SHOT_BLOCK_WIDTH = 120;
const SHOT_BLOCK_HEIGHT = 80;

interface TimelineShot {
  id: string;
  name: string;
  thumbnailUrl?: string;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  duration: number;
  order: number;
}

interface Props {
  route: RouteProp<{ Timeline: { projectId: string } }, 'Timeline'>;
}

const statusColors: Record<TimelineShot['status'], string> = {
  pending: '#666680',
  generating: '#ff9800',
  complete: '#4caf50',
  failed: '#f44336',
};

export default function TimelineScreen({ route }: Props) {
  const { projectId } = route.params;
  const scrollRef = useRef<ScrollView>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [shots, setShots] = useState<TimelineShot[]>([]);

  const { isLoading } = useQuery({
    queryKey: ['timeline', projectId],
    queryFn: async () => {
      const data = await api.get<TimelineShot[]>(
        `/projects/${projectId}/timeline`,
      );
      setShots(data);
      return data;
    },
  });

  const handleShotPress = useCallback((shot: TimelineShot) => {
    setSelectedShotId((prev) => (prev === shot.id ? null : shot.id));
  }, []);

  const handleMoveLeft = useCallback(
    (shotId: string) => {
      setShots((prev) => {
        const index = prev.findIndex((s) => s.id === shotId);
        if (index <= 0) return prev;
        const updated = [...prev];
        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
        return updated.map((s, i) => ({ ...s, order: i }));
      });
    },
    [],
  );

  const handleMoveRight = useCallback(
    (shotId: string) => {
      setShots((prev) => {
        const index = prev.findIndex((s) => s.id === shotId);
        if (index < 0 || index >= prev.length - 1) return prev;
        const updated = [...prev];
        [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
        return updated.map((s, i) => ({ ...s, order: i }));
      });
    },
    [],
  );

  const handleSaveOrder = useCallback(async () => {
    try {
      await api.put(`/projects/${projectId}/timeline`, {
        order: shots.map((s) => s.id),
      });
      Alert.alert('Saved', 'Timeline order updated.');
    } catch {
      Alert.alert('Error', 'Failed to save timeline order.');
    }
  }, [projectId, shots]);

  const selectedShot = shots.find((s) => s.id === selectedShotId);
  const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timeline</Text>
        <Text style={styles.headerSubtitle}>
          {shots.length} shots / {totalDuration}s total
        </Text>
      </View>

      {/* Horizontal timeline */}
      <View style={styles.timelineContainer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timelineContent}
        >
          {isLoading ? (
            <View style={styles.loadingBlock}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : shots.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Text style={styles.emptyText}>No shots in timeline</Text>
            </View>
          ) : (
            shots.map((shot, index) => (
              <React.Fragment key={shot.id}>
                <TouchableOpacity
                  style={[
                    styles.shotBlock,
                    selectedShotId === shot.id && styles.shotBlockSelected,
                  ]}
                  onPress={() => handleShotPress(shot)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.shotStatusBar,
                      { backgroundColor: statusColors[shot.status] },
                    ]}
                  />
                  <Text style={styles.shotName} numberOfLines={1}>
                    {shot.name}
                  </Text>
                  <Text style={styles.shotDuration}>{shot.duration}s</Text>
                  <Text style={styles.shotIndex}>#{index + 1}</Text>
                </TouchableOpacity>

                {index < shots.length - 1 && (
                  <View style={styles.connector}>
                    <View style={styles.connectorLine} />
                  </View>
                )}
              </React.Fragment>
            ))
          )}
        </ScrollView>
      </View>

      {/* Timecode ruler */}
      <View style={styles.ruler}>
        {shots.map((shot, index) => {
          const startTime = shots
            .slice(0, index)
            .reduce((sum, s) => sum + s.duration, 0);
          return (
            <View key={shot.id} style={[styles.rulerMark, { width: SHOT_BLOCK_WIDTH + 16 }]}>
              <Text style={styles.rulerText}>{startTime}s</Text>
            </View>
          );
        })}
        {shots.length > 0 && (
          <View style={styles.rulerMark}>
            <Text style={styles.rulerText}>{totalDuration}s</Text>
          </View>
        )}
      </View>

      {/* Selected shot detail */}
      {selectedShot && (
        <View style={styles.detailPanel}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{selectedShot.name}</Text>
            <View
              style={[
                styles.detailStatusBadge,
                { backgroundColor: statusColors[selectedShot.status] },
              ]}
            >
              <Text style={styles.detailStatusText}>
                {selectedShot.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.detailMeta}>
            <View style={styles.detailMetaItem}>
              <Text style={styles.detailMetaLabel}>Duration</Text>
              <Text style={styles.detailMetaValue}>{selectedShot.duration}s</Text>
            </View>
            <View style={styles.detailMetaItem}>
              <Text style={styles.detailMetaLabel}>Position</Text>
              <Text style={styles.detailMetaValue}>
                #{shots.findIndex((s) => s.id === selectedShot.id) + 1} of {shots.length}
              </Text>
            </View>
          </View>

          {/* Reorder controls */}
          <View style={styles.reorderRow}>
            <TouchableOpacity
              style={styles.reorderButton}
              onPress={() => handleMoveLeft(selectedShot.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.reorderButtonText}>{'< Move Left'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reorderButton}
              onPress={() => handleMoveRight(selectedShot.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.reorderButtonText}>{'Move Right >'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Save order button */}
      {shots.length > 0 && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveOrder}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>Save Order</Text>
        </TouchableOpacity>
      )}
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
  timelineContainer: {
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  timelineContent: {
    padding: 16,
    alignItems: 'center',
    minWidth: SCREEN_WIDTH,
  },
  loadingBlock: {
    width: SCREEN_WIDTH - 32,
    height: SHOT_BLOCK_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666680',
    fontSize: 14,
  },
  emptyTimeline: {
    width: SCREEN_WIDTH - 32,
    height: SHOT_BLOCK_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666680',
    fontSize: 14,
  },
  shotBlock: {
    width: SHOT_BLOCK_WIDTH,
    height: SHOT_BLOCK_HEIGHT,
    backgroundColor: '#2a2a4e',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  shotBlockSelected: {
    borderColor: '#7c4dff',
  },
  shotStatusBar: {
    height: 3,
    borderRadius: 1.5,
    marginBottom: 4,
  },
  shotName: {
    color: '#e0e0ff',
    fontSize: 12,
    fontWeight: '600',
  },
  shotDuration: {
    color: '#999',
    fontSize: 11,
  },
  shotIndex: {
    color: '#666680',
    fontSize: 10,
    position: 'absolute',
    top: 6,
    right: 8,
  },
  connector: {
    width: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectorLine: {
    width: 16,
    height: 2,
    backgroundColor: '#2a2a4e',
  },
  ruler: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#0f0f23',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  rulerMark: {
    alignItems: 'flex-start',
  },
  rulerText: {
    color: '#666680',
    fontSize: 10,
  },
  detailPanel: {
    backgroundColor: '#1a1a2e',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    color: '#e0e0ff',
    fontSize: 18,
    fontWeight: '600',
  },
  detailStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  detailStatusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  detailMeta: {
    flexDirection: 'row',
    gap: 24,
  },
  detailMetaItem: {
    gap: 2,
  },
  detailMetaLabel: {
    color: '#666680',
    fontSize: 12,
  },
  detailMetaValue: {
    color: '#e0e0ff',
    fontSize: 15,
    fontWeight: '600',
  },
  reorderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reorderButton: {
    flex: 1,
    backgroundColor: '#2a2a4e',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  reorderButtonText: {
    color: '#e0e0ff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#7c4dff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
