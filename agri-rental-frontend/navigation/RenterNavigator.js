import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import RenterHomeScreen from '../screens/renter/RenterHomeScreen';
import VehicleListScreen from '../screens/renter/VehicleListScreen';
import VehicleDetailsScreen from '../screens/renter/VehicleDetailsScreen';
import BookVehicleScreen from '../screens/renter/BookVehicleScreen';
import ProfileScreen from '../screens/auth/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/**
 * Stack for the "Home" tab.
 * It includes the main home screen and screens you can navigate to from it.
 */
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RenterHome" component={RenterHomeScreen} />
    <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
    <Stack.Screen name="BookVehicle" component={BookVehicleScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    {/* This allows navigating from the home screen's "Find Equipment" button to the full list */}
    <Stack.Screen name="Vehicles" component={VehicleListScreen} />
  </Stack.Navigator>
);

/**
 * Stack for the "Vehicles" tab.
 * This allows you to navigate from the list to the details and booking screens.
 */
const VehicleStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VehicleList" component={VehicleListScreen} />
    <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
    <Stack.Screen name="BookVehicle" component={BookVehicleScreen} />
  </Stack.Navigator>
);

/**
 * Stack for the "Profile" tab.
 * Encapsulates the profile screen and any future related screens (e.g., Edit Profile).
 */
const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);


/**
 * The main Renter Tab Navigator.
 * Each tab is now its own independent navigation stack.
 */
const RenterNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Vehicles') {
          iconName = focused ? 'car-sport' : 'car-sport-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person-circle' : 'person-circle-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      headerShown: false,
      tabBarActiveTintColor: '#2E7D32',
      tabBarInactiveTintColor: 'gray',
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
      },
      tabBarStyle: {
        paddingTop: 5,
        height: 60,
        paddingBottom: 5,
      }
    })}
  >
    <Tab.Screen name="Home" component={HomeStack} />
    <Tab.Screen name="Vehicles" component={VehicleStack} />
    <Tab.Screen name="Profile" component={ProfileStack} />
  </Tab.Navigator>
);

export default RenterNavigator;
