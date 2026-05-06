import { ApiEndPoints } from '@/network/ApiEndPoint'
import { Colors } from '@/utils/colors'
import { SessionManager } from '@/utils/sessionManager'
import { Ionicons } from '@expo/vector-icons'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

// ─── Types ────────────────────────────────────────────────────────────────────

type PartyType = 'customer' | 'vendor' | 'both'

interface FormState {
  party_name: string
  gstin_uin: string
  party_type: PartyType
  address: string
  email: string
  phone: string
  pan_no: string
  is_active: '1' | '0'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTY_TYPE_OPTIONS: { label: string; value: PartyType }[] = [
  { label: 'Customer', value: 'customer' },
  { label: 'Vendor', value: 'vendor' },
  { label: 'Both', value: 'both' },
]


// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {required && <Text style={s.required}> *</Text>}
      </Text>
      {children}
      {!!error && <Text style={s.errorMsg}>{error}</Text>}
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PartyUpdateScreen() {
  const {
    partyId,
    partyName,
    gstinUin,
    partyType,
    address,
    email,
    phone,
    panNo,
    isActive,
  } = useLocalSearchParams<{
    partyId: string
    partyName: string
    gstinUin: string
    partyType: string
    address: string
    email: string
    phone: string
    panNo: string
    isActive: string
  }>()

  const [form, setForm] = useState<FormState>({
    party_name: partyName ?? '',
    gstin_uin: gstinUin ?? '',
    party_type: (partyType as PartyType) ?? 'customer',
    address: address ?? '',
    email: email ?? '',
    phone: phone ?? '',
    pan_no: panNo ?? '',
    is_active: (isActive === '0' ? '0' : '1') as '1' | '0',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)

  // Patch a single field
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {}

    if (!form.party_name.trim()) {
      newErrors.party_name = 'Party name is required'
    }
    if (form.gstin_uin && !/^[A-Z0-9]{1,15}$/i.test(form.gstin_uin)) {
      newErrors.gstin_uin = 'Enter a valid GSTIN/UIN'
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address'
    }
    if (form.phone && !/^\+?[\d\s\-]{7,15}$/.test(form.phone)) {
      newErrors.phone = 'Enter a valid phone number'
    }
    if (form.pan_no && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.pan_no)) {
      newErrors.pan_no = 'PAN must be in format: AAAAA0000A'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ── API call ────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return

    setSaving(true)
    try {
      const token = await SessionManager.getToken()
      const body = new URLSearchParams({
        party_id: partyId ?? '',
        party_name: form.party_name.trim(),
        gstin_uin: form.gstin_uin.trim(),
        party_type: form.party_type,
        address: form.address.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        pan_no: form.pan_no.trim(),
        is_active: form.is_active,
      })

      console.log('Token:', token)
      console.log('Body:', body.toString())

      const response = await fetch(`${ApiEndPoints.BASE_URL}party/save`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })

      // response.json() can silently hang in RN if body is empty or non-JSON
      // Use text() + JSON.parse() instead — always reliable
      const rawText = await response.text()
      console.log('Raw response:', rawText)

      let json: any = {}
      try {
        json = rawText ? JSON.parse(rawText) : {}
      } catch {
        // Server sent a non-JSON body (HTML error page, empty, etc.)
        if (!response.ok) throw new Error(`Server error (${response.status})`)
      }

      if (!response.ok || json?.success === false) {
        throw new Error(json?.message ?? 'Failed to update party')
      }

      Alert.alert('Success', 'Party updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: 'Edit Party',
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: Colors.brandColor,
          animation: 'none',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, marginRight: 8 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
            </TouchableOpacity>
          ),
          // headerRight: () => (
          //   <TouchableOpacity
          //     style={s.headerSaveBtn}
          //     onPress={handleSave}
          //     disabled={saving}
          //   >
          //     {saving
          //       ? <ActivityIndicator size="small" color="#FFFFFF" />
          //       : <Text style={s.headerSaveBtnText}>Save</Text>}
          //   </TouchableOpacity>
          // ),
        }}
      />

      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Basic Info ─────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Basic Information</Text>

