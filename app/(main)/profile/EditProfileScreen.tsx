import { fetchCitiesAPI, fetchCountriesAPI, fetchStatesAPI, updateProfileAPI } from '@/network/authService';
import { AppUtils } from '@/utils/AppUtils';
import { Colors } from '@/utils/colors';
import { SessionManager } from '@/utils/sessionManager';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface LocationItem {
  id: string | number;
  name: string;
}

export default function EditProfileScreen() {
  const params = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: (params.name as string) || '',
    email: (params.email as string) || '',
    country_code: (params.country_code as string) || '91',
    contact_no: (params.contact_no as string) || '',
    address_line1: (params.address_line1 as string) || '',
    address_line2: (params.address_line2 as string) || '',
    pincode: (params.pincode as string) || '',
    country_id: (params.country_id as string) || '',
    state_id: (params.state_id as string) || '',
    city_id: (params.city_id as string) || '',
  });

  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'country' | 'state' | 'city' | null>(null);
  const [pickerData, setPickerData] = useState<LocationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>((params.profile_pic as string) || null);

  useEffect(() => {
    loadCountries();
    if (params.country_id) {
      loadStates(params.country_id as string);
    }
    if (params.state_id) {
      loadCities(params.state_id as string);
    }
  }, []);

  const pickImage = async () => {
    try {
      // No permissions request needed for launchImageLibraryAsync on most modern OS
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfilePic(result.assets[0].uri);
      }
    } catch (error) {
      console.error('ImagePicker Error:', error);
    }
  };

  const loadCountries = async () => {
    const res = await fetchCountriesAPI();
    if (res.success && res.data.success === 1) {
      setCountries(res.data.data);
    }
  };

  const loadStates = async (countryId: string) => {
    const res = await fetchStatesAPI(countryId);
    if (res.success && res.data.success === 1) {
      setStates(res.data.data);
    }
  };

  const loadCities = async (stateId: string) => {
    const res = await fetchCitiesAPI(stateId);
    if (res.success && res.data.success === 1) {
      setCities(res.data.data);
    }
  };

  const resolveId = (item: any) => {
    if (!item) return '';
    const keys = Object.keys(item);
    // Prefer specific _id keys first
    const idKey = keys.find(k => k.toLowerCase().endsWith('_id')) || 'id';
    return String(item[idKey] || item.id || '');
  };

  const resolveName = (item: any) => {
    if (!item) return '';
    const keys = Object.keys(item);
    // Prefer specific _name keys first
    const nameKey = keys.find(k => k.toLowerCase().endsWith('_name')) || 'name';
    return String(item[nameKey] || item.name || '');
  };

  const handleSelect = (item: any) => {
    const itemId = resolveId(item);
    const itemName = resolveName(item);
    console.log('Selected:', { type: pickerType, id: itemId, name: itemName });

    if (pickerType === 'country') {
      setForm({ ...form, country_id: itemId, state_id: '', city_id: '' });
      setStates([]);
      setCities([]);
      loadStates(itemId);
    } else if (pickerType === 'state') {
      setForm({ ...form, state_id: itemId, city_id: '' });
      setCities([]);
      loadCities(itemId);
    } else if (pickerType === 'city') {
      setForm({ ...form, city_id: itemId });
    }
    setPickerVisible(false);
  };

  const openPicker = (type: 'country' | 'state' | 'city') => {
    setPickerType(type);
    setSearchQuery('');
    if (type === 'country') setPickerData(countries);
    else if (type === 'state') setPickerData(states);
    else if (type === 'city') setPickerData(cities);
    setPickerVisible(true);
  };

  const filteredData = pickerData.filter(item =>
    resolveName(item).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.name || !form.email || !form.contact_no) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const userData = await SessionManager.getUserData();
      const formData = new FormData();
      formData.append('user_id', userData.user_id || '');
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('country_code', form.country_code);
      formData.append('contact_no', form.contact_no);
      formData.append('address_line1', form.address_line1);
      formData.append('address_line2', form.address_line2);
      formData.append('pincode', form.pincode);
      formData.append('country_id', form.country_id);
      formData.append('state_id', form.state_id);
      formData.append('city_id', form.city_id);
      formData.append('is_active', '1');

      if (profilePic && !profilePic.startsWith('http')) {
        const uriParts = profilePic.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('profile_pic', {
          uri: profilePic,
          name: `profile.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      const res = await updateProfileAPI(formData);

      console.log('Update profile response:', res);
      console.log('Update profile response:', res.data.message);
      if (res.success && res.data.success === 1) {
        AppUtils.showToast(res.data.message);
        router.back();
      } else {
        AppUtils.showToast(res.data.message);
      }
    } catch (error) {
      console.error('Update profile error:', error);
      AppUtils.showToast('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedName = (type: 'country' | 'state' | 'city') => {
    const id = type === 'country' ? form.country_id : type === 'state' ? form.state_id : form.city_id;
    const list = type === 'country' ? countries : type === 'state' ? states : cities;
    const selected = list.find(it => resolveId(it) === id);
    return selected ? resolveName(selected) : `Select ${type}`;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Edit Profile', headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.form}>
            {/* Profile Picture Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarContainer} activeOpacity={0.7} onPress={pickImage}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera" size={40} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Ionicons name="pencil" size={14} color="#FFF" />
                </View>
              </TouchableOpacity>
              <Text style={styles.avatarHint}>Tap to change profile picture</Text>
            </View>

            <InputLabel label="Full Name *" />
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
              placeholder="Enter your name"
            />

            <InputLabel label="Email Address *" />
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(t) => setForm({ ...form, email: t })}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <InputLabel label="Code" />
                <TextInput
                  style={styles.input}
                  value={form.country_code}
                  onChangeText={(t) => setForm({ ...form, country_code: t })}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={{ flex: 3 }}>
                <InputLabel label="Contact Number *" />
                <TextInput
                  style={styles.input}
                  value={form.contact_no}
                  onChangeText={(t) => setForm({ ...form, contact_no: t })}
                  keyboardType="phone-pad"
                  placeholder="Enter contact number"
                />
              </View>
            </View>

            <InputLabel label="Address Line 1" />
            <TextInput
              style={styles.input}
              value={form.address_line1}
              onChangeText={(t) => setForm({ ...form, address_line1: t })}
              placeholder="Street address, P.O. box"
            />

            <InputLabel label="Address Line 2" />
            <TextInput
              style={styles.input}
              value={form.address_line2}
              onChangeText={(t) => setForm({ ...form, address_line2: t })}
              placeholder="Apartment, suite, unit, etc."
            />

            <InputLabel label="Pincode" />
            <TextInput
              style={styles.input}
              value={form.pincode}
              onChangeText={(t) => setForm({ ...form, pincode: t })}
              placeholder="Enter pincode"
              keyboardType="number-pad"
            />

            <InputLabel label="Country" />
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPicker('country')}>
              <Text style={[styles.pickerValue, !form.country_id && { color: '#9CA3AF' }]}>
                {getSelectedName('country')}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6B7280" />
            </TouchableOpacity>

            <InputLabel label="State" />
            <TouchableOpacity
              style={[styles.pickerTrigger, !form.country_id && styles.disabledPicker]}
              onPress={() => form.country_id && openPicker('state')}
              disabled={!form.country_id}
            >
              <Text style={[styles.pickerValue, !form.state_id && { color: '#9CA3AF' }]}>
                {getSelectedName('state')}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6B7280" />
            </TouchableOpacity>

            <InputLabel label="City" />
            <TouchableOpacity
              style={[styles.pickerTrigger, !form.state_id && styles.disabledPicker]}
              onPress={() => form.state_id && openPicker('city')}
              disabled={!form.state_id}
            >
              <Text style={[styles.pickerValue, !form.city_id && { color: '#9CA3AF' }]}>
                {getSelectedName('city')}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {pickerType}</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${pickerType}...`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredData}
              keyExtractor={(item, index) => `${resolveId(item) || index}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleSelect(item)}>
                  <Text style={styles.modalItemText}>{resolveName(item)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InputLabel({ label }: { label: string }) {
  return <Text style={styles.label}>{label}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scroll: { padding: 20 },
  form: { paddingBottom: 30 },

  // Avatar Section
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarHint: { fontSize: 13, color: '#6B7280', marginTop: 10 },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: Colors.brandColor,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  row: { flexDirection: 'row' },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
  },
  pickerValue: { fontSize: 15, color: '#111827' },
  disabledPicker: { opacity: 0.5 },
  saveBtn: {
    backgroundColor: Colors.brandColor,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: Colors.brandColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '70%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#111827',
  },

  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemText: { fontSize: 16, color: '#374151' },
});
