import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'generate-video',
    title: 'Generate Video',
    subtitle: 'Create a new AI-generated video clip from a text prompt',
    icon: 'V',
    color: '#7c4dff',
  },
  {
    id: 'create-avatar',
    title: 'Create Avatar',
    subtitle: 'Design a new character avatar for your animations',
    icon: 'A',
    color: '#e040fb',
  },
  {
    id: 'clone-style',
    title: 'Clone Style',
    subtitle: 'Extract and apply visual style from a reference image',
    icon: 'S',
    color: '#00bcd4',
  },
];

/**
 * None of these actions is wired to anything. Each used to open an alert saying
 * "coming soon" only after being tapped, which made a dead card look identical
 * to a working one until you tried it.
 *
 * They stay listed because they describe the intended shape of the mobile
 * studio, but they are rendered unavailable and say why up front.
 */
const UNAVAILABLE_REASON =
  'The mobile app has no generation API to call: apps/mobile ships no client ' +
  'for the platform API, and the web endpoints it would use return fixed ' +
  'sample data rather than starting a job.';

export default function StudioScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Studio</Text>
        <Text style={styles.headerSubtitle}>Quick actions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {quickActions.map((action) => (
          <View
            key={action.id}
            style={[styles.actionCard, styles.actionCardDisabled]}
            accessible
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityHint={UNAVAILABLE_REASON}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
              <Text style={styles.actionIconText}>{action.icon}</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </View>
            <Text style={styles.actionUnavailable}>Not available</Text>
          </View>
        ))}

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Why these are greyed out</Text>
          <Text style={styles.noticeBody}>{UNAVAILABLE_REASON}</Text>
        </View>

        {/* Credits info */}
        <View style={styles.creditsCard}>
          <Text style={styles.creditsTitle}>Generation Credits</Text>
          <Text style={styles.creditsInfo}>
            Each generation uses credits based on resolution and duration. Check your Profile for
            balance.
          </Text>
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
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionUnavailable: {
    fontSize: 11,
    color: '#666680',
  },
  noticeCard: {
    borderWidth: 1,
    borderColor: '#2a2a44',
    borderRadius: 10,
    padding: 14,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a0a0c0',
    marginBottom: 6,
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#666680',
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
  content: {
    padding: 16,
    gap: 16,
  },
  actionCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionIconText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    color: '#e0e0ff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    color: '#666680',
    fontSize: 13,
    lineHeight: 18,
  },
  actionArrow: {
    color: '#666680',
    fontSize: 20,
    marginLeft: 8,
  },
  creditsCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginTop: 8,
  },
  creditsTitle: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  creditsInfo: {
    color: '#666680',
    fontSize: 13,
    lineHeight: 18,
  },
});
