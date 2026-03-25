import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  credits: number;
  size?: 'small' | 'medium';
}

function getCreditColor(credits: number): string {
  if (credits >= 50) return '#4caf50';
  if (credits >= 20) return '#ff9800';
  return '#f44336';
}

export default function CreditBadge({ credits, size = 'medium' }: Props) {
  const color = getCreditColor(credits);
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }, isSmall && styles.badgeSmall]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }, isSmall && styles.textSmall]}>
        {credits}
      </Text>
      {!isSmall && <Text style={[styles.label, { color }]}>credits</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
