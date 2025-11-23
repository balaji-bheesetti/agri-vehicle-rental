import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';

export default function AddVehicleScreen({ navigation, route }) {
  const [formData, setFormData] = useState({
    vehicle_name: '',
    type: '',
    model: '',
    rent_price: '',
    location: '',
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [vehicleId, setVehicleId] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const vehicleTypes = [
    'Tractor',
    'Harvester',
    'Plow',
    'Sprayer',
    'Seeder',
    'Cultivator',
    'Loader',
    'Other',
  ];

  useEffect(() => {
    if (route?.params?.editMode && route?.params?.vehicleData) {
      const { vehicleData } = route.params;
      setIsEditMode(true);
      // Correctly set the vehicle ID from the backend's '_id' field
      setVehicleId(vehicleData._id); 
      
      // Correctly map backend keys to frontend state
      setFormData({
        vehicle_name: vehicleData.vehicle_name || '', // Use 'vehicle_name'
        type: vehicleData.type || '',
        model: vehicleData.model || '',
        rent_price: vehicleData.rent_price?.toString() || '', // Use 'rent_price'
        location: vehicleData.location || '', // Assuming location is a string for now
      });
      
      // Populate images from the backend URLs
      const existingImages = [vehicleData.image1_url, vehicleData.image2_url].filter(Boolean);
      if (existingImages.length > 0) {
        setImages(existingImages);
      }
    }
  }, [route?.params]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const requiredFields = ['vehicle_name', 'type', 'rent_price', 'location'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      Alert.alert('Validation Error', `Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Authentication Error', 'User not found. Please login again.');
        setLoading(false);
        return;
      }

      const payload = { 
        ...formData,
        rent_price: parseFloat(formData.rent_price)
      };

      payload.image1_url = images.length > 0 ? images[0] : '';
      payload.image2_url = images.length > 1 ? images[1] : '';

      let response;
      if (isEditMode) {
        response = await apiClient.put(`/vehicles/${vehicleId}`, payload, {
          headers: { 'x-access-token': token },
        });
      } else {
        // Create new vehicle
        response = await apiClient.post('/vehicles', payload, {
          headers: { 'x-access-token': token },
        });
      }

      Alert.alert(
        'Success!',
        response.data.message,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error("Submission Error:", error.response?.data || error.message);
      Alert.alert('Submission Error', error.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const voiceInstructions = `
    ${isEditMode ? 'You are currently editing an existing equipment.' : 'You are on the Add Equipment screen.'}
    Please fill in the details such as equipment name, model, daily rental rate, and location.
    You can also upload up to two photos of your equipment.
    Select the equipment type from the options provided.
    Once all details are entered, tap the ${isEditMode ? 'Update Equipment' : 'Register Equipment'} button to save.
  `;

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
        onError: () => setIsSpeaking(false),
      });
      setIsSpeaking(true);
    }
  };

  const renderImageSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Equipment Photos</Text>
      <Text style={styles.sectionSubtitle}>
        Add up to 2 clear photos of your equipment.
      </Text>
      
      <View style={styles.imageGrid}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri }} style={styles.image} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
              <Ionicons name="close-circle" size={24} color="#ff4444" />
            </TouchableOpacity>
          </View>
        ))}
        
        {images.length < 2 && (
          <TouchableOpacity style={styles.addImageButton} onPress={handleImagePicker}>
            <Ionicons name="camera" size={30} color="#2E7D32" />
            <Text style={styles.addImageText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Equipment Type *</Text>
      <View style={styles.typeGrid}>
        {vehicleTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.typeButton, formData.type === type && styles.selectedTypeButton]}
            onPress={() => handleInputChange('type', type)}
          >
            <Text style={[styles.typeButtonText, formData.type === type && styles.selectedTypeButtonText]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Equipment' : 'Add Equipment'}</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.scrollView}>
          {renderImageSection()}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Equipment Name *</Text>
              <TextInput style={styles.input} placeholder="e.g., John Deere Tractor" value={formData.vehicle_name} onChangeText={(value) => handleInputChange('vehicle_name', value)} />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>Model</Text>
                <TextInput style={styles.input} placeholder="e.g., 5050D" value={formData.model} onChangeText={(value) => handleInputChange('model', value)} />
              </View>
            </View>
          </View>

          {renderTypeSelector()}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Daily Rental Rate (₹) *</Text>
              <TextInput style={styles.input} value={formData.rent_price} onChangeText={(value) => handleInputChange('rent_price', value)} keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Equipment Location *</Text>
              <TextInput style={styles.input} value={formData.location} onChangeText={(value) => handleInputChange('location', value)} />
            </View>
          </View>

          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditMode ? 'Update Equipment' : 'Register Equipment'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
      {/* Voice Assistant Button */}
      <TouchableOpacity style={styles.voiceButton} onPress={handleVoiceAssistantPress} activeOpacity={0.8}>
        <Ionicons
          name={isSpeaking ? "stop-circle-outline" : "volume-medium-outline"}
          size={32}
          color="white"
        />
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 45,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  imageContainer: {
    width: 80,
    height: 80,
    marginRight: 10,
    marginBottom: 10,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 10,
  },
  addImageText: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 5,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  row: {
    flexDirection: 'row',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  selectedTypeButton: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedTypeButtonText: {
    color: 'white',
  },
  submitContainer: {
    padding: 20,
    paddingBottom: 30,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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
