import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { statusColor, ShotStatus } from '../components/StatusBadge';

interface Shot {
  id: string;
  number: string;
  status: ShotStatus;
  gradient: string;
}

interface Props {
  navigation: { navigate: (s: string, p?: Record<string, unknown>) => void; goBack: () => void };
  route: { params: { projectId: string } };
}

const MOCK_SHOTS: Shot[] = [
  { id: 's1', number: 'SH-001', status: 'approved', gradient: '#7c3aed' },
  { id: 's2', number: 'SH-002', status: 'approved', gradient: '#2563eb' },
  { id: 's3', number: 'SH-003', status: 'review', gradient: '#db2777' },
  { id: 's4', number: 'SH-004', status: 'in_progress', gradient: '#059669' },
  { id: 's5', number: 'SH-005', status: 'in_progress', gradient: '#d97706' },
  { id: 's6', number: 'SH-006', status: 'queued', gradient: '#0ea5e9' },
  { id: 's7', number: 'SH-007', status: 'draft', gradient: '#6366f1' },
  { id: 's8', number: 'SH-008', status: 'failed', gradient: '#dc2626' },
];

export default function ProjectDetailScreen({ navigation, route }: Props) {
  const { projectId } = route.params;

  const stats = useMemo(() => {
    const total = MOCK_SHOTS.length;
    const approved = MOCK_SHOTS.filter((s) => s.status === 'approved').length;
    const inProgress = MOCK_SHOTS.filter(
      (s) => s.status === 'in_progress' || s.status === 'queued' || s.status === 'running'
    ).length;
    return { total, approved, inProgress };
  }, []);

  const renderShot = ({ item }: { item: Shot }) => (
    <Pressable
      onPress={() => navigation.navigate('ShotReview', { shotId: item.id })}
      style={({ pressed }) => [
        styles.shot,
        { borderColor: statusColor(item.status) },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.shotThumb, { backgroundColor: item.gradient }]} />
      <Text style={styles.shotNumber}>{item.number}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.headerBtn}>{'‹ Back'}</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Project {projectId}</Text>
        <Pressable hitSlop={12}>
          <Text style={styles.headerBtn}>⋯</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Approved" value={stats.approved} color="#4ade80" />
        <Stat label="In Progress" value={stats.inProgress} color="#60a5fa" />
      </View>

      <FlatList
        data={MOCK_SHOTS}
        keyExtractor={(i) => i.id}
        renderItem={renderShot}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}
        onPress={() => {}}
      >
        <Text style={styles.fabText}>+ Generate shot</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Stat({ label, value, color = '#e2e8f0' }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBtn: { color: '#7c3aed', fontSize: 16, fontWeight: '600', minWidth: 48 },
  headerTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#13131f',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  grid: { paddingHorizontal: 12, paddingBottom: 100 },
  row: { justifyContent: 'space-between' },
  shot: {
    width: '48%',
    backgroundColor: '#13131f',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  shotThumb: { aspectRatio: 16 / 9, width: '100%' },
  shotNumber: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    padding: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  fabText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
