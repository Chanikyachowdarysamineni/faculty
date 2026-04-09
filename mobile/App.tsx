import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import FacultyScreen from './src/screens/FacultyScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import WorkloadScreen from './src/screens/WorkloadScreen';
import AllocationScreen from './src/screens/AllocationScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MyWorkloadScreen from './src/screens/MyWorkloadScreen';
import MySubmissionsScreen from './src/screens/MySubmissionsScreen';
import SubmissionFormScreen from './src/screens/SubmissionFormScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Admin Tab Navigator
const AdminTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';
          if (route.name === 'AdminDashboard') iconName = 'home';
          else if (route.name === 'Faculty') iconName = 'people';
          else if (route.name === 'Courses') iconName = 'book';
          else if (route.name === 'Workload') iconName = 'briefcase';
          else if (route.name === 'Allocation') iconName = 'grid';
          else if (route.name === 'Profile') iconName = 'person';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
        },
      })}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Faculty"
        component={FacultyScreen}
        options={{ title: 'Faculty' }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesScreen}
        options={{ title: 'Courses' }}
      />
      <Tab.Screen
        name="Workload"
        component={WorkloadScreen}
        options={{ title: 'Workload' }}
      />
      <Tab.Screen
        name="Allocation"
        component={AllocationScreen}
        options={{ title: 'Allocation' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Faculty Tab Navigator
const FacultyTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';
          if (route.name === 'FacultyDashboard') iconName = 'home';
          else if (route.name === 'MyWorkload') iconName = 'briefcase';
          else if (route.name === 'SubmitForm') iconName = 'document-text';
          else if (route.name === 'MySubmissions') iconName = 'checkmark-circle';
          else if (route.name === 'FacultyProfile') iconName = 'person';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
        },
      })}
    >
      <Tab.Screen
        name="FacultyDashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="MyWorkload"
        component={MyWorkloadScreen}
        options={{ title: 'My Workload' }}
      />
      <Tab.Screen
        name="SubmitForm"
        component={SubmissionFormScreen}
        options={{ title: 'Submit Form' }}
      />
      <Tab.Screen
        name="MySubmissions"
        component={MySubmissionsScreen}
        options={{ title: 'My Submissions' }}
      />
      <Tab.Screen
        name="FacultyProfile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const RootNavigator = ({ userRole, isAdmin }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      {isAdmin ? (
        <Stack.Screen
          name="AdminTabs"
          component={AdminTabNavigator}
          options={{ animationEnabled: false }}
        />
      ) : (
        <Stack.Screen
          name="FacultyTabs"
          component={FacultyTabNavigator}
          options={{ animationEnabled: false }}
        />
      )}
    </Stack.Navigator>
  );
};

const Navigation = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {user ? (
          <Stack.Screen
            name="Root"
            component={() => (
              <RootNavigator
                userRole={user.role}
                isAdmin={user.role === 'admin' || user.canAccessAdmin === true}
              />
            )}
            options={{ animationEnabled: false }}
          />
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              animationEnabled: false,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
      <StatusBar barStyle="dark-content" />
    </AuthProvider>
  );
}
