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
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';

import { NativeModules } from 'react-native';
import { AppBlocker } from './AppBlocker';
import { Community } from './Community';

const { CameraModule, AppBlockerModule } = NativeModules;

const App = () => {
  const [logs, setLogs] = useState<{ id: number; text: string; type: 'info' | 'error' | 'success' }[]>([]);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'appBlocker' | 'community'>('dashboard');
  const [showLogs, setShowLogs] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const API_BASE_URL = 'http://127.0.0.1:8000';

  const addLog = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), text, type }]);
  };

  // On startup, check if we have a saved token
  useEffect(() => {
    const restoreSession = async () => {
      if (AppBlockerModule?.getAuthToken) {
        try {
          const savedToken = await AppBlockerModule.getAuthToken();
            if (savedToken) {
            setAuthToken(savedToken);
            setIsAuthenticated(true);
            // Service will start after permissions are granted in useEffect
            // Re-seed the blocked apps from backend to refresh the native list
            try {
              const resp = await fetch('http://127.0.0.1:8000/blocked_apps', {
                headers: { 'Authorization': `Bearer ${savedToken}` }
              });
              const data = await resp.json();
              if (resp.ok && data.packages && AppBlockerModule?.updateBlockedApps) {
                AppBlockerModule.updateBlockedApps(data.packages);
              }
            } catch (_) {}
          }
        } catch (e) {
          // No saved token, show login
        }
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated && authToken) {
      addLog('Application Started', 'success');
      requestPermissions(authToken);

      const subscription = DeviceEventEmitter.addListener('UploadLog', (event) => {
        if (event && event.text && event.type) {
          addLog(event.text, event.type);
        }
      });

      const warningSub = DeviceEventEmitter.addListener('ShowAppWarning', (pkg) => {
        Alert.alert("Usage Warning", `You have been using ${pkg} for 15 minutes! Consider taking a break.`);
      });

      // Fetch blocked apps to initialize the native service
      const fetchBlockedApps = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/blocked_apps`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          const data = await response.json();
          if (response.ok && data.packages && AppBlockerModule?.updateBlockedApps) {
            AppBlockerModule.updateBlockedApps(data.packages);
            addLog(`Loaded ${data.packages.length} blocked apps`, 'info');
          }
        } catch (e) {
          addLog('Failed to fetch blocked apps', 'error');
        }
      };
      fetchBlockedApps();

      return () => {
        subscription.remove();
        warningSub.remove();
      };
    }
  }, [isAuthenticated, authToken]);
  const requestPermissions = async (token: string) => {
    if (Platform.OS !== 'android') {
      addLog('Permissions request skipped (not Android)', 'info');
      return;
    }

    try {
      addLog('Requesting permissions...', 'info');
      
      const permissionsToRequest = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ];
      
      if (Platform.Version >= 33) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      const notifResult = Platform.Version >= 33 ? results[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] : PermissionsAndroid.RESULTS.GRANTED;
      const camResult = results[PermissionsAndroid.PERMISSIONS.CAMERA];
      const micResult = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];

      addLog(`Perms: Notif=${notifResult}, Cam=${camResult}, Mic=${micResult}`, 'info');

      const notif = notifResult === PermissionsAndroid.RESULTS.GRANTED;
      const cam = camResult === PermissionsAndroid.RESULTS.GRANTED;
      const mic = micResult === PermissionsAndroid.RESULTS.GRANTED;

      if (notif && cam && mic) {
        addLog('All permissions granted successfully', 'success');
        // Start background service permanently only after permissions are granted
        if (CameraModule?.startForegroundService) {
          CameraModule.startForegroundService(token);
          addLog('Background Monitoring Service Started', 'success');
        }
      } else {
        addLog('Some permissions were denied', 'error');
        Alert.alert("Permissions needed", "Please enable notifications, camera, and microphone permissions");
      }
    } catch (e) {
      addLog(`Permission error: ${e}`, 'error');
    }


    if (AppBlockerModule?.checkAccessibilityPermission) {
      const accessGranted = await AppBlockerModule.checkAccessibilityPermission();
      if (!accessGranted) {
        addLog('Accessibility Service required for App Blocker', 'info');
        Alert.alert(
          "Accessibility Service Required", 
          "Please enable the Accessibility Service for Niyantran so we can detect distracting apps and block them.",
          [{ text: "OK", onPress: () => AppBlockerModule.requestAccessibilityPermission() }]
        );
      }
    }

    if (AppBlockerModule?.checkUsagePermission) {
      const usageGranted = await AppBlockerModule.checkUsagePermission();
      if (!usageGranted) {
        addLog('Usage Access required for Screen Time tracking', 'info');
        Alert.alert(
          "Usage Access Required", 
          "Please enable Usage Access for Niyantran to track your screen time and compete in leaderboards.",
          [{ text: "OK", onPress: () => AppBlockerModule.requestUsagePermission() }]
        );
      }
    }
  };
  const toggleGrayscale = async () => {
    try {
      if (CameraModule?.enableGrayscale) {
        await CameraModule.enableGrayscale(!isGrayscale);
        setIsGrayscale(!isGrayscale);
        addLog(`Grayscale mode ${!isGrayscale ? 'enabled' : 'disabled'}`, 'success');
      } else {
        addLog('CameraModule.enableGrayscale is undefined', 'error');
      }
    } catch (e: any) {
      addLog(`Grayscale error: ${e.message}`, 'error');
      Alert.alert("Permission Required", e.message || "Failed to toggle grayscale.");
    }
  };

  const handleAuth = async () => {
    setAuthError('');
    
    if (!email || !password) {
      setAuthError('Please fill in all fields.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (authMode === 'register') {
        if (!name) {
          setAuthError('Please enter your name.');
          setIsLoading(false);
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/users/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Registration failed");
        }
        
        Alert.alert("Success", "Account created successfully! Please login.");
        setAuthMode('login'); // Switch to login after successful registration
        setPassword(''); // Clear password for security
      } else {
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.Error || data.error || "Login failed");
        }
        
        // Login successful
        setAuthToken(data.access_token);
        setIsAuthenticated(true);
        // Persist token so app remembers after close
        if (AppBlockerModule?.saveAuthToken) {
          AppBlockerModule.saveAuthToken(data.access_token);
        }
        // Service will start after permissions are granted in useEffect
      }
    } catch (error: any) {
      setAuthError(error.message || "Could not connect to server. Ensure backend is running and ADB reverse is active.");
    } finally {
      setIsLoading(false);
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return '#EF4444'; // Red
      case 'success': return '#10B981'; // Green
      default: return '#94A3B8'; // Grayish blue
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center' }}>
          
          <View style={styles.authContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>NIYANTRAN</Text>
              <View style={styles.glowLine} />
            </View>

            <View style={styles.authCard}>
              <Text style={styles.authTitle}>
                {authMode === 'login' ? 'Secure Login' : 'Create Account'}
              </Text>

              {authError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              ) : null}
              
              {authMode === 'register' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>FULL NAME</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Enter your name"
                    placeholderTextColor="#475569"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter your email"
                  placeholderTextColor="#475569"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter your password"
                  placeholderTextColor="#475569"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity 
                style={[styles.authSubmitBtn, isLoading && styles.authSubmitBtnDisabled]} 
                onPress={handleAuth} 
                activeOpacity={0.8}
                disabled={isLoading}
              >
                <Text style={styles.authSubmitText}>
                  {isLoading 
                    ? 'PROCESSING...' 
                    : (authMode === 'login' ? 'ACCESS SYSTEM' : 'REGISTER')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.authSwitchBtn} 
                onPress={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError('');
                  setPassword('');
                }}
                disabled={isLoading}
              >
                <Text style={styles.authSwitchText}>
                  {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'appBlocker') {
    return (
      <AppBlocker 
        onBack={() => setCurrentScreen('dashboard')} 
        authToken={authToken} 
        API_BASE_URL={API_BASE_URL} 
      />
    );
  }

  if (currentScreen === 'community') {
    return (
      <Community 
        onBack={() => setCurrentScreen('dashboard')} 
        authToken={authToken} 
        API_BASE_URL={API_BASE_URL} 
      />
    );
  }

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
          <Text style={styles.statusLabel}>Background Monitoring</Text>
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.statusText, { color: '#10B981' }]}>
              ACTIVE
            </Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 30, gap: 16 }}>
        <TouchableOpacity 
          style={[styles.actionButton, isGrayscale ? styles.actionButtonActive : null]} 
          onPress={toggleGrayscale}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionButtonText, isGrayscale && { color: '#FFFFFF' }]}>
            {isGrayscale ? 'DISABLE GRAYSCALE' : 'ENABLE GRAYSCALE'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => setCurrentScreen('appBlocker')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>CONFIGURE APP BLOCKER</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => setCurrentScreen('community')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>COMMUNITY HUB</Text>
        </TouchableOpacity>
      </View>

      {/* Logs Toggle */}
      <TouchableOpacity 
        style={styles.logToggleBtn} 
        onPress={() => setShowLogs(!showLogs)}
        activeOpacity={0.8}
      >
        <Text style={styles.logToggleText}>
          {showLogs ? 'Hide System Logs' : 'View System Logs'}
        </Text>
      </TouchableOpacity>

      {showLogs && (
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
      )}
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
  
  // Auth Styles
  authContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  authCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  authTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    letterSpacing: 1,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  authSubmitBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  authSubmitText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  authSubmitBtnDisabled: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  authSwitchBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  authSwitchText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
  },

  // Main App Styles
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
  actionButton: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  actionButtonText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 2,
  },
  logToggleBtn: {
    alignSelf: 'center',
    padding: 10,
    marginBottom: 10,
  },
  logToggleText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
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