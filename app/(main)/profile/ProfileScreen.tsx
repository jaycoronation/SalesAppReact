import { userProfileAPI } from '@/network/authService';
import { Colors } from '@/utils/colors';
import { SessionManager } from '@/utils/sessionManager';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import NotificationBell from '@/components/NotificationBell';

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  contact_no: string;
  profile_pic: string;
  country_code: string;
  country_id?: string;
  state_id?: string;
  city_id?: string;
  pincode?: string;
  address_line1?: string;
  address_line2?: string;
  is_active?: string;
}


// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      const userData = await SessionManager.getUserData();
      if (userData.user_id) {
        const response = await userProfileAPI(userData.user_id);
        if (response && response.data.success === 1) {
          setProfile(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brandColor} />
      </View>
    );
  }

  const editParams = {
    name: profile?.name,
    email: profile?.email,
    contact_no: profile?.contact_no,
    country_code: profile?.country_code,
    country_id: profile?.country_id,
    state_id: profile?.state_id,
    city_id: profile?.city_id,
    pincode: profile?.pincode,
    address_line1: profile?.address_line1,
    address_line2: profile?.address_line2,
    profile_pic: profile?.profile_pic,
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandColor} />
        }
      >
        {/* ── Header Gradient ────────────────────────────────────────────────── */}
        <LinearGradient
          colors={[Colors.brandColor, '#b80d1a']}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>My Profile</Text>

            {/* Right side: notification bell + edit */}
            <View style={styles.headerRight}>
              <NotificationBell color="#FFF" />
              <TouchableOpacity
                style={styles.editBtnTop}
                onPress={() => router.push({ pathname: '../../profile/EditProfileScreen', params: editParams })}
              >
                <Ionicons name="create-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.profileInfoMain}>
            <View style={styles.avatarContainer}>
              {profile?.profile_pic ? (
                <Image source={{ uri: profile.profile_pic }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {profile?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.cameraBtn}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{profile?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{profile?.email || 'email@example.com'}</Text>
          </View>
        </LinearGradient>

        {/* ── Profile Details ────────────────────────────────────────────────── */}
        <View style={styles.detailsContainer}>
          <DetailItem
            icon="call-outline"
            label="Mobile Number"
            value={`${profile?.country_code || '+91'} ${profile?.contact_no || ''}`}
          />
          <DetailItem
            icon="mail-outline"
            label="Email Address"
            value={profile?.email || ''}
          />
          <DetailItem
            icon="location-outline"
            label="Location"
            value="Gujarat, India"
          />

          <TouchableOpacity
            style={styles.editActionButton}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '../../profile/EditProfileScreen', params: editParams })}
          >
            <LinearGradient
              colors={[Colors.brandColor, '#c10e1a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <Ionicons name="create-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.editActionText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Settings Section ──────────────────────────────────────────────── */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          {/* ← Notifications now navigates to NotificationScreen */}
          <SettingItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push('/notification/NotificationScreen')}
          />
          <SettingItem icon="shield-checkmark-outline" label="Security" />
          <SettingItem icon="help-circle-outline" label="Help & Support" />

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              await SessionManager.clearSession();
              router.replace('/login');
            }}
          >
            <Ionicons name="log-out-outline" size={22} color={Colors.error} style={{ marginRight: 12 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={22} color={Colors.brandColor} />
      </View>
      <View style={styles.detailInfo}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function SettingItem({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.settingItem} activeOpacity={0.6} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={22} color="#4B5563" />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 8,
    shadowColor: Colors.brandColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },


  editBtnTop: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },

  profileInfoMain: { alignItems: 'center' },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  avatar: { width: 102, height: 102, borderRadius: 51 },
  avatarPlaceholder: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 40, fontWeight: '700', color: Colors.brandColor },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#374151',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  userName: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },

  // Details card
  detailsContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: -25,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.brandColorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailInfo: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#1F2937' },

  editActionButton: { marginTop: 10, borderRadius: 12, overflow: 'hidden' },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  editActionText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Settings
  settingsSection: { marginTop: 25, paddingHorizontal: 20, marginBottom: 35 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 15,
    paddingLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  settingLabel: { fontSize: 15, color: '#4B5563', fontWeight: '500', marginLeft: 12 },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: { fontSize: 15, color: Colors.error, fontWeight: '700' },
});