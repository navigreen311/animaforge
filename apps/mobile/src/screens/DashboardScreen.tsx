import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import StatusBadge, { ShotStatus } from '../components/StatusBadge';

interface Project {
  id: string;
  title: string;
  status: ShotStatus;
  shotCount: number;
  progress: number;
  updatedAgo: string;
  gradient: [string, string];
}

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', title: 'Neon Samurai Trailer', status: 'in_progress', shotCount: 42, progress: 0.68, updatedAgo: '2h ago', gradient: ['#7c3aed', '#2563eb'] },
  { id: 'p2', title: 'Forest Spirits Short', status: 'review', shotCount: 18, progress: 0.92, updatedAgo: '5h ago', gradient: ['#059669', '#0ea5e9'] },
  { id: 'p3', title: 'Cyberpunk City Loop', status: 'approved', shotCount: 8, progress: 1.0, updatedAgo: '1d ago', gradient: ['#db2777', '#7c3aed'] },
  { id: 'p4', title: 'Mecha Pilot Intro', status: 'queued', shotCount: 24, progress: 0.15, updatedAgo: '3d ago', gradient: ['#d97706', '#dc2626'] },
  { id: 'p5', title: 'Ocean Depths Scene', status: 'draft', shotCount: 12, progress: 0.0, updatedAgo: '1w ago', gradient: ['#0ea5e9', '#1e40af'] },
];

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

export default function DashboardScreen({ navigation }: Props) {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setProjects([...MOCK_PROJECTS]);
      setRefreshing(false);
    }, 800);
  }, []);

  const renderItem = ({ item }: { item: Project }) => (
    <Pressable
      onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.thumb, { backgroundColor: item.gradient[0] }]}>
        <View style={[styles.thumbOverlay, { backgroundColor: item.gradient[1], opacity: 0.5 }]} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <StatusBadge status={item.status} size="sm" />
        </View>
        <Text style={styles.cardMeta}>{item.shotCount} shots  ·  Updated {item.updatedAgo}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${item.progress * 100}%` }]} />
        </View>
      </View>
    </Pressable>
  );

  const empty = (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No projects yet</Text>
      <Text style={styles.emptySub}>Tap + New to create your first project.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Projects</Text>
        <Pressable
          style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.8 }]}
          onPress={() => navigation.navigate('NewProject')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>
      <FlatList
        data={projects}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={projects.length === 0 ? styles.listEmpty : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
        }
        ListEmptyComponent={empty}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { color: '#e2e8f0', fontSize: 28, fontWeight: '700' },
  newBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, paddingTop: 4 },
  listEmpty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#13131f',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.85 },
  thumb: { height: 120, width: '100%', position: 'relative' },
  thumbOverlay: { ...StyleSheet.absoluteFillObject },
  cardBody: { padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '600', flex: 1, marginRight: 10 },
  cardMeta: { color: '#94a3b8', fontSize: 12, marginBottom: 10 },
  progressTrack: {
    height: 4,
    backgroundColor: '#1e1e2e',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: '#7c3aed' },
  empty: { alignItems: 'center' },
  emptyTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: '600', marginBottom: 6 },
  emptySub: { color: '#94a3b8', fontSize: 14 },
});
