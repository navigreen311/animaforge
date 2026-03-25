import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { ProjectStackParamList } from '../../navigation';
import { api } from '../../lib/api';
import ProjectCard from '../../components/ProjectCard';

type NavProp = StackNavigationProp<ProjectStackParamList, 'ProjectList'>;

interface Project {
  id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  shotCount: number;
  status: 'active' | 'archived' | 'draft';
  updatedAt: string;
}

interface Props {
  navigation: NavProp;
}

export default function ProjectListScreen({ navigation }: Props) {
  const {
    data: projects,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects'),
  });

  const handleProjectPress = useCallback(
    (project: Project) => {
      navigation.navigate('ProjectDetail', {
        projectId: project.id,
        projectName: project.name,
      });
    },
    [navigation],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c4dff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard project={item} onPress={() => handleProjectPress(item)} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#7c4dff"
            colors={['#7c4dff']}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No Projects Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first project from the Studio tab
            </Text>
          </View>
        }
      />
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
  list: {
    padding: 16,
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e0e0ff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666680',
    textAlign: 'center',
  },
});
