import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';

export default function MyVehiclesScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const loadVehicles = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    else setRefreshing(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setVehicles([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const res = await apiClient.get('/vehicles', { headers: { 'x-access-token': token } });
      
      const mapped = res.data.map(v => ({
        id: v._id,
        name: v.vehicle_name,
        type: v.type,
        dailyRate: v.rent_price || 0,
        status: v.availability ? 'available' : 'rented', // Note: 'rented' status is derived from bookings, not just availability flag. This is a simplification.
        rating: v.rating || 4.7,
        totalRentals: v.totalRentals || 0,
        totalEarnings: v.totalEarnings || 0,
        images: [v.image1_url, v.image2_url].filter(Boolean),
      }));
      setVehicles(mapped);
    } catch (error) {
      console.error("Failed to load vehicles:", error);
      Alert.alert('Error', 'Failed to load your vehicles. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [loadVehicles])
  );

  const voiceInstructions = "This is your My Vehicles screen. Here you can see a list of all your registered equipment. You can edit details, delete a vehicle, or change its availability status between active and paused. To add a new vehicle, press the plus icon at the top right.";

  const handleVoiceAssistantPress = async () => {
    const speaking = await Speech.isSpeakingAsync();
    if (speaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      Speech.speak(voiceInstructions, {
        language: 'en-US',
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: (error) => {
          console.error('Speech error:', error);
          setIsSpeaking(false);
        },
      });
      setIsSpeaking(true);
    }
  };

  const handleAddVehicle = () => {
    navigation.navigate('AddVehicle');
  };

  const handleEditVehicle = async (vehicleId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      // Fetch the complete, most up-to-date vehicle data from the DB
      const response = await apiClient.get(`/vehicles/${vehicleId}`, {
        headers: { 'x-access-token': token },
      });
      
      // The backend returns a single vehicle object
      const vehicleData = response.data; 

      navigation.navigate('AddVehicle', { 
        editMode: true, 
        vehicleData: vehicleData // Pass the full, fresh data to the edit screen
      });

    } catch (error) {
      console.error("Failed to fetch vehicle details for editing:", error);
      Alert.alert('Error', 'Could not fetch vehicle details. Please try again.');
    }
  };

  const handleDeleteVehicle = (vehicle) => {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to permanently delete ${vehicle.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          async onPress() {
            try {
              const token = await AsyncStorage.getItem('token');
              await apiClient.delete(`/vehicles/${vehicle.id}`, { 
                headers: { 'x-access-token': token } 
              });
              Alert.alert('Success', `${vehicle.name} has been deleted.`);
              // Refresh the list to remove the deleted vehicle
              loadVehicles(true); 
            } catch (error) {
              console.error("Failed to delete vehicle:", error.response?.data || error.message);
              // Display the specific error message from the backend if available
              const errorMessage = error.response?.data?.message || 'Could not delete the vehicle.';
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = async (vehicle) => {
    const newAvailability = vehicle.status !== 'available';
    const newStatus = newAvailability ? 'available' : 'unavailable';

    Alert.alert(
      'Change Status',
      `Mark ${vehicle.name} as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', async onPress() {
            try {
              const token = await AsyncStorage.getItem('token');
              await apiClient.put(`/vehicles/${vehicle.id}`, 
                { availability: newAvailability },
                { headers: { 'x-access-token': token } }
              );
              loadVehicles(true);
            } catch (error) {
              console.error("Failed to update status:", error);
              Alert.alert('Error', 'Could not update vehicle status.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#4CAF50';
      case 'rented': return '#2196F3';
      case 'maintenance': return '#FF9800';
      case 'unavailable': return '#f44336';
      default: return '#666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'rented': return 'Rented';
      case 'maintenance': return 'Maintenance';
      case 'unavailable': return 'Unavailable';
      default: return status;
    }
  };

  const renderVehicle = ({ item }) => (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleImage}>
          {item.images && item.images.length > 0 ? (
            <Image 
              source={{ uri: item.images[0] }} 
              style={styles.vehicleImageStyle}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="car" size={40} color={getStatusColor(item.status)} />
          )}
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{item.name}</Text>
          <Text style={styles.vehicleType}>{item.type}</Text>
          <View style={styles.vehicleMeta}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.rating}>{item.rating}</Text>
            </View>
            <Text style={styles.rentalsCount}>{item.totalRentals} rentals</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Daily Rate:</Text>
          <Text style={styles.detailValue}>₹{item.dailyRate}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Earnings:</Text>
          <Text style={styles.detailValue}>₹{item.totalEarnings.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.vehicleActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditVehicle(item.id)}
        >
          <Ionicons name="create-outline" size={16} color="#2196F3" />
          <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            { borderColor: item.status === 'available' ? '#FF9800' : '#4CAF50' }
          ]}
          onPress={() => handleToggleStatus(item)}
        >
          <Ionicons 
            name={item.status === 'available' ? 'pause-outline' : 'play-outline'} 
            size={16} 
            color={item.status === 'available' ? '#FF9800' : '#4CAF50'} 
          />
          <Text style={[
            styles.actionButtonText,
            { color: item.status === 'available' ? '#FF9800' : '#4CAF50' }
          ]}>
            {item.status === 'available' ? 'Pause' : 'Activate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteVehicle(item)}
        >
          <Ionicons name="trash-outline" size={16} color="#f44336" />
          <Text style={[styles.actionButtonText, { color: '#f44336' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="car-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Vehicles Added</Text>
      <Text style={styles.emptySubtitle}>
        Start earning by adding your agricultural equipment
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddVehicle')}
      >
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.addButtonText}>Add Your First Vehicle</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <TouchableOpacity
          style={styles.headerAddButton}
          onPress={handleAddVehicle}
        >
        <Ionicons name="add" size={24} color="#2E7D32" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#2E7D32" />
      ) : vehicles.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.vehiclesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadVehicles(true)} />
          }
        />
      )}

      <TouchableOpacity style={styles.voiceButton} onPress={handleVoiceAssistantPress} activeOpacity={0.8}>
        <Ionicons
          name={isSpeaking ? "stop-circle-outline" : "volume-medium"}
          size={32}
          color="white"
        />
      </TouchableOpacity>
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
    paddingVertical: 18,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerAddButton: {
    padding: 5,
  },
  vehiclesList: {
    padding: 20,
    paddingBottom: 80, // Add padding to bottom to not be obscured by voice button
  },
  vehicleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  vehicleImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  vehicleImageStyle: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  rentalsCount: {
    fontSize: 12,
    color: '#666',
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
  vehicleDetails: {
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  vehicleActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  editButton: {
    borderColor: '#2196F3',
  },
  deleteButton: {
    borderColor: '#f44336',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  voiceButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#007BFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 1000,
  },
});
