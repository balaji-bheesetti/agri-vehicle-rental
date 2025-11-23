import { useState } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';

const VoiceAssistant = ({ instructions }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handlePress = async () => {
    const speaking = await Speech.isSpeakingAsync();
    if (speaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      Speech.speak(instructions, {
        language: 'en-US',
        // language: 'te-IN',
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
      setIsSpeaking(true);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.8}>
        <Ionicons
          name={isSpeaking ? "stop-circle-outline" : "volume-medium"}
          size={32}
          color="white"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,  
    zIndex: 1000,
  },
  button: {
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
  },
});

export default VoiceAssistant;
