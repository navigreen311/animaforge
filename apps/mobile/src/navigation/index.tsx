import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../hooks/useAuth';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main screens
import ProjectListScreen from '../screens/projects/ProjectListScreen';
import ProjectDetailScreen from '../screens/projects/ProjectDetailScreen';
import ShotDetailScreen from '../screens/projects/ShotDetailScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import StudioScreen from '../screens/studio/StudioScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// --- Type definitions ---

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type ProjectStackParamList = {
  ProjectList: undefined;
  ProjectDetail: { projectId: string; projectName: string };
  ShotDetail: { projectId: string; shotId: string; shotName: string };
  Timeline: { projectId: string };
};

export type MainTabParamList = {
  Projects: undefined;
  Notifications: undefined;
  Studio: undefined;
  Profile: undefined;
};

// --- Navigators ---

const AuthStackNav = createStackNavigator<AuthStackParamList>();
const ProjectStackNav = createStackNavigator<ProjectStackParamList>();
const MainTabNav = createBottomTabNavigator<MainTabParamList>();
const RootStack = createStackNavigator();

// --- Auth Stack ---

function AuthStack() {
  return (
    <AuthStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#e0e0ff',
        headerTitleStyle: { fontWeight: 'bold' },
        cardStyle: { backgroundColor: '#0f0f23' },
      }}
    >
      <AuthStackNav.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <AuthStackNav.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
    </AuthStackNav.Navigator>
  );
}

// --- Project Stack ---

function ProjectStack() {
  return (
    <ProjectStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#e0e0ff',
        headerTitleStyle: { fontWeight: 'bold' },
        cardStyle: { backgroundColor: '#0f0f23' },
      }}
    >
      <ProjectStackNav.Screen
        name="ProjectList"
        component={ProjectListScreen}
        options={{ title: 'My Projects' }}
      />
      <ProjectStackNav.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={({ route }) => ({ title: route.params.projectName })}
      />
      <ProjectStackNav.Screen
        name="ShotDetail"
        component={ShotDetailScreen}
        options={({ route }) => ({ title: route.params.shotName })}
      />
    </ProjectStackNav.Navigator>
  );
}

// --- Main Tabs ---

function MainTabs() {
  return (
    <MainTabNav.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#2a2a4e',
        },
        tabBarActiveTintColor: '#7c4dff',
        tabBarInactiveTintColor: '#666680',
      }}
    >
      <MainTabNav.Screen
        name="Projects"
        component={ProjectStack}
        options={{ tabBarLabel: 'Projects' }}
      />
      <MainTabNav.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarLabel: 'Alerts' }}
      />
      <MainTabNav.Screen
        name="Studio"
        component={StudioScreen}
        options={{ tabBarLabel: 'Studio' }}
      />
      <MainTabNav.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </MainTabNav.Navigator>
  );
}

// --- Root Navigator ---

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Splash screen handled by Expo
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name="Main" component={MainTabs} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthStack} />
      )}
    </RootStack.Navigator>
  );
}
