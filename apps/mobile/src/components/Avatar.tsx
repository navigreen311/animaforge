import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AvatarProps {
  name?: string;
  uri?: string;
  size?: number;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFromName(name?: string): string {
  const palette = ['#7c3aed', '#2563eb', '#db2777', '#059669', '#d97706', '#dc2626'];
  if (!name) return palette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export default function Avatar({ name, uri, size = 48 }: AvatarProps) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[styles.img, dim]} />;
  }
  return (
    <View style={[styles.fallback, dim, { backgroundColor: colorFromName(name) }]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    backgroundColor: '#13131f',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
