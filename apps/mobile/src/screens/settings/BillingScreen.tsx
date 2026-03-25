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
import TierBadge from '../../components/TierBadge';
import CreditBadge from '../../components/CreditBadge';

type Tier = 'free' | 'pro' | 'studio';

interface PlanInfo {
  tier: Tier;
  name: string;
  price: string;
  credits: number;
  features: string[];
  color: string;
}

const plans: PlanInfo[] = [
  {
    tier: 'free',
    name: 'Free',
    price: '$0/mo',
    credits: 10,
    features: [
      '10 credits per month',
      '720p max resolution',
      '5s max duration',
      'Community support',
    ],
    color: '#666680',
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$29/mo',
    credits: 100,
    features: [
      '100 credits per month',
      '1080p max resolution',
      '30s max duration',
      'Priority queue',
      'Style cloning',
      'Email support',
    ],
    color: '#7c4dff',
  },
  {
    tier: 'studio',
    name: 'Studio',
    price: '$99/mo',
    credits: 500,
    features: [
      '500 credits per month',
      '4K max resolution',
      '120s max duration',
      'Highest priority queue',
      'All style options',
      'Team collaboration',
      'API access',
      'Dedicated support',
    ],
    color: '#e040fb',
  },
];

export default function BillingScreen() {
  const { user } = useAuth();
  const currentTier: Tier = (user?.tier as Tier) || 'free';
  const credits = user?.credits ?? 0;

  const handleUpgrade = (plan: PlanInfo) => {
    if (plan.tier === currentTier) {
      Alert.alert('Current Plan', 'You are already on this plan.');
      return;
    }
    Alert.alert(
      `Upgrade to ${plan.name}`,
      `Switch to the ${plan.name} plan for ${plan.price}?\n\nYou will receive ${plan.credits} credits per month.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: () => {
            Alert.alert('Coming Soon', 'In-app purchases will be available in a future update.');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Billing</Text>
        <Text style={styles.headerSubtitle}>Manage your subscription and credits</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current plan overview */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View>
              <Text style={styles.overviewLabel}>Current Plan</Text>
              <TierBadge tier={currentTier} />
            </View>
            <View style={styles.overviewCredits}>
              <Text style={styles.overviewLabel}>Credits</Text>
              <CreditBadge credits={credits} />
            </View>
          </View>
        </View>

        {/* Credit usage */}
        <View style={styles.usageCard}>
          <Text style={styles.usageTitle}>Credit Balance</Text>
          <View style={styles.usageBar}>
            <View
              style={[
                styles.usageFill,
                {
                  width: `${Math.min((credits / (plans.find((p) => p.tier === currentTier)?.credits ?? 10)) * 100, 100)}%`,
                  backgroundColor:
                    credits >= 50 ? '#4caf50' : credits >= 20 ? '#ff9800' : '#f44336',
                },
              ]}
            />
          </View>
          <View style={styles.usageRow}>
            <Text style={styles.usageText}>{credits} remaining</Text>
            <Text style={styles.usageText}>
              {plans.find((p) => p.tier === currentTier)?.credits ?? 0} total
            </Text>
          </View>
        </View>

        {/* Plan cards */}
        <Text style={styles.plansTitle}>Available Plans</Text>
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          return (
            <View
              key={plan.tier}
              style={[
                styles.planCard,
                isCurrent && { borderColor: plan.color, borderWidth: 2 },
              ]}
            >
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                </View>
                {isCurrent && (
                  <View style={[styles.currentBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.currentBadgeText}>CURRENT</Text>
                  </View>
                )}
              </View>

              <View style={styles.featureList}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Text style={styles.featureCheck}>+</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {!isCurrent && (
                <TouchableOpacity
                  style={[styles.upgradeButton, { backgroundColor: plan.color }]}
                  onPress={() => handleUpgrade(plan)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.upgradeButtonText}>
                    {plans.indexOf(plan) > plans.findIndex((p) => p.tier === currentTier)
                      ? 'Upgrade'
                      : 'Downgrade'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
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
    paddingBottom: 40,
  },
  overviewCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  overviewLabel: {
    color: '#666680',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  overviewCredits: {
    alignItems: 'flex-end',
  },
  usageCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  usageTitle: {
    color: '#e0e0ff',
    fontSize: 15,
    fontWeight: '600',
  },
  usageBar: {
    height: 8,
    backgroundColor: '#2a2a4e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: 4,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  usageText: {
    color: '#666680',
    fontSize: 12,
  },
  plansTitle: {
    color: '#e0e0ff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  planCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    gap: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    color: '#e0e0ff',
    fontSize: 20,
    fontWeight: '700',
  },
  planPrice: {
    color: '#999',
    fontSize: 16,
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  featureList: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureCheck: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  featureText: {
    color: '#ccccdd',
    fontSize: 14,
  },
  upgradeButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
