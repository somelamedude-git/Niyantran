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
    requestNotificationPermission();
  }, []);

  const requestNotificationPermission = async () => {
    if (Platform.OS !== 'android') return;

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      console.log("Notification permission:", result);

      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert("Permission needed", "Enable notifications manually");
      }
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View>
        <Text>Test Notification</Text>
        <Button
          title="Trigger Camera Notification"
          onPress={() => CameraModule.triggerNotification()}
        />
      </View>
    </SafeAreaView>
  );
};

export default App;