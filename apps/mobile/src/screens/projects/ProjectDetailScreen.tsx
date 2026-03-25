import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { ProjectStackParamList } from '../../navigation';
import { api } from '../../lib/api';
import ShotThumbnail from '../../components/ShotThumbnail';

type NavProp = StackNavigationProp<ProjectStackParamList, 'ProjectDetail'>;
type ScreenRouteProp = RouteProp<ProjectStackParamList, 'ProjectDetail'>;

interface Shot {
  id: string;
  name: string;
  thumbnailUrl?: string;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  duration: number;
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  shots: Shot[];
  characters: { id: string; name: string; avatarUrl?: string }[];
}

type TabKey = 'shots' | 'characters' | 'review';

interface Props {
  navigation: NavProp;
  route: ScreenRouteProp;
}

export default function ProjectDetailScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const [activeTab, setActiveTab] = useState<TabKey>('shots');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<ProjectDetail>(`/projects/${projectId}`),
  });

  if (isLoading || !project) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c4dff" />
      </View>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'shots', label: 'Shots' },
    { key: 'characters', label: 'Characters' },
    { key: 'review', label: 'Review' },
  ];

  return (
    <View style={styles.container}>
      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>{project.description}</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'shots' && (
        <FlatList
          data={project.shots}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <ShotThumbnail
              shot={item}
              onPress={() =>
                navigation.navigate('ShotDetail', {
                  projectId,
                  shotId: item.id,
                  shotName: item.name,
                })
              }
            />
          )}
        />
      )}

      {activeTab === 'characters' && (
        <ScrollView style={styles.content}>
          {project.characters.length === 0 ? (
            <Text style={styles.emptyText}>No characters added yet.</Text>
          ) : (
            project.characters.map((char) => (
              <View key={char.id} style={styles.characterRow}>
                <View style={styles.characterAvatar}>
                  <Text style={styles.characterInitial}>
                    {char.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.characterName}>{char.name}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {activeTab === 'review' && (
        <ScrollView style={styles.content}>
          <Text style={styles.emptyText}>
            Review panel coming soon. Submit shots for team review and approval.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0f0f23',
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  description: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#7c4dff',
  },
  tabText: {
    color: '#666680',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#7c4dff',
  },
  grid: {
    padding: 12,
  },
  gridRow: {
    gap: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyText: {
    color: '#666680',
    fontSize: 14,
    textAlign: 'center',
    paddingTop: 40,
  },
  characterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  characterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a4e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  characterInitial: {
    color: '#7c4dff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  characterName: {
    color: '#e0e0ff',
    fontSize: 16,
  },
});
