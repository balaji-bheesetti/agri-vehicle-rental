import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, ActivityIndicator } from 'react-native';
import apiClient from '../../api/client';
import VoiceAssistant from '../../components/VoiceAssistant';

const BookVehicleScreen = ({ route, navigation }) => {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        const response = await apiClient.get(`/vehicles/${vehicleId}`);
        setVehicle(response.data);
      } catch (error) {
        Alert.alert('Error', 'Could not fetch vehicle details.');
      }
      setLoading(false);
    };
    fetchVehicleDetails();
  }, [vehicleId]);

  const handleBooking = async () => {
    // In a real app, you'd have date pickers for start and end times.
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day later

    try {
      await apiClient.post('/bookings', {
        vehicle_id: vehicleId,
        start_time: startTime,
        end_time: endTime,
      });
      Alert.alert('Success', 'Your booking request has been sent to the owner.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Booking Failed', error.response?.data?.message || 'An error occurred.');
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  if (!vehicle) {
    return <Text style={styles.errorText}>Vehicle not found.</Text>;
  }

  const instructions = `You are viewing the ${vehicle.vehicle_name}. To book it for one day, press the 'Book Now' button.`;

  return (
    <View style={styles.container}>
      <VoiceAssistant instructions={instructions} />
      <Text style={styles.title}>{vehicle.vehicle_name}</Text>
      <Text style={styles.detail}>Model: {vehicle.model}</Text>
      <Text style={styles.detail}>Type: {vehicle.type}</Text>
      <Text style={styles.price}>${vehicle.rent_price} / day</Text>
      <Button title="Book Now (for 1 Day)" onPress={handleBooking} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: 'white' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  detail: { fontSize: 18, marginBottom: 5 },
  price: { fontSize: 20, color: 'green', marginVertical: 20, fontWeight: 'bold' },
  errorText: { textAlign: 'center', marginTop: 20, color: 'red', fontSize: 18 },
});

export default BookVehicleScreen;
