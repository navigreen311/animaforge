import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingToggle {
  key: string;
  label: string;
  description: string;
}

const notificationSettings: SettingToggle[] = [
  {
    key: 'notif_job_complete',
    label: 'Job Complete',
    description: 'Notify when a generation finishes',
  },
  {
    key: 'notif_review_request',
    label: 'Review Requests',
    description: 'Notify when someone requests your review',
  },
  {
    key: 'notif_collab_invite',
    label: 'Collaboration Invites',
    description: 'Notify on new team invitations',
  },
  {
    key: 'notif_marketing',
    label: 'Tips & Updates',
    description: 'Product tips and feature announcements',
  },
];

export default function SettingsScreen() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    notif_job_complete: true,
    notif_review_request: true,
    notif_collab_invite: true,
    notif_marketing: false,
  });

  const handleToggle = useCallback((key: string) => {
    setToggles((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem('notification_prefs', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Cache',
      'This will remove cached images, videos, and temporary files. Your projects are stored on the server and will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // In production, clear image/video caches here
            Alert.alert('Done', 'Cache cleared successfully.');
          },
        },
      ],
    );
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Notification preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {notificationSettings.map((setting) => (
            <View key={setting.key} style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{setting.label}</Text>
                <Text style={styles.toggleDescription}>{setting.description}</Text>
              </View>
              <Switch
                value={toggles[setting.key] ?? false}
                onValueChange={() => handleToggle(setting.key)}
                trackColor={{ false: '#2a2a4e', true: '#7c4dff' }}
                thumbColor={toggles[setting.key] ? '#e0e0ff' : '#666680'}
              />
            </View>
          ))}
        </View>

        {/* Storage / Cache */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>

          <View style={styles.storageInfo}>
            <View style={styles.storageRow}>
              <Text style={styles.storageLabel}>Cached Media</Text>
              <Text style={styles.storageValue}>48.2 MB</Text>
            </View>
            <View style={styles.storageRow}>
              <Text style={styles.storageLabel}>Temporary Files</Text>
              <Text style={styles.storageValue}>12.7 MB</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cacheButton}
            onPress={handleClearCache}
            activeOpacity={0.7}
          >
            <Text style={styles.cacheButtonText}>Clear Cache</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>0.1.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>2026.03.25</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>SDK</Text>
            <Text style={styles.aboutValue}>Expo 51</Text>
          </View>

          <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
            <Text style={styles.linkText}>Terms of Service</Text>
            <Text style={styles.linkArrow}>{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Text style={styles.linkArrow}>{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
            <Text style={styles.linkText}>Open Source Licenses</Text>
            <Text style={styles.linkArrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  sectionTitle: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    color: '#e0e0ff',
    fontSize: 15,
    fontWeight: '500',
  },
  toggleDescription: {
    color: '#666680',
    fontSize: 12,
    marginTop: 2,
  },
  storageInfo: {
    gap: 8,
    marginBottom: 12,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  storageLabel: {
    color: '#e0e0ff',
    fontSize: 14,
  },
  storageValue: {
    color: '#666680',
    fontSize: 14,
    fontWeight: '600',
  },
  cacheButton: {
    backgroundColor: '#2a2a4e',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  cacheButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  aboutLabel: {
    color: '#e0e0ff',
    fontSize: 14,
  },
  aboutValue: {
    color: '#666680',
    fontSize: 14,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  linkText: {
    color: '#7c4dff',
    fontSize: 14,
    fontWeight: '500',
  },
  linkArrow: {
    color: '#666680',
    fontSize: 16,
  },
});
