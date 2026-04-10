import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

type NotifType = 'shot_ready' | 'render_complete' | 'comment' | 'mention' | 'failure';
type Bucket = 'Today' | 'Yesterday' | 'Earlier';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  subtitle: string;
  timeAgo: string;
  bucket: Bucket;
  read: boolean;
  target: { screen: string; params?: Record<string, unknown> };
}

const TYPE_META: Record<NotifType, { icon: string; color: string }> = {
  shot_ready: { icon: '🎬', color: '#7c3aed' },
  render_complete: { icon: '✓', color: '#4ade80' },
  comment: { icon: '💬', color: '#60a5fa' },
  mention: { icon: '@', color: '#c084fc' },
  failure: { icon: '!', color: '#f87171' },
};

const MOCK: Notification[] = [
  { id: 'n1', type: 'shot_ready', title: 'Shot SH-014 ready for review', subtitle: 'Neon Samurai', timeAgo: '5m', bucket: 'Today', read: false, target: { screen: 'ShotReview', params: { shotId: 'SH-014' } } },
  { id: 'n2', type: 'render_complete', title: 'Render complete', subtitle: 'SH-012 · Cyberpunk City', timeAgo: '1h', bucket: 'Today', read: false, target: { screen: 'ShotReview', params: { shotId: 'SH-012' } } },
  { id: 'n3', type: 'comment', title: 'New comment from Maya', subtitle: 'On SH-007', timeAgo: '3h', bucket: 'Today', read: true, target: { screen: 'ShotReview', params: { shotId: 'SH-007' } } },
  { id: 'n4', type: 'mention', title: 'You were mentioned', subtitle: 'In Forest Spirits', timeAgo: '6h', bucket: 'Today', read: true, target: { screen: 'ProjectDetail', params: { projectId: 'p2' } } },
  { id: 'n5', type: 'failure', title: 'Render failed', subtitle: 'SH-001 · Ocean Depths', timeAgo: '1d', bucket: 'Yesterday', read: false, target: { screen: 'RenderQueue' } },
  { id: 'n6', type: 'render_complete', title: 'Batch complete', subtitle: '4 shots in Mecha Pilot', timeAgo: '1d', bucket: 'Yesterday', read: true, target: { screen: 'ProjectDetail', params: { projectId: 'p4' } } },
  { id: 'n7', type: 'comment', title: 'Director left feedback', subtitle: 'On 3 shots', timeAgo: '1d', bucket: 'Yesterday', read: true, target: { screen: 'ProjectDetail', params: { projectId: 'p1' } } },
  { id: 'n8', type: 'shot_ready', title: 'Shot SH-005 ready', subtitle: 'Forest Spirits', timeAgo: '3d', bucket: 'Earlier', read: true, target: { screen: 'ShotReview', params: { shotId: 'SH-005' } } },
  { id: 'n9', type: 'render_complete', title: 'Project exported', subtitle: 'Cyberpunk City Loop', timeAgo: '5d', bucket: 'Earlier', read: true, target: { screen: 'ProjectDetail', params: { projectId: 'p3' } } },
  { id: 'n10', type: 'mention', title: 'Team invite accepted', subtitle: 'Jordan joined', timeAgo: '1w', bucket: 'Earlier', read: true, target: { screen: 'Settings' } },
];

type Row = { kind: 'header'; bucket: Bucket } | { kind: 'item'; item: Notification };

interface Props {
  navigation: { navigate: (s: string, p?: Record<string, unknown>) => void };
}

export default function NotificationsScreen({ navigation }: Props) {
  const [items, setItems] = useState<Notification[]>(MOCK);

  const rows = useMemo<Row[]>(() => {
    const buckets: Bucket[] = ['Today', 'Yesterday', 'Earlier'];
    const out: Row[] = [];
    buckets.forEach((b) => {
      const group = items.filter((n) => n.bucket === b);
      if (group.length > 0) {
        out.push({ kind: 'header', bucket: b });
        group.forEach((item) => out.push({ kind: 'item', item }));
      }
    });
    return out;
  }, [items]);

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handlePress = (n: Notification) => {
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
    navigation.navigate(n.target.screen, n.target.params);
  };

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'header') {
      return <Text style={styles.sectionHeader}>{item.bucket}</Text>;
    }
    const n = item.item;
    const meta = TYPE_META[n.type];
    return (
      <Pressable
        onPress={() => handlePress(n)}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: meta.color + '33' }]}>
          <Text style={[styles.icon, { color: meta.color }]}>{meta.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, !n.read && styles.titleUnread]} numberOfLines={1}>
            {n.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>{n.subtitle}</Text>
        </View>
        <Text style={styles.time}>{n.timeAgo}</Text>
        {!n.read && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable onPress={markAllRead}>
          <Text style={styles.markRead}>Mark all read</Text>
        </Pressable>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r, i) => (r.kind === 'header' ? `h-${r.bucket}` : r.item.id) + i}
        renderItem={renderRow}
        contentContainerStyle={styles.list}
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
  headerTitle: { color: '#e2e8f0', fontSize: 24, fontWeight: '700' },
  markRead: { color: '#7c3aed', fontSize: 13, fontWeight: '600' },
  list: { paddingBottom: 20 },
  sectionHeader: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 2,
    backgroundColor: '#13131f',
    borderRadius: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 18, fontWeight: '700' },
  title: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
  titleUnread: { fontWeight: '700' },
  subtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  time: { color: '#64748b', fontSize: 11, marginLeft: 8 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7c3aed',
    marginLeft: 8,
  },
});
