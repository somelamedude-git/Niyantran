import React, { useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Button,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';

import { NativeModules } from 'react-native';
const { CameraModule } = NativeModules;

const App = () => {

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return;

    try {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);

      console.log("Permissions:", results);

      if (
        results[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] !== PermissionsAndroid.RESULTS.GRANTED ||
        results[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED ||
        results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED
      ) {
        Alert.alert(
          "Permissions needed",
          "Please enable notifications, camera, and microphone permissions"
        );
      }
    } catch (e) {
      console.log(e);
    }
  };

  const startService = () => {
    if (CameraModule?.startForegroundService) {
      CameraModule.startForegroundService();
    } else {
      Alert.alert("Error", "Foreground service not available");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View>
        <Text>Foreground Video Recorder</Text>

        <Button
          title="Start Video Notifications"
          onPress={startService}
        />
      </View>
    </SafeAreaView>
  );
};

export default App;