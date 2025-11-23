import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl, Button } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../../api/client';
import VoiceAssistant from '../../components/VoiceAssistant';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RenterHomeScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVehicles = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await apiClient.get('/vehicles');
      setVehicles(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch available vehicles.');
    }
    setRefreshing(false);
  }, []);

  useFocusEffect(fetchVehicles);


    const handleLogout = () => {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: performLogout },
      ]);
    };
    
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate('BookVehicle', { vehicleId: item._id })}
    >
      <Text style={styles.itemTitle}>{item.vehicle_name}</Text>
      <Text>{item.model} - {item.type}</Text>
      <Text style={styles.price}>${item.rent_price}/day</Text>
    </TouchableOpacity>
  );

  const instructions = "This screen shows all available vehicles for rent. Tap on a vehicle to see more details and book it. Pull down to refresh the list.";

  return (
    <View style={styles.container}>
      <VoiceAssistant instructions={instructions} />
      <FlatList
        data={vehicles}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={<Button title="Logout" onPress={handleLogout} color="red" />}        
        ListEmptyComponent={<Text style={styles.emptyText}>No vehicles are available for rent right now.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchVehicles} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  itemContainer: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  itemTitle: { fontSize: 18, fontWeight: 'bold' },
  price: { fontSize: 16, color: 'green', marginTop: 5 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 },
});

export default RenterHomeScreen;
