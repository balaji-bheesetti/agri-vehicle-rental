import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthNavigator from './AuthNavigator';
import OwnerNavigator from './OwnerNavigator';
import RenterNavigator from './RenterNavigator';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const AppNavigator = () => {
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const role = await AsyncStorage.getItem('role');
        setUserToken(token);
        setUserRole(role);
      } catch (e) {
        console.error('Failed to load user data.', e);
      }
      setIsLoading(false);
    };
    checkUser();
  }, []);

  // This effect can be used to listen to changes (e.g., after login)
  // A more robust solution would use a context provider
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = await AsyncStorage.getItem('token');
      const role = await AsyncStorage.getItem('role');
      if (token !== userToken || role !== userRole) {
        setUserToken(token);
        setUserRole(role);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userToken, userRole]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {userToken ? (
        userRole === 'owner' ? <OwnerNavigator /> : <RenterNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
})

export default AppNavigator;
