import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import OwnerHomeScreen from '../screens/owner/OwnerHomeScreen';
import MyVehiclesScreen from '../screens/owner/MyVehiclesScreen';
import TrackingScreen from '../screens/owner/TrackingScreen';
import ProfileScreen from '../screens/auth/ProfileScreen';
import AddVehicleScreen from '../screens/owner/AddVehicleScreen'; // Corrected path assuming it's in owner folder
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="OwnerHome" component={OwnerHomeScreen} />
    <Stack.Screen name="AddVehicle" component={AddVehicleScreen} />
    <Stack.Screen name="Vehicles" component={MyVehiclesScreen} />
  </Stack.Navigator>
);

const OwnerNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Tracking') {
          iconName = focused ? 'location' : 'location-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      headerShown: false,
      tabBarActiveTintColor: '#2E7D32',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Home" component={HomeStackNavigator} />
    <Tab.Screen name="Tracking" component={TrackingScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default OwnerNavigator;