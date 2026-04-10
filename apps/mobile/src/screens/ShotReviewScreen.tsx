import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import StatusBadge from '../components/StatusBadge';

interface Props {
  navigation: { goBack: () => void };
  route: { params: { shotId: string } };
}

interface QualityScore {
  label: string;
  value: number;
}

const SCORES: QualityScore[] = [
  { label: 'Stability', value: 0.92 },
  { label: 'Identity', value: 0.88 },
  { label: 'Lipsync', value: 0.76 },
];

export default function ShotReviewScreen({ navigation, route }: Props) {
  const { shotId } = route.params;
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    Alert.alert('Approved', `Shot ${shotId} has been approved.`);
  };

  const handleReject = () => {
    Alert.alert('Rejected', `Shot ${shotId} rejected.`);
  };

  const handleRegenerate = () => {
    Alert.alert('Regenerating', `Shot ${shotId} queued for regeneration.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.preview}>
        <View style={styles.previewInner}>
          <Text style={styles.previewText}>▶ Preview</Text>
          <Text style={styles.previewSub}>Shot {shotId}</Text>
        </View>
        <Pressable
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.infoBar}>
        <View>
          <Text style={styles.shotNum}>{shotId}</Text>
          <Text style={styles.duration}>00:04.2</Text>
        </View>
        <StatusBadge status="review" />
      </View>

      <View style={styles.scoresRow}>
        {SCORES.map((s) => (
          <View key={s.label} style={styles.score}>
            <Text style={styles.scoreLabel}>{s.label}</Text>
            <View style={styles.scoreTrack}>
              <View
                style={[
                  styles.scoreFill,
                  {
                    width: `${s.value * 100}%`,
                    backgroundColor: s.value > 0.85 ? '#4ade80' : s.value > 0.7 ? '#facc15' : '#f87171',
                  },
                ]}
              />
            </View>
            <Text style={styles.scoreValue}>{Math.round(s.value * 100)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          disabled={submitting}
          onPress={handleApprove}
          style={({ pressed }) => [styles.actionBtn, styles.approveBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.actionText}>✓ Approve</Text>
        </Pressable>
        <Pressable
          onPress={handleReject}
          style={({ pressed }) => [styles.actionBtn, styles.rejectBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.actionText}>✗ Reject</Text>
        </Pressable>
        <Pressable
          onPress={handleRegenerate}
          style={({ pressed }) => [styles.actionBtn, styles.regenBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.actionText}>↻ Regen</Text>
        </Pressable>
      </View>

      <View style={styles.commentRow}>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Add a comment..."
          placeholderTextColor="#64748b"
          style={styles.commentInput}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  preview: {
    flex: 0.8,
    backgroundColor: '#13131f',
    margin: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewInner: { alignItems: 'center' },
  previewText: { color: '#7c3aed', fontSize: 48 },
  previewSub: { color: '#94a3b8', fontSize: 14, marginTop: 6 },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#e2e8f0', fontSize: 16 },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  shotNum: { color: '#e2e8f0', fontSize: 16, fontWeight: '700' },
  duration: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  scoresRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  score: { flex: 1 },
  scoreLabel: { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
  scoreTrack: {
    height: 4,
    backgroundColor: '#1e1e2e',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreFill: { height: 4 },
  scoreValue: { color: '#e2e8f0', fontSize: 11, marginTop: 3, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveBtn: { backgroundColor: '#059669' },
  rejectBtn: { backgroundColor: '#dc2626' },
  regenBtn: { backgroundColor: '#7c3aed' },
  actionText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  commentRow: { padding: 16 },
  commentInput: {
    backgroundColor: '#13131f',
    color: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 14,
  },
});
