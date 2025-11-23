import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../../api/client';
import VoiceAssistant from '../../components/VoiceAssistant';

const MyBookingsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await apiClient.get('/bookings');
      setBookings(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch your bookings.');
    }
    setRefreshing(false);
  }, []);

  useFocusEffect(fetchBookings);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed': return { color: 'green', fontWeight: 'bold' };
      case 'pending': return { color: 'orange', fontWeight: 'bold' };
      case 'cancelled': return { color: 'red', fontWeight: 'bold' };
      default: return {};
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTitle}>{item.vehicle_details.vehicle_name}</Text>
      <Text>Status: <Text style={getStatusStyle(item.status)}>{item.status.toUpperCase()}</Text></Text>
      <Text>From: {new Date(item.start_time).toLocaleDateString()}</Text>
      <Text>To: {new Date(item.end_time).toLocaleDateString()}</Text>
    </View>
  );

  const instructions = "This screen lists all of your past and current bookings. Pull down to refresh the list.";

  return (
    <View style={styles.container}>
      <VoiceAssistant instructions={instructions} />
      <FlatList
        data={bookings}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={<Text style={styles.emptyText}>You have no bookings.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchBookings} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  itemContainer: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  itemTitle: { fontSize: 18, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 },
});

export default MyBookingsScreen;
