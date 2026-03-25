import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  progress: number; // 0-100
  stage?: string;
}

export default function GenerationProgress({ progress, stage }: Props) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedWidth]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{stage || 'Generating...'}</Text>
        <Text style={styles.percentage}>{Math.round(progress)}%</Text>
      </View>

      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: widthInterpolation }]}
        />
      </View>

      <Text style={styles.hint}>
        {progress < 30
          ? 'Initializing pipeline...'
          : progress < 60
            ? 'Processing frames...'
            : progress < 90
              ? 'Rendering output...'
              : 'Finalizing...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#e0e0ff',
    fontSize: 14,
    fontWeight: '600',
  },
  percentage: {
    color: '#7c4dff',
    fontSize: 14,
    fontWeight: '700',
  },
  track: {
    height: 6,
    backgroundColor: '#2a2a4e',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#7c4dff',
    borderRadius: 3,
  },
  hint: {
    color: '#666680',
    fontSize: 12,
    marginTop: 6,
  },
});
