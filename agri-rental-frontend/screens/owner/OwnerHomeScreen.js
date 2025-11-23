import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useFocusEffect } from '@react-navigation/native';

export default function OwnerHomeScreen({ navigation }) {
  const [stats, setStats] = useState({
    totalEarnings: 0,
    activeRentals: 0,
    totalVehicles: 0,
    rating: 4.8, // This can be connected to a ratings API later
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const loadData = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    else setRefreshing(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [vehiclesResponse, bookingsResponse] = await Promise.all([
        apiClient.get('/vehicles', { headers: { 'x-access-token': token } }),
        apiClient.get('/bookings', { headers: { 'x-access-token': token } })
      ]);

      const ownerVehicles = vehiclesResponse.data.map(v => ({
        id: v._id, 
        name: v.vehicle_name,
        type: v.type,
        dailyRate: v.rent_price,
        status: v.availability ? 'available' : 'rented',
        nextAvailable: null,
        images: [v.image1_url, v.image2_url].filter(Boolean),
      }));

      // Create a set of the owner's vehicle IDs for quick lookups
      const ownerVehicleIds = new Set(ownerVehicles.map(v => v.id));

      // Process bookings to get stats and recent bookings
      const ownerBookings = bookingsResponse.data.filter(b => ownerVehicleIds.has(b.vehicle_id));

      const activeRentals = ownerBookings.filter(b => b.status === 'confirmed').length;
      const totalEarnings = ownerBookings
        .filter(b => b.status === 'confirmed') // Or other logic for "earned"
        .reduce((sum, booking) => {
          const vehicle = ownerVehicles.find(v => v.id === booking.vehicle_id);
          return sum + (vehicle?.dailyRate || 0);
        }, 0);

      const recent = ownerBookings.slice(0, 3).map(b => ({
        id: b._id,
        vehicleName: ownerVehicles.find(v => v.id === b.vehicle_id)?.name || 'Unknown Vehicle',
        renterName: b.renter_details?.fullname || 'Unknown Renter',
        startDate: new Date(b.start_time).toLocaleDateString(),
        endDate: new Date(b.end_time).toLocaleDateString(),
        amount: ownerVehicles.find(v => v.id === b.vehicle_id)?.dailyRate || 0,
        status: b.status,
      }));
      setRecentBookings(recent);

      setStats(prev => ({
        ...prev,
        totalVehicles: ownerVehicles.length,
        activeRentals: activeRentals,
        totalEarnings: totalEarnings,
      }));

    } catch (error) {
      console.error('Error loading data:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddVehicle = () => {
    navigation.navigate('AddVehicle');
  };

  const handleViewAllVehicles = () => {
    navigation.navigate('Vehicles');
  };

  // const voiceInstructions = "Welcome to your dashboard. Here you can see your total earnings, active rentals, and manage your vehicles. You can add a new vehicle or view all your vehicles using the buttons below.";

  const voiceInstructions = "Mee dashboard ki swaagatam. Ikkada meeru mee total earnings, active rentals choodavachu mariyu mee vehicles ni manage cheyyavachu. Kotha vehicle ni add cheyyachu lekapothe anni vehicles ni choodadaniki kinda unna buttons ni enchukondi.";

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

  const renderStatCard = (title, value, icon, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statContent}>
        <View style={styles.statInfo}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
      </View>
    </View>
  );

  const renderBookingCard = (booking) => (
    <View key={booking.id} style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Text style={styles.vehicleName}>{booking.vehicleName}</Text>
          <Text style={styles.renterName}>Rented by: {booking.renterName}</Text>
        </View>
        <View 
          style={[
            styles.statusBadge, 
            { 
              backgroundColor: booking.status === 'confirmed' ? '#4CAF50' // Green for confirmed
                             : booking.status === 'pending' ? '#FFC107' // Yellow for pending
                             : '#F44336' // Red for cancelled
            }
          ]}
        >
          <Text style={styles.statusText}>{booking.status}</Text>
        </View>
      </View>
      
      <View style={styles.bookingDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Period</Text>
          <Text style={styles.detailValue}>{booking.startDate} - {booking.endDate}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>₹{booking.amount}</Text>
        </View>
      </View></View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ marginTop: 10 }}>Loading Dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.subGreeting}>Manage your equipment rentals</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person-circle" size={40} color="#2E7D32" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={{flex: 1, marginHorizontal: 5}}>{renderStatCard('Total Earnings', `₹${stats.totalEarnings.toLocaleString()}`, 'wallet', '#4CAF50')}</View>
            <View style={{flex: 1, marginHorizontal: 5}}>{renderStatCard('Active Rentals', stats.activeRentals.toString(), 'car', '#2196F3')}</View>
          </View>
          <View style={styles.statsRow}>
            <View style={{flex: 1, marginHorizontal: 5}}>{renderStatCard('My Vehicles', stats.totalVehicles.toString(), 'business', '#FF9800')}</View>
            <View style={{flex: 1, marginHorizontal: 5}}>{renderStatCard('Rating', stats.rating.toString(), 'star', '#FFD700')}</View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleAddVehicle}>
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.quickActionText}>Add Vehicle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleViewAllVehicles}>
            <Ionicons name="list" size={24} color="white" />
            <Text style={styles.quickActionText}>My Vehicles</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            {recentBookings.length > 0 && (
              <TouchableOpacity onPress={() => console.log("See All Bookings pressed")}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentBookings.length > 0 ? (
            <FlatList
              data={recentBookings}
              renderItem={({ item }) => renderBookingCard(item)}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : <Text style={styles.emptySectionText}>No recent bookings found.</Text>
          }
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips for Better Earnings</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tipItem}>
              <Ionicons name="camera" size={20} color="#2E7D32" />
              <Text style={styles.tipText}>Upload clear, high-quality photos of your equipment</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="star" size={20} color="#2E7D32" />
              <Text style={styles.tipText}>Maintain good ratings by providing quality service</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Voice Assistant Button */}
      <TouchableOpacity style={styles.voiceButton} onPress={handleVoiceAssistantPress} activeOpacity={0.8}>
        <Ionicons
          name={isSpeaking ? "stop-circle-outline" : "volume-medium-outline"}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 42,
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
  statsContainer: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptySectionText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  seeAllText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookingCard: {
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
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  bookingInfo: {
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
  bookingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  vehicleImageContainer: {
    width: 50,
    height: 50,
    marginRight: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleImage: {
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
  vehicleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  vehicleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
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
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  vehicleImageContainer: {
    width: 50,
    height: 50,
    marginRight: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  vehicleImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  vehicleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
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
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
  },
  editButton: {
    borderColor: '#2196F3',
  },
  actionButtonText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 15,
    flex: 1,
    lineHeight: 20,
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
