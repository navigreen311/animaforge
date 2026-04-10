import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import Avatar from '../components/Avatar';

interface NotifPrefs {
  shotReady: boolean;
  renderComplete: boolean;
  comments: boolean;
  mentions: boolean;
  failures: boolean;
}

export default function SettingsScreen() {
  const [notifs, setNotifs] = useState<NotifPrefs>({
    shotReady: true,
    renderComplete: true,
    comments: true,
    mentions: true,
    failures: true,
  });
  const [darkMode, setDarkMode] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);

  const toggle = <K extends keyof NotifPrefs>(key: K) =>
    setNotifs((p) => ({ ...p, [key]: !p[key] }));

  const signOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>Settings</Text>

        <Section title="Profile">
          <View style={styles.profile}>
            <Avatar name="Alex Rivera" size={64} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Alex Rivera</Text>
              <Text style={styles.profileEmail}>alex@animaforge.io</Text>
            </View>
          </View>
        </Section>

        <Section title="Push notifications">
          <SettingRow label="Shot ready" value={notifs.shotReady} onChange={() => toggle('shotReady')} />
          <SettingRow label="Render complete" value={notifs.renderComplete} onChange={() => toggle('renderComplete')} />
          <SettingRow label="Comments" value={notifs.comments} onChange={() => toggle('comments')} />
          <SettingRow label="Mentions" value={notifs.mentions} onChange={() => toggle('mentions')} />
          <SettingRow label="Failures" value={notifs.failures} onChange={() => toggle('failures')} last />
        </Section>

        <Section title="App preferences">
          <SettingRow label="Dark theme" value={darkMode} onChange={() => setDarkMode((v) => !v)} />
          <SettingRow label="Haptic feedback" value={hapticsOn} onChange={() => setHapticsOn((v) => !v)} />
          <InfoRow label="Language" value="English" last />
        </Section>

        <Section title="About">
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Terms of Service" value="›" tappable />
          <InfoRow label="Privacy Policy" value="›" tappable last />
        </Section>

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingRow({
  label,
  value,
  onChange,
  last,
}: {
  label: string;
  value: boolean;
  onChange: () => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#1e1e2e', true: '#7c3aed' }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

function InfoRow({
  label,
  value,
  tappable,
  last,
}: {
  label: string;
  value: string;
  tappable?: boolean;
  last?: boolean;
}) {
  const content = (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
  if (tappable) return <Pressable onPress={() => {}}>{content}</Pressable>;
  return content;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  scroll: { padding: 20, paddingBottom: 40 },
  screenTitle: { color: '#e2e8f0', fontSize: 28, fontWeight: '700', marginBottom: 20 },
  section: { marginBottom: 22 },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionBody: {
    backgroundColor: '#13131f',
    borderRadius: 12,
    overflow: 'hidden',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  profileInfo: { marginLeft: 14, flex: 1 },
  profileName: { color: '#e2e8f0', fontSize: 16, fontWeight: '700' },
  profileEmail: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#1e1e2e' },
  rowLabel: { color: '#e2e8f0', fontSize: 14 },
  rowValue: { color: '#94a3b8', fontSize: 14 },
  signOut: {
    backgroundColor: '#450a0a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  signOutText: { color: '#f87171', fontSize: 15, fontWeight: '700' },
});
