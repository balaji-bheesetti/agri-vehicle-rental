import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native'; // For running logic when screen is focused
import apiClient from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VoiceAssistant from '../../components/VoiceAssistant'; // 1. Import the VoiceAssistant component

const CATEGORIES = [
  { name: 'Tractors', icon: 'car', color: '#2E7D32' },
  { name: 'Harvesters', icon: 'leaf', color: '#4CAF50' },
  { name: 'Plows', icon: 'construct', color: '#FF9800' },
  { name: 'Sprayers', icon: 'water', color: '#2196F3' },
];

export default function RenterHomeScreen({ navigation }) {
  const [activeRentals, setActiveRentals] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [showAllAvailable, setShowAllAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // This hook runs every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        // Don't show the main loader on a pull-to-refresh
        if (!refreshing) {
          setIsLoading(true);
        }

        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Location permission is required to show available equipment.');
            throw new Error('Location permission not granted');
          }
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation(location);

          const token = await AsyncStorage.getItem('token');
          if (!token) {
            Alert.alert("Authentication Error", "Please log in to continue.");
            return;
          }
          const headers = { 'x-access-token': token };

          const vehiclesResponse = await apiClient.get('/vehicles', {
            headers,
            params: { lat: location.coords.latitude, lng: location.coords.longitude },
          });
          setAvailableVehicles(vehiclesResponse.data);

          // TODO: Implement API call to fetch active rentals
          setActiveRentals([]);

        } catch (error) {
          console.error("Data fetching failed:", error.response?.data || error.message);
          Alert.alert("Error", "Failed to load data. Please try again later.");
        } finally {
          setIsLoading(false);
          setRefreshing(false);
        }
      };

      fetchData();

      return () => {}; 
    }, [refreshing])
  );

  const onRefresh = () => {
    setRefreshing(true);
  };

  const handleFindEquipment = () => {
    navigation.navigate('Vehicles');
  };

  const handleViewAvailable = () => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please enable location services to find available equipment.');
      return;
    }
    navigation.navigate('Vehicles');
  };

  const handleToggleShowAll = () => {
    setShowAllAvailable(prevState => !prevState);
  };

  const renderActiveRental = ({ item }) => (
    <View style={styles.rentalCard}>
      <View style={styles.rentalHeader}>
        <Ionicons name="car" size={24} color="#2E7D32" />
        <View style={styles.rentalInfo}>
          <Text style={styles.vehicleName}>{item.vehicleName}</Text>
          <Text style={styles.ownerName}>Owner: {item.ownerName}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Active</Text>
        </View>
      </View>
    </View>
  );

  const renderAvailableVehicle = ({ item }) => (
    <TouchableOpacity
      style={styles.vehicleCard}
      onPress={() => navigation.navigate('VehicleDetails', { vehicleId: item._id })}
    >
      <View style={styles.vehicleImage}>
        {item.image1_url ? (
          <Image source={{ uri: item.image1_url }} style={styles.image} />
        ) : (
          <Ionicons name="car" size={40} color="#666" />
        )}
      </View>
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleName}>{item.vehicle_name}</Text>
        <Text style={styles.vehicleType}>{item.type}</Text>
        <View style={styles.vehicleMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.rating}>{item.rating || '4.5'}</Text>
          </View>
          <Text style={styles.distance}>{item.distance || '2 km away'}</Text>
        </View>
      </View>
      <View style={styles.vehicleRate}>
        <Text style={styles.rateText}>₹{item.rent_price}</Text>
        <Text style={styles.rateLabel}>/day</Text>
      </View>
    </TouchableOpacity>
  );

  const instructions = "Welcome to the home screen. You can find equipment, view what's available nearby, see your active rentals, or browse by category. Pull down to refresh.";

  const vehiclesToDisplay = showAllAvailable ? availableVehicles : availableVehicles.slice(0, 2);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Finding equipment...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning!</Text>
            <Text style={styles.subGreeting}>Find the perfect equipment for your farm</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person-circle" size={40} color="#2E7D32" />
          </TouchableOpacity>
        </View>

        <VoiceAssistant instructions={instructions} />

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleFindEquipment}>
            <Ionicons name="search" size={24} color="white" />
            <Text style={styles.quickActionText}>Find Equipment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleViewAvailable}>
            <Ionicons name="location" size={24} color="white" />
            <Text style={styles.quickActionText}>Available</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Rentals</Text>
          <FlatList
            data={activeRentals}
            renderItem={renderActiveRental}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.emptyStateText}>You have no active rentals.</Text>}
            scrollEnabled={false}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Equipment</Text>
            {availableVehicles.length > 2 && (
              <TouchableOpacity onPress={handleToggleShowAll}>
                <Text style={styles.seeAllText}>
                  {showAllAvailable ? 'Show Less' : 'See All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={vehiclesToDisplay}
            renderItem={renderAvailableVehicle}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={<Text style={styles.emptyStateText}>No available equipment found. Try expanding your search area.</Text>}
            scrollEnabled={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment Categories</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category, index) => (
              <TouchableOpacity key={index} style={styles.categoryCard}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon} size={24} color={category.color} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 45,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subGreeting: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  profileButton: {
    padding: 5,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  seeAllText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
    fontSize: 16,
    paddingHorizontal: 20,
  },
  rentalCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rentalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  rentalInfo: {
    flex: 1,
    marginLeft: 15,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ownerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  vehicleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  vehicleImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  vehicleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  rating: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  distance: {
    fontSize: 14,
    color: '#666',
  },
  vehicleRate: {
    alignItems: 'flex-end',
  },
  rateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  rateLabel: {
    fontSize: 12,
    color: '#666',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});
