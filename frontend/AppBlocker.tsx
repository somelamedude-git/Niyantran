import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  NativeModules,
} from 'react-native';

const { AppBlockerModule } = NativeModules;

interface AppBlockerProps {
  onBack: () => void;
  authToken: string;
  API_BASE_URL: string;
}

interface AppInfo {
  packageName: string;
  name: string;
}

export const AppBlocker: React.FC<AppBlockerProps> = ({ onBack, authToken, API_BASE_URL }) => {
  const [installedApps, setInstalledApps] = useState<AppInfo[]>([]);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      setIsLoading(true);
      // Fetch installed apps from Native Module
      const apps = await AppBlockerModule.getInstalledApps();
      apps.sort((a: AppInfo, b: AppInfo) => a.name.localeCompare(b.name));
      setInstalledApps(apps);

      // Fetch previously blocked apps from backend
      const response = await fetch(`${API_BASE_URL}/blocked_apps`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (response.ok && data.packages) {
        setSelectedApps(new Set(data.packages));
        AppBlockerModule.updateBlockedApps(data.packages);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not fetch apps");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleApp = (packageName: string) => {
    const newSelected = new Set(selectedApps);
    if (newSelected.has(packageName)) {
      newSelected.delete(packageName);
    } else {
      newSelected.add(packageName);
    }
    setSelectedApps(newSelected);
  };

  const saveBlockedApps = async () => {
    if (!password) {
      Alert.alert("Error", "Please enter your password to confirm");
      return;
    }

    try {
      const packageArray = Array.from(selectedApps);
      const response = await fetch(`${API_BASE_URL}/blocked_apps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          password: password,
          packages: packageArray
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save");
      }

      // Update Native module
      AppBlockerModule.updateBlockedApps(packageArray);
      Alert.alert("Success", "Blocked apps updated successfully!");
      setShowPasswordInput(false);
      setPassword('');
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const filteredApps = installedApps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>APP BLOCKER</Text>
      </View>

      <Text style={styles.subtitle}>Select apps to restrict their usage</Text>

      <View style={styles.searchContainer}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Search apps..."
          placeholderTextColor="#475569"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading apps...</Text>
      ) : (
        <ScrollView style={styles.appList} contentContainerStyle={{ paddingBottom: 20 }}>
          {filteredApps.map((app) => {
            const isBlocked = selectedApps.has(app.packageName);
            return (
              <TouchableOpacity 
                key={app.packageName} 
                style={styles.appItem}
                onPress={() => toggleApp(app.packageName)}
                activeOpacity={0.8}
              >
                <Text style={[styles.appName, isBlocked && styles.appNameBlocked]}>{app.name}</Text>
                <View style={[styles.toggleTrack, isBlocked ? styles.toggleTrackActive : styles.toggleTrackInactive]}>
                  <View style={[styles.toggleThumb, isBlocked ? styles.toggleThumbActive : styles.toggleThumbInactive]} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.footer}>
        {showPasswordInput ? (
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor="#475569"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
            />
            <TouchableOpacity style={styles.confirmButton} onPress={saveBlockedApps}>
              <Text style={styles.confirmText}>CONFIRM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowPasswordInput(false); setPassword(''); }}>
              <Text style={styles.cancelText}>X</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={() => setShowPasswordInput(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.saveText}>APPLY CHANGES</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    marginRight: 15,
  },
  backText: {
    color: '#3B82F6',
    fontWeight: '800',
    fontSize: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#94A3B8',
    marginBottom: 20,
    fontSize: 14,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  loadingText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 40,
  },
  appList: {
    flex: 1,
  },
  appItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  appName: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '500',
  },
  appNameBlocked: {
    color: '#EF4444',
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleTrackActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  toggleThumbInactive: {
    backgroundColor: '#94A3B8',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    backgroundColor: '#EF4444',
    alignSelf: 'flex-end',
  },
  footer: {
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: '#0B0F19',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginRight: 10,
  },
  confirmText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelText: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  saveText: {
    color: '#EF4444',
    fontWeight: '800',
    letterSpacing: 2,
  },
});
