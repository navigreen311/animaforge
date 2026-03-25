import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';

const tierColors: Record<string, string> = {
  free: '#666680',
  pro: '#7c4dff',
  studio: '#e040fb',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar & name */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.email}>{user.email}</Text>

          {/* Tier badge */}
          <View
            style={[
              styles.tierBadge,
              { backgroundColor: tierColors[user.tier] || tierColors.free },
            ]}
          >
            <Text style={styles.tierText}>{user.tier.toUpperCase()}</Text>
          </View>
        </View>

        {/* Credits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credits</Text>
          <View style={styles.creditsRow}>
            <Text style={styles.creditsAmount}>{user.credits}</Text>
            <Text style={styles.creditsLabel}>remaining</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Notification Preferences</Text>
            <Text style={styles.settingArrow}>{'>'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Appearance</Text>
            <Text style={styles.settingArrow}>{'>'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>API Keys</Text>
            <Text style={styles.settingArrow}>{'>'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Privacy & Security</Text>
            <Text style={styles.settingArrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>AnimaForge Mobile v0.1.0</Text>
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
  },
  profileCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7c4dff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  displayName: {
    color: '#e0e0ff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    color: '#666680',
    fontSize: 14,
    marginBottom: 12,
  },
  tierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  section: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  creditsAmount: {
    color: '#7c4dff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  creditsLabel: {
    color: '#666680',
    fontSize: 14,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  settingLabel: {
    color: '#e0e0ff',
    fontSize: 15,
  },
  settingArrow: {
    color: '#666680',
    fontSize: 18,
  },
  logoutButton: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
