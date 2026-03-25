import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

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

export default function StudioScreen() {
  const handleAction = (action: QuickAction) => {
    Alert.alert(action.title, `${action.subtitle}\n\nThis feature is coming soon.`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Studio</Text>
        <Text style={styles.headerSubtitle}>Quick actions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionCard}
            onPress={() => handleAction(action)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
              <Text style={styles.actionIconText}>{action.icon}</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </View>
            <Text style={styles.actionArrow}>{'>'}</Text>
          </TouchableOpacity>
        ))}

        {/* Credits info */}
        <View style={styles.creditsCard}>
          <Text style={styles.creditsTitle}>Generation Credits</Text>
          <Text style={styles.creditsInfo}>
            Each generation uses credits based on resolution and duration. Check your
            Profile for balance.
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
