import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';
import VoiceAssistant from '../../components/VoiceAssistant';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      // This part handles a successful login for a user who already has a role.
      const response = await apiClient.post('/login', { 
        username: username.trim(), 
        password: password.trim() 
      });
      const { token, role } = response.data;
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('role', role);
      Alert.alert("Success", "Login successful!");
      // AppNavigator will now handle the screen change automatically.

    } catch (error) {
      // This part handles the case where the user is valid but needs to select a role.
      if (error.response && error.response.data.role_needed) {
        const { temp_token, username: responseUsername } = error.response.data;
        try {
          await AsyncStorage.setItem('temp_token', temp_token);
          await AsyncStorage.setItem('username', responseUsername);
          Alert.alert('Role Selection Needed', 'Please select your role to continue.');
          navigation.navigate('RoleSelection');
        } catch (storageError) {
          console.error("Failed to save temp token to storage", storageError);
          Alert.alert("Error", "An issue occurred while preparing for role selection.");
        }
      } else {
        // This handles all other errors (wrong password, server down, etc.)
        Alert.alert('Login Failed', error.response?.data?.message || 'An error occurred. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const voiceInstructions = "Welcome to the Smart Agri Rental login screen. Please enter your username and password, then press the login button.";

  //  const voiceInstructions = "Smart Agri Rental login screen ki swagatham. Dayachesi mee username mariyu password enter chesi, taruvatha login button meeda press cheyyandi.";
  return (
    <View style={styles.container}>
      <VoiceAssistant instructions={voiceInstructions} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Ionicons name="leaf" size={80} color="#2E7D32" />
            <Text style={styles.title}>Smart Agri Rental</Text>
            <Text style={styles.subtitle}>Login to your account</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Logging in...' : 'Login'}
              </Text>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#333' },
  eyeIcon: { padding: 5 },
  loginButton: { backgroundColor: '#2E7D32', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  disabledButton: { backgroundColor: '#ccc' },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  signupContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  signupText: { color: '#666', fontSize: 16 },
  signupLink: { color: '#2E7D32', fontSize: 16, fontWeight: 'bold' },
});
