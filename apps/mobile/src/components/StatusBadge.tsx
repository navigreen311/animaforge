import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type ShotStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'complete'
  | 'failed';

interface StatusBadgeProps {
  status: ShotStatus;
  size?: 'sm' | 'md';
}

const STATUS_META: Record<ShotStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#94a3b8', bg: '#1e293b' },
  queued: { label: 'Queued', color: '#facc15', bg: '#3b2f0b' },
  running: { label: 'Running', color: '#60a5fa', bg: '#0b2545' },
  in_progress: { label: 'In Progress', color: '#60a5fa', bg: '#0b2545' },
  review: { label: 'Review', color: '#c084fc', bg: '#2e1065' },
  approved: { label: 'Approved', color: '#4ade80', bg: '#052e16' },
  rejected: { label: 'Rejected', color: '#f87171', bg: '#450a0a' },
  complete: { label: 'Complete', color: '#4ade80', bg: '#052e16' },
  failed: { label: 'Failed', color: '#f87171', bg: '#450a0a' },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: meta.bg },
        size === 'sm' && styles.badgeSm,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.label, { color: meta.color }, size === 'sm' && styles.labelSm]}>
        {meta.label}
      </Text>
    </View>
  );
}

export function statusColor(status: ShotStatus): string {
  return STATUS_META[status].color;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 10,
  },
});
