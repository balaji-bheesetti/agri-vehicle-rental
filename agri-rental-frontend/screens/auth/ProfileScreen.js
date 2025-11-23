import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';
import { useFocusEffect } from '@react-navigation/native';

export default function ProfileScreen({ navigation }) {
  const [userInfo, setUserInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [editForm, setEditForm] = useState({ fullname: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUserData = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    else setRefreshing(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [profileRes, vehiclesRes, bookingsRes] = await Promise.all([
        apiClient.get('/profile', { headers: { 'x-access-token': token } }),
        apiClient.get('/vehicles', { headers: { 'x-access-token': token } }),
        apiClient.get('/bookings', { headers: { 'x-access-token': token } }),
      ]);

      const profileData = profileRes.data;
      setUserInfo({
        name: profileData.fullname,
        phone: profileData.phone,
        role: profileData.role,
        joinDate: new Date(profileData.created_at).toLocaleDateString(),
      });

      if (profileData.role === 'owner') {
        const totalEarnings = bookingsRes.data
          .filter(b => b.status === 'confirmed')
          .reduce((sum, booking) => {
            const vehicle = vehiclesRes.data.find(v => v._id === booking.vehicle_id);
            return sum + (vehicle?.rent_price || 0);
          }, 0);
        setStats({
          stat1: { label: 'My Vehicles', value: vehiclesRes.data.length },
          stat2: { label: 'Total Earnings', value: `₹${totalEarnings.toLocaleString()}` },
          stat3: { label: 'Total Rentals', value: bookingsRes.data.length },
          stat4: { label: 'Rating', value: '4.9' }, // Mocked for now
        });
      } else { // Renter
        const totalSpent = bookingsRes.data
          .filter(b => b.status === 'confirmed')
          .reduce((sum, booking) => sum + (booking.vehicle_details?.rent_price || 0), 0);
        setStats({
          stat1: { label: 'Total Rentals', value: bookingsRes.data.length },
          stat2: { label: 'Total Spent', value: `₹${totalSpent.toLocaleString()}` },
          stat3: { label: 'Active Rentals', value: bookingsRes.data.filter(b => b.status === 'confirmed').length },
          stat4: { label: 'Rating', value: '4.8' }, // Mocked for now
        });
      }

    } catch (error) {
      console.error('Error loading user data:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to load profile data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: performLogout },
    ]);
  };

  const performLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'role', 'username']);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleEditProfile = () => {
    setEditForm({ fullname: userInfo.name, phone: userInfo.phone });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    // TODO: Backend endpoint for updating profile is needed.
    Alert.alert("Feature In Development", "Updating user profiles is not yet supported by the server.");
    setIsEditing(false);
    // Example of what the call would look like:
    /*
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await apiClient.put('/profile', editForm, {
        headers: { 'x-access-token': token }
      });
      setUserInfo(prev => ({ ...prev, name: response.data.fullname, phone: response.data.phone }));
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile.');
    }
    */
  };

  const handleChangePassword = () => setIsChangingPassword(true);

  const handleSavePassword = async () => {
    // TODO: Backend endpoint for changing password is needed.
    Alert.alert("Feature In Development", "Changing passwords is not yet supported by the server.");
    setIsChangingPassword(false);
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <Ionicons name="person" size={50} color="#2E7D32" />
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.userName}>{userInfo?.name || 'User'}</Text>
        <Text style={styles.userPhone}>{userInfo?.phone}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {userInfo?.role === 'renter' ? 'Equipment Renter' : 'Equipment Owner'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
        <Ionicons name="create-outline" size={20} color="#2E7D32" />
      </TouchableOpacity>
    </View>
  );

  const renderStatsSection = () => (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle}>Your Stats</Text>
      <View style={styles.statsGrid}>
        {stats ? (
          <>
            <View style={styles.statCard}><Text style={styles.statValue}>{stats.stat1.value}</Text><Text style={styles.statLabel}>{stats.stat1.label}</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{stats.stat2.value}</Text><Text style={styles.statLabel}>{stats.stat2.label}</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{stats.stat3.value}</Text><Text style={styles.statLabel}>{stats.stat3.label}</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{stats.stat4.value}</Text><Text style={styles.statLabel}>{stats.stat4.label}</Text></View>
          </>
        ) : <ActivityIndicator color="#2E7D32" />}
      </View>
    </View>
  );

  const renderMenuSection = () => (
    <View style={styles.menuSection}>
      <Text style={styles.sectionTitle}>Account</Text>
      <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
        <View style={styles.menuItemLeft}><Ionicons name="lock-closed-outline" size={20} color="#2E7D32" /><Text style={styles.menuLabel}>Change Password</Text></View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Support', 'Contact support at support@smartagrirental.com')}>
        <View style={styles.menuItemLeft}><Ionicons name="help-circle-outline" size={20} color="#2E7D32" /><Text style={styles.menuLabel}>Help & Support</Text></View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('About', 'Version 1.0.0')}>
        <View style={styles.menuItemLeft}><Ionicons name="information-circle-outline" size={20} color="#2E7D32" /><Text style={styles.menuLabel}>About</Text></View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
        <View style={styles.menuItemLeft}><Ionicons name="log-out-outline" size={20} color="#f44336" /><Text style={[styles.menuLabel, { color: '#f44336' }]}>Logout</Text></View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const renderEditProfileModal = () => (
    <Modal visible={isEditing} animationType="slide" transparent={true} onRequestClose={() => setIsEditing(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setIsEditing(false)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
          </View>
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>Full Name</Text><TextInput style={styles.input} value={editForm.fullname} onChangeText={(text) => setEditForm(prev => ({ ...prev, fullname: text }))} placeholder="Enter your full name" autoCapitalize="words" /></View>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>Phone Number</Text><TextInput style={styles.input} value={editForm.phone} onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))} placeholder="Enter your phone number" keyboardType="phone-pad" /></View>
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}><Text style={styles.saveButtonText}>Save Changes</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderChangePasswordModal = () => (
    <Modal visible={isChangingPassword} animationType="slide" transparent={true} onRequestClose={() => setIsChangingPassword(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => setIsChangingPassword(false)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
          </View>
          <View style={styles.formContainer}>
            <View style={styles.passwordInputContainer}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput style={styles.passwordInput} value={passwordForm.currentPassword} onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))} placeholder="Enter current password" secureTextEntry={!showPasswords.current} autoCapitalize="none" />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}><Ionicons name={showPasswords.current ? "eye-outline" : "eye-off-outline"} size={20} color="#666" /></TouchableOpacity>
              </View>
            </View>
            <View style={styles.passwordInputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput style={styles.passwordInput} value={passwordForm.newPassword} onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))} placeholder="Enter new password" secureTextEntry={!showPasswords.new} autoCapitalize="none" />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}><Ionicons name={showPasswords.new ? "eye-outline" : "eye-off-outline"} size={20} color="#666" /></TouchableOpacity>
              </View>
            </View>
            <View style={styles.passwordInputContainer}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput style={styles.passwordInput} value={passwordForm.confirmPassword} onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))} placeholder="Confirm new password" secureTextEntry={!showPasswords.confirm} autoCapitalize="none" />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}><Ionicons name={showPasswords.confirm ? "eye-outline" : "eye-off-outline"} size={20} color="#666" /></TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsChangingPassword(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSavePassword}><Text style={styles.saveButtonText}>Change Password</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ marginTop: 10 }}>Loading Profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadUserData(true)} />}
      >
        {renderProfileHeader()}
        {renderStatsSection()}
        {renderMenuSection()}
      </ScrollView>
      {renderEditProfileModal()}
      {renderChangePasswordModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  profileHeader: {
    paddingTop: 45,
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  userPhone: { fontSize: 14, color: '#666', marginBottom: 8 },
  roleBadge: { backgroundColor: '#2E7D32', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  roleText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  editButton: { padding: 10 },
  statsSection: { backgroundColor: 'white', margin: 20, marginTop: 0, borderRadius: 12, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: '#f8f9fa', borderRadius: 8, padding: 15, alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5, textAlign: 'center' },
  menuSection: { backgroundColor: 'white', margin: 20, marginTop: 0, borderRadius: 12, paddingHorizontal: 10, marginBottom: 40 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuLabel: { fontSize: 16, color: '#333', marginLeft: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, width: '90%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  formContainer: { marginBottom: 20 },
  inputContainer: { marginBottom: 15 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#333', backgroundColor: '#f9f9f9' },
  passwordInputContainer: { marginBottom: 15 },
  passwordInputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    backgroundColor: '#f9f9f9' 
  },
  passwordInput: { 
    flex: 1, 
    paddingHorizontal: 15, 
    paddingVertical: 12, 
    fontSize: 16, 
    color: '#333' 
  },
  eyeIcon: { padding: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelButtonText: { fontSize: 16, color: '#666', fontWeight: 'bold' },
  saveButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#2E7D32', alignItems: 'center' },
  saveButtonText: { fontSize: 16, color: 'white', fontWeight: 'bold' },
});
