import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getOfflineProjects,
  getPendingActions,
  getStorageUsage,
  isOffline,
  syncPendingActions,
  clearOfflineData,
  OfflineAction,
  OfflineProject,
  StorageUsage,
} from '../../lib/offlineManager';
import { clearCache, getCacheSize } from '../../lib/cacheManager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OfflineScreen() {
  const [offline, setOffline] = useState(false);
  const [projects, setProjects] = useState<OfflineProject[]>([]);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [mediaCacheSize, setMediaCacheSize] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);

  const refresh = useCallback(async () => {
    const [offlineStatus, proj, actions, usage, cacheBytes] =
      await Promise.all([
        isOffline(),
        getOfflineProjects(),
        getPendingActions(),
        getStorageUsage(),
        getCacheSize(),
      ]);
    setOffline(offlineStatus);
    setProjects(proj);
    setPendingActions(actions);
    setStorage(usage);
    setMediaCacheSize(cacheBytes);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncPendingActions();
      Alert.alert(
        'Sync Complete',
        `Synced: ${result.synced}  |  Failed: ${result.failed}`,
      );
    } catch {
      Alert.alert('Sync Error', 'Unable to sync actions. Please try again.');
    } finally {
      setSyncing(false);
      refresh();
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Remove all cached media and offline data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            await Promise.all([clearCache(), clearOfflineData()]);
            setClearing(false);
            refresh();
          },
        },
      ],
    );
  };

  const totalUsed = (storage?.used ?? 0) + mediaCacheSize;
  const totalCapacity = totalUsed + (storage?.available ?? 0);
  const usagePercent =
    totalCapacity > 0 ? Math.min((totalUsed / totalCapacity) * 100, 100) : 0;

  return (
    <View style={styles.container}>
      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            You are currently offline
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>
        <View style={styles.usageBarBg}>
          <View
            style={[styles.usageBarFill, { width: `${usagePercent}%` }]}
          />
        </View>
        <Text style={styles.usageText}>
          {formatBytes(totalUsed)} / {formatBytes(totalCapacity)} used
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Cached Projects ({projects.length})
        </Text>
        {projects.length === 0 ? (
          <Text style={styles.emptyText}>No projects cached for offline use.</Text>
        ) : (
          <FlatList
            data={projects}
            keyExtractor={(item) => item.projectId}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const size =
                storage?.projects.find((p) => p.name === item.name)?.size ?? 0;
              return (
                <View style={styles.projectRow}>
                  <Text style={styles.projectName}>{item.name}</Text>
                  <Text style={styles.projectSize}>{formatBytes(size)}</Text>
                </View>
              );
            }}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Pending Actions ({pendingActions.length})
        </Text>
        {pendingActions.length === 0 ? (
          <Text style={styles.emptyText}>All actions are synced.</Text>
        ) : (
          <FlatList
            data={pendingActions}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.actionRow}>
                <Text style={styles.actionType}>
                  {item.type.toUpperCase()}
                </Text>
                <Text style={styles.actionResource}>{item.resource}</Text>
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.buttonGroup}>
        <Pressable
          style={[styles.button, styles.syncButton]}
          onPress={handleSync}
          disabled={syncing || pendingActions.length === 0}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sync Now</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.button, styles.clearButton]}
          onPress={handleClearCache}
          disabled={clearing}
        >
          {clearing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Clear Cache</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    padding: 16,
  },
  offlineBanner: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#666680',
    fontSize: 13,
    fontStyle: 'italic',
  },
  usageBarBg: {
    height: 10,
    backgroundColor: '#2a2a4e',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: '#7c4dff',
    borderRadius: 5,
  },
  usageText: {
    color: '#999',
    fontSize: 12,
  },
  projectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a4e',
  },
  projectName: {
    color: '#e0e0ff',
    fontSize: 14,
  },
  projectSize: {
    color: '#999',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a4e',
  },
  actionType: {
    color: '#7c4dff',
    fontWeight: '700',
    fontSize: 11,
    width: 60,
  },
  actionResource: {
    color: '#e0e0ff',
    fontSize: 13,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButton: {
    backgroundColor: '#7c4dff',
  },
  clearButton: {
    backgroundColor: '#444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
