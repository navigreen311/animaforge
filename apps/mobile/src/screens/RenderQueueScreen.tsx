import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  Animated,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

type JobStatus = 'running' | 'queued' | 'complete' | 'failed';
type Tier = 'draft' | 'standard' | 'hero';
type FilterKey = 'all' | JobStatus;

interface Job {
  id: string;
  projectName: string;
  shotName: string;
  tier: Tier;
  progress: number;
  eta: string;
  status: JobStatus;
}

const MOCK_JOBS: Job[] = [
  { id: 'j1', projectName: 'Neon Samurai', shotName: 'SH-014', tier: 'hero', progress: 0.65, eta: '4m', status: 'running' },
  { id: 'j2', projectName: 'Neon Samurai', shotName: 'SH-015', tier: 'standard', progress: 0.32, eta: '8m', status: 'running' },
  { id: 'j3', projectName: 'Forest Spirits', shotName: 'SH-007', tier: 'draft', progress: 0, eta: '12m', status: 'queued' },
  { id: 'j4', projectName: 'Forest Spirits', shotName: 'SH-008', tier: 'standard', progress: 0, eta: '15m', status: 'queued' },
  { id: 'j5', projectName: 'Mecha Pilot', shotName: 'SH-003', tier: 'hero', progress: 1, eta: '-', status: 'complete' },
  { id: 'j6', projectName: 'Mecha Pilot', shotName: 'SH-004', tier: 'hero', progress: 1, eta: '-', status: 'complete' },
  { id: 'j7', projectName: 'Ocean Depths', shotName: 'SH-001', tier: 'draft', progress: 0.4, eta: '-', status: 'failed' },
  { id: 'j8', projectName: 'Cyberpunk City', shotName: 'SH-012', tier: 'standard', progress: 1, eta: '-', status: 'complete' },
];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'running', label: 'Running' },
  { key: 'queued', label: 'Queued' },
  { key: 'complete', label: 'Complete' },
  { key: 'failed', label: 'Failed' },
];

const TIER_META: Record<Tier, { color: string; label: string }> = {
  draft: { color: '#94a3b8', label: 'DRAFT' },
  standard: { color: '#60a5fa', label: 'STD' },
  hero: { color: '#c084fc', label: 'HERO' },
};

const STATUS_ICON: Record<JobStatus, { icon: string; color: string }> = {
  running: { icon: '◐', color: '#60a5fa' },
  queued: { icon: '◯', color: '#facc15' },
  complete: { icon: '✓', color: '#4ade80' },
  failed: { icon: '✕', color: '#f87171' },
};

interface Props {
  navigation: { navigate: (s: string, p?: Record<string, unknown>) => void };
}

export default function RenderQueueScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const filtered = filter === 'all' ? MOCK_JOBS : MOCK_JOBS.filter((j) => j.status === filter);

  const renderJob = ({ item }: { item: Job }) => {
    const statusMeta = STATUS_ICON[item.status];
    const tierMeta = TIER_META[item.tier];
    const isRunning = item.status === 'running';

    return (
      <Pressable
        onPress={() => {
          if (item.status === 'complete') {
            navigation.navigate('ShotReview', { shotId: item.shotName });
          }
        }}
        style={({ pressed }) => [styles.job, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.jobHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.jobProject} numberOfLines={1}>{item.projectName}</Text>
            <Text style={styles.jobShot}>{item.shotName}</Text>
          </View>
          <View style={[styles.tierBadge, { borderColor: tierMeta.color }]}>
            <Text style={[styles.tierText, { color: tierMeta.color }]}>{tierMeta.label}</Text>
          </View>
          <Text style={[styles.statusIcon, { color: statusMeta.color }]}>{statusMeta.icon}</Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${item.progress * 100}%`,
                opacity: isRunning
                  ? pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })
                  : 1,
                backgroundColor:
                  item.status === 'failed'
                    ? '#f87171'
                    : item.status === 'complete'
                    ? '#4ade80'
                    : '#7c3aed',
              },
            ]}
          />
        </View>
        <Text style={styles.eta}>ETA {item.eta}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Render Queue</Text>
      </View>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderJob}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: '#e2e8f0', fontSize: 24, fontWeight: '700' },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#13131f',
  },
  filterBtnActive: { backgroundColor: '#7c3aed' },
  filterText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#ffffff' },
  list: { padding: 16, paddingTop: 4 },
  job: {
    backgroundColor: '#13131f',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  jobHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  jobProject: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  jobShot: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  tierBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 10,
  },
  tierText: { fontSize: 10, fontWeight: '700' },
  statusIcon: { fontSize: 18, fontWeight: '700' },
  progressTrack: {
    height: 4,
    backgroundColor: '#1e1e2e',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 4 },
  eta: { color: '#64748b', fontSize: 11, marginTop: 6, textAlign: 'right' },
});
