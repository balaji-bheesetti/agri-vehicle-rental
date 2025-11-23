import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';
import * as Speech from 'expo-speech';

export default function RoleSelectionScreen({ navigation }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSetRole = async () => {
    if (!selectedRole) {
      Alert.alert('Selection Required', 'Please select a role.');
      return;
    }
    setLoading(true);
    try {
      // 1. Get the temporary token and username from storage
      const tempToken = await AsyncStorage.getItem('temp_token');
      const username = await AsyncStorage.getItem('username');

      if (!tempToken || !username) {
        Alert.alert('Error', 'Authentication session expired. Please log in again.');
        setLoading(false);
        navigation.navigate('Login');
        return;
      }

      // 2. Make the API call with the temporary token in the header
      const response = await apiClient.put(
        `/users/${username}/role`,
        { role: selectedRole },
        { headers: { 'x-access-token': tempToken } }
      );

      const { token, role } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('role', role);

      await AsyncStorage.removeItem('temp_token');
      await AsyncStorage.removeItem('username');

      Alert.alert('Success', 'Your role has been set. You are now logged in.');

    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'An error occurred while setting your role.');
    } finally {
      setLoading(false);
    }
  };

  
  const voiceInstructions = "Welcome to role selection. Choose 'Equipment Renter' if you want to find and rent equipment. Choose 'Equipment Owner' if you want to list your equipment for others to rent. After selecting a role, press the continue button.";

  // const voiceInstructions = "Role selection ki swagatham. Meeru equipment ni kanukoni rent chesukovalani unte 'Equipment Renter' ni choose cheyyandi. Meeru mee equipment ni itarulu rent chesukovadaniki list cheyalani unte 'Equipment Owner' ni choose cheyyandi. Role select chesaka, continue button meeda press cheyyandi.";

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

  const roles = [
    {
      id: 'renter',
      title: 'Equipment Renter',
      description: 'I want to rent agricultural equipment for my farming needs',
      icon: 'car-outline',
      color: '#2E7D32',
      features: [
        'Browse available equipment',
        'Book equipment for daily rent',
        'Track rented equipment location',
        'Make secure payments',
      ],
    },
    {
      id: 'owner',
      title: 'Equipment Owner',
      description: 'I want to rent out my agricultural equipment to earn money',
      icon: 'business-outline',
      color: '#1976D2',
      features: [
        'Register your equipment',
        'Upload live photos',
        'Track equipment location',
        'Manage rental bookings',
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Voice Assistant Button - Now at the top left */}
      <TouchableOpacity style={styles.voiceButton} onPress={handleVoiceAssistantPress} activeOpacity={0.8}>
        <Ionicons
          name={isSpeaking ? "stop-circle-outline" : "volume-medium"}
          size={32}
          color="white"
        />
      </TouchableOpacity>

      <View style={styles.header}>
        <Ionicons name="leaf" size={60} color="#2E7D32" />
        <Text style={styles.title}>Choose Your Role</Text>
        <Text style={styles.subtitle}>
          How would you like to use Smart Agri Rental?
        </Text>
      </View>

      <View style={styles.rolesContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={[
              styles.roleCard,
              selectedRole === role.id && styles.selectedRoleCard,
            ]}
            onPress={() => setSelectedRole(role.id)}
          >
            <View style={styles.roleHeader}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: role.color + '20' },
                ]}
              >
                <Ionicons name={role.icon} size={30} color={role.color} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </View>
              <View style={styles.radioContainer}>
                <View
                  style={[styles.radio, selectedRole === role.id && styles.selectedRadio]}
                >
                  {selectedRole === role.id && <View style={styles.radioInner} />}
                </View>
              </View>
            </View>

            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>What you can do:</Text>
              {role.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.continueButton, (!selectedRole || loading) && styles.disabledButton]}
          onPress={handleSetRole}
          disabled={!selectedRole || loading}
        >
          <Text style={styles.continueButtonText}>{loading ? 'Saving...' : 'Continue'}</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { alignItems: 'center', padding: 20, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32', marginTop: 15 },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  rolesContainer: { flex: 1, padding: 20 },
  roleCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRoleCard: { borderColor: '#2E7D32', backgroundColor: '#f8fff8' },
  roleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  roleInfo: { flex: 1 },
  roleTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  roleDescription: { fontSize: 14, color: '#666', lineHeight: 20 },
  radioContainer: { marginLeft: 10 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadio: { borderColor: '#2E7D32' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2E7D32' },
  featuresContainer: { marginTop: 10 },
  featuresTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureText: { fontSize: 14, color: '#666', marginLeft: 10, flex: 1 },
  buttonContainer: { padding: 20, paddingBottom: 30 },
  continueButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: { backgroundColor: '#ccc' },
  continueButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginRight: 10 },
  voiceButton: {
    position: 'absolute',
    top: 50,
    left: 20,
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
