import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  NativeModules,
  ScrollView,
} from 'react-native';

const { AppBlockerModule } = NativeModules;

interface CommunityProps {
  onBack: () => void;
  authToken: string;
  API_BASE_URL: string;
}

interface LeaderboardUser {
  name: string;
  email: string;
  screentime: number;
}

export const Community: React.FC<CommunityProps> = ({ onBack, authToken, API_BASE_URL }) => {
  const [totalScreenTime, setTotalScreenTime] = useState<number>(0);
  const [appUsageStats, setAppUsageStats] = useState<any[]>([]);
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const usageJson = await AppBlockerModule.getDailyUsage();
      const usageList = JSON.parse(usageJson);
      let totalTime = 0;
      usageList.forEach((app: any) => {
        totalTime += app.totalTimeInForeground;
      });
      setTotalScreenTime(totalTime);
      setAppUsageStats(usageList.slice(0, 5)); // Show top 5 apps
    } catch (e) {
      console.log('Failed to fetch usage stats', e);
    }
  };

  const createRoom = async () => {
    if (!roomName) {
      Alert.alert('Error', 'Please enter a room name');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/room/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ room_name: roomName })
      });
      const data = await response.json();
      if (response.ok && data.room) {
        Alert.alert('Success', `Room created! Code: ${data.room.room_code}`);
        setCurrentRoom(data.room.room_code);
        fetchLeaderboard(data.room.room_code);
      } else {
        throw new Error(data.error || 'Failed to create room');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const joinRoom = async () => {
    if (!roomCode) {
      Alert.alert('Error', 'Please enter a room code');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/room/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ room_code: roomCode })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Joined room successfully!');
        setCurrentRoom(roomCode);
        fetchLeaderboard(roomCode);
      } else {
        throw new Error(data.error || 'Failed to join room');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
      if (e.message.includes('already joined')) {
        setCurrentRoom(roomCode);
        fetchLeaderboard(roomCode);
      }
    }
  };

  const fetchLeaderboard = async (code: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/room/leaderboard/${code}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (response.ok && data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (e) {
      console.log('Failed to fetch leaderboard', e);
    }
  };

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>COMMUNITY</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsLabel}>Your Screen Time Today</Text>
        <Text style={styles.statsTime}>{formatTime(totalScreenTime)}</Text>
        
        {appUsageStats.length > 0 && (
          <View style={styles.appUsageList}>
            <Text style={styles.statsSubtitle}>Top Used Apps</Text>
            {appUsageStats.map((app, idx) => (
              <View key={idx} style={styles.appUsageItem}>
                <Text style={styles.appUsageName} numberOfLines={1}>{app.appName}</Text>
                <Text style={styles.appUsageTime}>{formatTime(app.totalTimeInForeground)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1 }}>
        {!currentRoom ? (
          <View>
            <View style={styles.actionCard}>
              <Text style={styles.cardTitle}>Join a Room</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Room Code"
                placeholderTextColor="#475569"
                value={roomCode}
                onChangeText={setRoomCode}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.primaryButton} onPress={joinRoom}>
                <Text style={styles.buttonText}>JOIN</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionCard}>
              <Text style={styles.cardTitle}>Create a Room</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Room Name"
                placeholderTextColor="#475569"
                value={roomName}
                onChangeText={setRoomName}
              />
              <TouchableOpacity style={styles.secondaryButton} onPress={createRoom}>
                <Text style={styles.buttonTextSecondary}>CREATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.leaderboardCard}>
            <View style={styles.leaderboardHeader}>
              <Text style={styles.cardTitle}>Leaderboard (Code: {currentRoom})</Text>
              <TouchableOpacity onPress={() => setCurrentRoom(null)}>
                <Text style={{color: '#3B82F6'}}>Change Room</Text>
              </TouchableOpacity>
            </View>
            
            {leaderboard.length === 0 ? (
              <Text style={{color: '#94A3B8', marginTop: 10}}>No data available yet.</Text>
            ) : (
              leaderboard.map((user, idx) => (
                <View key={idx} style={styles.userRow}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.rank}>#{idx + 1}</Text>
                    <View>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                  </View>
                  <Text style={styles.userTime}>{user.screentime} pts</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
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
    marginBottom: 20,
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
  statsCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginBottom: 20,
  },
  statsLabel: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  statsTime: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  statsSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 15,
    marginBottom: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  appUsageList: {
    width: '100%',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 130, 246, 0.2)',
  },
  appUsageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  appUsageName: {
    color: '#E2E8F0',
    fontSize: 14,
    flex: 1,
  },
  appUsageTime: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  buttonText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  leaderboardCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rank: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 15,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: '#64748B',
    fontSize: 12,
  },
  userTime: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