          <Field label="Party Name" required error={errors.party_name}>
            <TextInput
              style={[s.input, !!errors.party_name && s.inputError]}
              value={form.party_name}
              onChangeText={v => set('party_name', v)}
              placeholder="Enter party name"
              placeholderTextColor="#9CA3AF"
              returnKeyType="next"
              editable={false}
            />
          </Field>

          <Field label="GSTIN / UIN" error={errors.gstin_uin}>
            <TextInput
              style={[s.input, !!errors.gstin_uin && s.inputError]}
              value={form.gstin_uin}
              onChangeText={v => set('gstin_uin', v.toUpperCase())}
              placeholder="e.g. 27AAPFU0939F1ZV"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              returnKeyType="next"
              editable={false}
            />
          </Field>

          {/* Party Type segmented control */}
          <Field label="Party Type" required>
            <View style={s.segmentRow}>
              {PARTY_TYPE_OPTIONS.map(opt => {
                const active = form.party_type === opt.value
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.segment, active && s.segmentActive]}
                    // onPress={() => set('party_type', opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.segmentText, active && s.segmentTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </Field>
        </View>

        {/* ── Contact Info ───────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Contact Details</Text>

          <Field label="Phone" error={errors.phone}>
            <TextInput
              style={[s.input, !!errors.phone && s.inputError]}
              value={form.phone}
              onChangeText={v => set('phone', v)}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <TextInput
              style={[s.input, !!errors.email && s.inputError]}
              value={form.email}
              onChangeText={v => set('email', v.toLowerCase())}
              placeholder="e.g. contact@company.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </Field>

          <Field label="Address" error={errors.address}>
            <TextInput
              style={[s.input, s.inputMultiline, !!errors.address && s.inputError]}
              value={form.address}
              onChangeText={v => set('address', v)}
              placeholder="Enter full address"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Field>
        </View>

        {/* ── Tax & Status ───────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Tax & Status</Text>

          <Field label="PAN Number" error={errors.pan_no}>
            <TextInput
              style={[s.input, !!errors.pan_no && s.inputError]}
              value={form.pan_no}
              onChangeText={v => set('pan_no', v.toUpperCase())}
              placeholder="e.g. ABCDE1234F"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              maxLength={10}
              returnKeyType="done"
            />
          </Field>

          {/* Active toggle */}
          <Field label="Status">
            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[s.toggleBtn, form.is_active === '1' && s.toggleActive]}
                onPress={() => set('is_active', '1')}
                activeOpacity={0.7}
              >
                <View style={[s.toggleDot, form.is_active === '1' && s.toggleDotActive]} />
                <Text style={[s.toggleText, form.is_active === '1' && s.toggleTextActive]}>
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, form.is_active === '0' && s.toggleInactive]}
                onPress={() => set('is_active', '0')}
                activeOpacity={0.7}
              >
                <View style={[s.toggleDot, form.is_active === '0' && s.toggleDotInactive]} />
                <Text style={[s.toggleText, form.is_active === '0' && s.toggleTextInactive]}>
                  Inactive
                </Text>
              </TouchableOpacity>
            </View>
          </Field>
        </View>

        {/* ── Save button (bottom) ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <Text style={s.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        <View style={s.footer} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16 },
  footer: { height: 32 },

  // Header save button
  headerSaveBtn: {
    backgroundColor: Colors.brandColor,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  headerSaveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Section
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    gap: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },

  // Field
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  required: { color: '#EF4444' },
  errorMsg: { fontSize: 11, color: '#EF4444', marginTop: 2 },

  // Input
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  inputMultiline: { height: 88, paddingTop: 10 },

  // Segment (party type)
  segmentRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  segmentActive: { backgroundColor: Colors.brandColor },
  segmentText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  segmentTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // Toggle (is_active)
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
  },
  toggleActive: { borderColor: '#059669', backgroundColor: '#F0FDF4' },
  toggleInactive: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  toggleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  toggleDotActive: { backgroundColor: '#059669' },
  toggleDotInactive: { backgroundColor: '#EF4444' },
  toggleText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  toggleTextActive: { color: '#059669', fontWeight: '600' },
  toggleTextInactive: { color: '#EF4444', fontWeight: '600' },

  // Save button
  saveBtn: {
    backgroundColor: Colors.brandColor,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: Colors.brandColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
})
