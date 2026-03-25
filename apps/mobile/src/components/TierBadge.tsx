import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Tier = 'free' | 'pro' | 'studio';

interface Props {
  tier: Tier;
}

const tierConfig: Record<Tier, { label: string; color: string }> = {
  free: { label: 'FREE', color: '#666680' },
  pro: { label: 'PRO', color: '#7c4dff' },
  studio: { label: 'STUDIO', color: '#e040fb' },
};

export default function TierBadge({ tier }: Props) {
  const config = tierConfig[tier] || tierConfig.free;

  return (
    <View style={[styles.badge, { backgroundColor: config.color }]}>
      <Text style={styles.text}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
