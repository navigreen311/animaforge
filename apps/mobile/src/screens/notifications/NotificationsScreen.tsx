import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface Notification {
  id: string;
  type: 'job_complete' | 'review_request' | 'collab_invite';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, string>;
}

const typeLabels: Record<Notification['type'], string> = {
  job_complete: 'Job Complete',
  review_request: 'Review Request',
  collab_invite: 'Invitation',
};

const typeColors: Record<Notification['type'], string> = {
  job_complete: '#4caf50',
  review_request: '#ff9800',
  collab_invite: '#2196f3',
};

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const {
    data: notifications,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<Notification[]>(['notifications']);
      queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.filter((n) => n.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(['notifications'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const renderRightActions = useCallback(
    () => (
      <View style={styles.swipeAction}>
        <Text style={styles.swipeActionText}>Dismiss</Text>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <Swipeable
        renderRightActions={renderRightActions}
        onSwipeableRightOpen={() => dismissMutation.mutate(item.id)}
      >
        <View style={[styles.notificationCard, !item.read && styles.unread]}>
          <View style={styles.notificationHeader}>
            <View
              style={[styles.typeBadge, { backgroundColor: typeColors[item.type] }]}
            >
              <Text style={styles.typeBadgeText}>{typeLabels[item.type]}</Text>
            </View>
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationBody}>{item.body}</Text>
        </View>
      </Swipeable>
    ),
    [dismissMutation, renderRightActions],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c4dff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#7c4dff"
            colors={['#7c4dff']}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>All Caught Up</Text>
            <Text style={styles.emptySubtitle}>No new notifications</Text>
          </View>
        }
      />
    </View>
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
  list: {
    padding: 16,
    gap: 12,
  },
  notificationCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2a2a4e',
  },
  unread: {
    borderLeftColor: '#7c4dff',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  time: {
    color: '#666680',
    fontSize: 12,
  },
  notificationTitle: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationBody: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
  },
  swipeAction: {
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    borderRadius: 12,
    marginLeft: 8,
  },
  swipeActionText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e0e0ff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666680',
  },
});
