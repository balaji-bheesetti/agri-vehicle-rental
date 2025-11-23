import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function VehicleTrackingScreen({ navigation }) {
  const [trackedVehicles, setTrackedVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  const loadTrackedVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const [vehiclesResponse, bookingsResponse] = await Promise.all([
        apiClient.get('/vehicles', { headers: { 'x-access-token': token } }),
        apiClient.get('/bookings', { headers: { 'x-access-token': token } }),
      ]);

      const vehiclesData = vehiclesResponse.data;
      const activeBookings = bookingsResponse.data.filter(
        b => b.status === 'confirmed'
      );

      const tracked = activeBookings.map(booking => {
        const vehicle = vehiclesData.find(v => v._id === booking.vehicle_id);
        if (!vehicle) return null;

        return {
          id: vehicle._id,
          name: vehicle.vehicle_name,
          renterName: booking.renter_details?.fullname || 'N/A',
          renterPhone: booking.renter_details?.phone || 'N/A',
          startDate: new Date(booking.start_time).toLocaleDateString(),
          endDate: new Date(booking.end_time).toLocaleDateString(),
          currentLocation: vehicle.location ? {
            latitude: parseFloat(vehicle.location.latitude),
            longitude: parseFloat(vehicle.location.longitude),
            address: vehicle.location.address || 'Address not available'
          } : null,
          lastUpdated: vehicle.location?.timestamp ? new Date(vehicle.location.timestamp).toLocaleString() : 'N/A',
          status: 'active', // Since we filtered for confirmed bookings
        };
      }).filter(Boolean); // Remove null entries

      setTrackedVehicles(tracked);
      if (tracked.length > 0) {
        setSelectedVehicle(tracked[0]);
      }
    } catch (error) {
      console.error('Failed to load tracked vehicles:', error);
      Alert.alert('Error', 'Failed to load tracked vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrackedVehicles();
    }, [loadTrackedVehicles])
  );

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    if (vehicle.currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: vehicle.currentLocation.latitude,
        longitude: vehicle.currentLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }, 1000);
    }
  };

  const renderVehicleCard = (vehicle) => (
    <TouchableOpacity
      key={vehicle.id}
      style={[
        styles.vehicleCard,
        selectedVehicle?.id === vehicle.id && styles.selectedVehicleCard
      ]}
      onPress={() => handleSelectVehicle(vehicle)}
    >
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{vehicle.name}</Text>
          <Text style={styles.renterName}>Rented by: {vehicle.renterName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.statusText}>{vehicle.status}</Text>
        </View>
      </View>
      
      <View style={styles.vehicleMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="location" size={14} color="#666" />
          <Text style={styles.metaText} numberOfLines={1}>
            {vehicle.currentLocation ? vehicle.currentLocation.address : 'Location not available'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time" size={14} color="#666" />
          <Text style={styles.metaText}>{vehicle.lastUpdated}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMap = () => {
    const initialRegion = {
      latitude: selectedVehicle?.currentLocation?.latitude || 20.5937,
      longitude: selectedVehicle?.currentLocation?.longitude || 78.9629,
      latitudeDelta: selectedVehicle?.currentLocation ? LATITUDE_DELTA : 15,
      longitudeDelta: selectedVehicle?.currentLocation ? LONGITUDE_DELTA : 15 * ASPECT_RATIO,
    };

    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
        >
          {selectedVehicle && selectedVehicle.currentLocation && (
            <Marker
              coordinate={selectedVehicle.currentLocation}
              title={selectedVehicle.name}
              description={`Rented by: ${selectedVehicle.renterName}`}
            >
              <Ionicons name="car-sport" size={30} color="#D32F2F" />
            </Marker>
          )}
        </MapView>
      </View>
    );
  };

  const renderVehicleDetails = () => {
    if (!selectedVehicle) return null;

    return (
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Vehicle Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Rental Period:</Text>
          <Text style={styles.detailValue}>
            {selectedVehicle.startDate} - {selectedVehicle.endDate}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Renter:</Text>
          <Text style={styles.detailValue}>{selectedVehicle.renterName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>{selectedVehicle.renterPhone}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Last Updated:</Text>
          <Text style={styles.detailValue}>{selectedVehicle.lastUpdated}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vehicle Tracking</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadTrackedVehicles}
          disabled={loading}
        >
          <Ionicons name="refresh" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading Tracked Vehicles...</Text>
        </View>
      ) : trackedVehicles.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="car-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No active rentals to track.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tracked Vehicles</Text>
            {trackedVehicles.map(renderVehicleCard)}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Map</Text>
            {renderMap()}
          </View>

          {selectedVehicle && (
            <View style={styles.section}>
              {renderVehicleDetails()}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    paddingTop: 18,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  map: {
    flex: 1,
    height: 250,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  vehicleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedVehicleCard: {
    borderColor: '#2E7D32',
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  renterName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  vehicleMeta: {
    gap: 5,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
    flexShrink: 1,
  },
  mapContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    height: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});

