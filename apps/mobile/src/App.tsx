import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './navigation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const linking = {
  prefixes: ['animaforge://'],
  config: {
    screens: {
      Main: {
        screens: {
          Projects: {
            screens: {
              ProjectList: 'projects',
              ProjectDetail: 'projects/:projectId',
              ShotDetail: 'projects/:projectId/shots/:shotId',
            },
          },
          Notifications: 'notifications',
          Studio: 'studio',
          Profile: 'profile',
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
        },
      },
    },
  },
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer linking={linking}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <RootNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
