import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
  StyleSheet,
  ScrollView,
  StatusBar,
  DeviceEventEmitter,
} from 'react-native';

import { NativeModules } from 'react-native';
const { CameraModule } = NativeModules;

const App = () => {
  const [logs, setLogs] = useState<{ id: number; text: string; type: 'info' | 'error' | 'success' }[]>([]);
  const [isServiceRunning, setIsServiceRunning] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const addLog = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), text, type }]);
  };

  useEffect(() => {
    addLog('Application Started', 'success');
    requestPermissions();

    const subscription = DeviceEventEmitter.addListener('UploadLog', (event) => {
      if (event && event.text && event.type) {
        addLog(event.text, event.type);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'android') {
      addLog('Permissions request skipped (not Android)', 'info');
      return;
    }

    try {
      addLog('Requesting permissions...', 'info');
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);

      const notif = results[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.GRANTED;
      const cam = results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
      const mic = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;

      if (notif && cam && mic) {
        addLog('All permissions granted successfully', 'success');
      } else {
        addLog('Some permissions were denied', 'error');
        Alert.alert("Permissions needed", "Please enable notifications, camera, and microphone permissions");
      }
    } catch (e) {
      addLog(`Permission error: ${e}`, 'error');
    }
  };

  const startService = () => {
    addLog('Attempting to start foreground service...', 'info');
    if (CameraModule?.startForegroundService) {
      CameraModule.startForegroundService();
      setIsServiceRunning(true);
      addLog('Foreground service command sent', 'success');
    } else {
      addLog('CameraModule.startForegroundService is undefined', 'error');
      Alert.alert("Error", "Foreground service not available on this module.");
    }
  };

  const stopService = () => {
     addLog('Stopping foreground service...', 'info');
     if (CameraModule?.stopForegroundService) {
       CameraModule.stopForegroundService();
     }
     setIsServiceRunning(false);
     addLog('Service stopped', 'info');
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return '#EF4444'; // Red
      case 'success': return '#10B981'; // Green
      default: return '#94A3B8'; // Grayish blue
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>NIYANTRAN</Text>
        <View style={styles.glowLine} />
      </View>

      {/* Status Card */}
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Stealth Engine:</Text>
          <View style={[styles.statusBadge, { backgroundColor: isServiceRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
            <View style={[styles.statusDot, { backgroundColor: isServiceRunning ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.statusText, { color: isServiceRunning ? '#10B981' : '#EF4444' }]}>
              {isServiceRunning ? 'ACTIVE' : 'OFFLINE'}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isServiceRunning ? styles.buttonDisabled : styles.buttonPrimary]} 
          onPress={startService}
          disabled={isServiceRunning}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>ENGAGE</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, !isServiceRunning ? styles.buttonDisabled : styles.buttonDanger]} 
          onPress={stopService}
          disabled={!isServiceRunning}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>DISENGAGE</Text>
        </TouchableOpacity>
      </View>

      {/* Logs Section */}
      <View style={styles.logHeaderContainer}>
        <Text style={styles.logHeader}>Terminal Output</Text>
        <View style={styles.logHeaderLine} />
      </View>
      
      <View style={styles.logContainer}>
        <ScrollView 
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          style={styles.scrollView}
        >
          {logs.map((log) => (
            <View key={log.id} style={styles.logEntry}>
              <Text style={styles.logTime}>[{new Date(log.id).toLocaleTimeString()}]</Text>
              <Text style={[styles.logText, { color: getLogColor(log.type) }]}>{log.text}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19', // Deep dark blue/black
  },
  header: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  glowLine: {
    width: 60,
    height: 3,
    backgroundColor: '#3B82F6',
    marginTop: 12,
    borderRadius: 2,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 30,
  },
  button: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonPrimary: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3B82F6',
  },
  buttonDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderColor: 'transparent',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 2,
  },
  logHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  logHeader: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  logHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 12,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#050810',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  scrollView: {
    padding: 16,
  },
  logEntry: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  logTime: {
    color: '#334155',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginRight: 12,
  },
  logText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
});

export default App;