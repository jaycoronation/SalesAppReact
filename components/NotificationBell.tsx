import { useNotification } from '@/utils/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Badge } from 'react-native-paper';

export default function NotificationBell({ color = '#374151', size = 24 }: { color?: string; size?: number }) {
  const { unreadCount } = useNotification();

  return (
    <TouchableOpacity
      onPress={() => router.push('/(main)/notification/NotificationScreen')}
      style={styles.container}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View>
        <Ionicons name="notifications-outline" size={size} color={color} />
        {unreadCount > 0 && (
          <Badge
            visible={true}
            size={16}
            style={[styles.badge, { backgroundColor: '#DC2626' }]}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
});
